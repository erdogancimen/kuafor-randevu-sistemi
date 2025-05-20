'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Appointment {
  id: string;
  barberId: string;
  barberName: string;
  employeeName: string;
  service: string;
  date: string;
  time: string;
}

export default function ReviewPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Randevu bilgilerini getir
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentDoc = await getDoc(appointmentRef);

        if (!appointmentDoc.exists()) {
          toast.error('Randevu bulunamadı');
          router.push('/appointments');
          return;
        }

        const appointmentData = appointmentDoc.data() as Omit<Appointment, 'id'>;

        // Değerlendirme durumunu kontrol et
        const reviewsRef = collection(db, 'reviews');
        const reviewsQuery = query(
          reviewsRef,
          where('appointmentId', '==', appointmentId)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (!reviewsSnapshot.empty) {
          toast.error('Bu randevu için zaten değerlendirme yapılmış');
          router.push('/appointments');
          return;
        }

        setAppointment({
          ...appointmentData,
          id: appointmentDoc.id
        });
      } catch (error) {
        console.error('Error fetching appointment:', error);
        toast.error('Randevu bilgileri yüklenirken bir hata oluştu');
        router.push('/appointments');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [appointmentId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Lütfen bir puan seçin');
      return;
    }

    try {
      setSubmitting(true);
      const user = auth.currentUser;

      if (!user || !appointment) {
        toast.error('Bir hata oluştu');
        return;
      }

      // Değerlendirmeyi kaydet
      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        barberId: appointment.barberId,
        appointmentId: appointment.id,
        rating,
        comment,
        createdAt: new Date()
      });

      toast.success('Değerlendirmeniz kaydedildi');
      router.push('/appointments');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Değerlendirme kaydedilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Değerlendirme Yap</h1>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h2 className="font-semibold text-white mb-1">{appointment.barberName}</h2>
              <p className="text-gray-400 text-sm mb-1">{appointment.employeeName}</p>
              <p className="text-gray-400 text-sm">{appointment.service}</p>
              <p className="text-gray-400 text-sm mt-2">
                {appointment.date} - {appointment.time}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Puanınız
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-white mb-2"
              >
                Yorumunuz
              </label>
              <textarea
                id="comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Deneyiminizi paylaşın..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/appointments')}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Değerlendirmeyi Gönder'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
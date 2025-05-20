'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Star, Loader2, Calendar, Clock, User, Scissors } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Review {
  id: string;
  userId: string;
  barberId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: any;
  userName: string;
  userPhotoURL: string;
  service: string;
  date: string;
  time: string;
}

interface UserData extends DocumentData {
  name?: string;
  photoURL?: string;
}

interface AppointmentData extends DocumentData {
  service?: string;
  date?: string;
  time?: string;
}

export default function BarberReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Kuaför rolünü kontrol et
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() || userDoc.data().role !== 'barber') {
          toast.error('Bu sayfaya erişim yetkiniz yok');
          router.push('/');
          return;
        }

        // Değerlendirmeleri getir
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('barberId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = await Promise.all(
          reviewsSnapshot.docs.map(async (reviewDoc) => {
            const reviewData = reviewDoc.data();
            
            // Kullanıcı bilgilerini getir
            const userDocRef = doc(db, 'users', reviewData.userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? (userDoc.data() as UserData) : {};
            
            // Randevu bilgilerini getir
            const appointmentDocRef = doc(db, 'appointments', reviewData.appointmentId);
            const appointmentDoc = await getDoc(appointmentDocRef);
            const appointmentData = appointmentDoc.exists() ? (appointmentDoc.data() as AppointmentData) : {};

            // İsim formatla
            const formatName = (name: string) => {
              const parts = name.split(' ');
              const firstName = parts[0];
              const lastName = parts[1] || '';
              
              const formattedFirstName = firstName.slice(0, 2) + '*'.repeat(firstName.length - 2);
              const formattedLastName = lastName ? lastName.slice(0, 2) + '*'.repeat(lastName.length - 2) : '';
              
              return `${formattedFirstName} ${formattedLastName}`.trim();
            };

            return {
              id: reviewDoc.id,
              ...reviewData,
              userName: userData.name ? formatName(userData.name) : 'İsimsiz Kullanıcı',
              userPhotoURL: userData.photoURL || '/images/default-avatar.jpg',
              service: appointmentData.service || '',
              date: appointmentData.date || '',
              time: appointmentData.time || ''
            } as Review;
          })
        );

        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast.error('Değerlendirmeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Değerlendirmeler</h1>
          <p className="text-muted-foreground mt-2">
            Müşterilerinizin yaptığı değerlendirmeleri buradan görüntüleyebilirsiniz.
          </p>
        </div>

        <div className="space-y-6">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border bg-card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full">
                      <Image
                        src={review.userPhotoURL}
                        alt={review.userName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{review.userName}</h3>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-muted-foreground">{review.comment}</p>
                      <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
                        {review.service && (
                          <div className="flex items-center">
                            <Scissors className="h-4 w-4 mr-1" />
                            <span>{review.service}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{review.date}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{review.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(review.createdAt?.toDate()).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Henüz değerlendirme yapılmamış</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
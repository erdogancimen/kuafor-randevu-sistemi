'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import ReviewForm from '@/components/forms/ReviewForm';
import { Star } from 'lucide-react';

interface UserData {
  firstName: string;
  lastName: string;
}

interface AppointmentWithUser extends Appointment {
  userName: string;
}

export default function AppointmentHistory() {
  const [appointments, setAppointments] = useState<AppointmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithUser | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef,
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const appointmentsData = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const appointmentData = docSnapshot.data() as Appointment;
            
            // Kullanıcı bilgilerini getir
            const userRef = doc(db, 'users', appointmentData.userId);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data() as UserData | undefined;

            return {
              ...appointmentData,
              id: docSnapshot.id,
              userName: userData ? `${userData.firstName} ${userData.lastName}` : 'Bilinmeyen Kullanıcı'
            } as AppointmentWithUser;
          })
        );

        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const handleReviewClick = (appointment: AppointmentWithUser) => {
    setSelectedAppointment(appointment);
    setShowReviewForm(true);
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    setSelectedAppointment(null);
    // Sayfayı yenile
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Randevu Geçmişi</h1>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Henüz randevunuz bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-lg border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{appointment.barberName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(appointment.date), 'dd MMMM yyyy', { locale: tr })} - {appointment.time}
                    </p>
                    <p className="text-sm text-muted-foreground">{appointment.serviceName}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                    {appointment.status === 'completed' && (
                      <button
                        onClick={() => handleReviewClick(appointment)}
                        className="text-sm text-primary hover:underline"
                      >
                        Değerlendir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Değerlendirme Modal */}
        {showReviewForm && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Değerlendirme Yap</h2>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <ReviewForm
                appointmentId={selectedAppointment.id}
                userId={selectedAppointment.userId}
                barberId={selectedAppointment.barberId}
                barberName={selectedAppointment.barberName}
                onReviewSubmitted={handleReviewSubmitted}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
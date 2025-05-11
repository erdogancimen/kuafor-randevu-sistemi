'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Calendar, Clock, User, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Appointment {
  id: string;
  barberId: string;
  barberName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Timestamp;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Randevular yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCancel = async (appointmentId: string) => {
    try {
      setCancelling(appointmentId);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'cancelled'
      });

      setAppointments(appointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'cancelled' }
          : appointment
      ));

      toast.success('Randevu iptal edildi');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Randevu iptal edilirken bir hata oluştu');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'Onay Bekliyor';
      case 'confirmed':
        return 'Onaylandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Randevularım</h1>
          <p className="text-gray-400 mt-1">Tüm randevularınızı buradan görüntüleyebilirsiniz</p>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Henüz randevunuz yok</h2>
            <p className="text-gray-400">Randevu oluşturmak için kuaför profillerini inceleyebilirsiniz</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Kuaförleri Keşfet
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-700">
                      <Image
                        src="/images/default-barber.jpg"
                        alt={appointment.barberName}
                        fill
                        sizes="(max-width: 768px) 48px, 48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{appointment.barberName}</h3>
                      <p className="text-sm text-gray-400">{appointment.service}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{appointment.date}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center">
                          <span>{appointment.duration} dk</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="text-lg font-semibold text-white">
                      {appointment.price} TL
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                    {appointment.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        disabled={cancelling === appointment.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === appointment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span>İptal Et</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
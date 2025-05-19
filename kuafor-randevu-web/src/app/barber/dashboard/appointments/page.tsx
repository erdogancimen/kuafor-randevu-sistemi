'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Calendar, Clock, User, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Appointment {
  id: string;
  userId: string;
  userName?: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Timestamp;
}

export default function BarberAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
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
          where('barberId', '==', user.uid),
          where('employeeId', 'in', [user.uid, null]),
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

  const handleStatusUpdate = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    setUpdating(appointmentId);
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: newStatus }
          : appointment
      ));

      toast.success(`Randevu ${newStatus === 'confirmed' ? 'onaylandı' : newStatus === 'cancelled' ? 'iptal edildi' : 'tamamlandı'}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Randevu güncellenirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
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
      case 'confirmed':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Randevular</h1>
          <p className="text-gray-400 mt-1">Tüm randevu isteklerini buradan yönetebilirsiniz</p>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Henüz randevu yok</h2>
            <p className="text-gray-400">Müşteriler randevu oluşturduğunda burada görünecektir</p>
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
                        src="/images/default-user.jpg"
                        alt={appointment.userName || 'Müşteri'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{appointment.userName || 'Müşteri'}</h3>
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
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                          disabled={updating === appointment.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating === appointment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              <span>Onayla</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                          disabled={updating === appointment.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating === appointment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              <span>Reddet</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                        disabled={updating === appointment.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating === appointment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            <span>Tamamlandı</span>
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
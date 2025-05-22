'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Loader2, Check, X, Calendar, Clock, User, Scissors } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmployeeNotificationList from '../components/NotificationList';
import Image from 'next/image';

interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  employeeId: string;
  barberName: string;
  employeeName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  createdAt: Timestamp;
  customerName?: string;
  customerPhone?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

export default function EmployeeAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        toast.error('Lütfen önce giriş yapın');
        router.push('/login');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error('Kullanıcı bilgileri bulunamadı');
        router.push('/login');
        return;
      }

      const userData = userDoc.data() as UserData;
      if (userData?.role !== 'employee') {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        router.push('/');
        return;
      }

      fetchAppointments();
    };

    checkAuth();
  }, [router]);

  const fetchAppointments = async () => {
    if (!auth.currentUser) return;

    try {
      // Randevuları getir
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('employeeId', '==', auth.currentUser.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      // Müşteri bilgilerini getir
      const appointments = await Promise.all(
        appointmentsSnapshot.docs.map(async (appointmentDoc) => {
          const appointmentData = appointmentDoc.data() as Appointment;
          
          // Müşteri bilgilerini getir
          const userRef = doc(db, 'users', appointmentData.userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as UserData;

          return {
            ...appointmentData,
            id: appointmentDoc.id,
            customerName: userData?.firstName + ' ' + userData?.lastName,
            customerPhone: userData?.phone
          };
        })
      );

      // Randevuları tarihe göre sırala
      appointments.sort((a, b) => {
        // createdAt timestamp'lerini karşılaştır
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA; // En yeni randevular en üstte
      });

      setAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Randevular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatus = async (appointmentId: string, status: 'confirmed' | 'rejected' | 'completed') => {
    if (!auth.currentUser) return;

    try {
      setUpdating(appointmentId);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status,
        updatedAt: Timestamp.now()
      });

      // Randevuları güncelle
      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );

      // Bildirim gönder
      if (status === 'completed') {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (appointment) {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: appointment.userId,
              title: 'Randevu Tamamlandı',
              message: `${appointment.service} hizmetiniz tamamlandı. Değerlendirmenizi bekliyoruz.`,
              type: 'appointment_completed'
            }),
          });
        }
      }

      toast.success(`Randevu ${status === 'confirmed' ? 'onaylandı' : status === 'rejected' ? 'reddedildi' : 'tamamlandı'}`);
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
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
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
      case 'rejected':
        return 'Reddedildi';
      case 'completed':
        return 'Tamamlandı';
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Randevularım</h1>
            <p className="text-gray-400 mt-1">Tüm randevu isteklerini buradan yönetebilirsiniz</p>
          </div>
          <EmployeeNotificationList />
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
                        src="/images/default-avatar.jpg"
                        alt={appointment.customerName || 'Müşteri'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{appointment.customerName}</h3>
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
                          onClick={() => handleAppointmentStatus(appointment.id, 'confirmed')}
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
                          onClick={() => handleAppointmentStatus(appointment.id, 'rejected')}
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
                        onClick={() => handleAppointmentStatus(appointment.id, 'completed')}
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
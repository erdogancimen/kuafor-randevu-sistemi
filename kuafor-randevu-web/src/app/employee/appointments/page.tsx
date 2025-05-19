'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Loader2, Check, X, Calendar, Clock, User, Scissors } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmployeeNotificationList from '../components/NotificationList';

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
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA.getTime() - dateB.getTime();
      });

      setAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Randevular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatus = async (appointmentId: string, status: 'confirmed' | 'rejected') => {
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

      toast.success(`Randevu ${status === 'confirmed' ? 'onaylandı' : 'reddedildi'}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Randevu güncellenirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Randevularım</h1>
          <EmployeeNotificationList />
        </div>

        <div className="grid gap-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">Henüz randevu bulunmuyor</p>
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">{appointment.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">{appointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">{appointment.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">{appointment.service}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {appointment.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAppointmentStatus(appointment.id, 'confirmed')}
                          disabled={updating === appointment.id}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating === appointment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span>Onayla</span>
                        </button>
                        <button
                          onClick={() => handleAppointmentStatus(appointment.id, 'rejected')}
                          disabled={updating === appointment.id}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating === appointment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span>Reddet</span>
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        appointment.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status === 'confirmed' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
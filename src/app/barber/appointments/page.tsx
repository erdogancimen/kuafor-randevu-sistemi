'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBarberAppointments, updateAppointmentStatus } from '@/lib/firebase/db';
import { Appointment, AppointmentStatus } from '@/types/firebase';
import { toast } from 'react-hot-toast';

export default function BarberAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadAppointments = async () => {
      if (!user) return;
      try {
        const data = await getBarberAppointments(user.uid);
        setAppointments(data);
      } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        toast.error('Randevular yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [user]);

  const handleStatusUpdate = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      toast.success('Randevu durumu güncellendi');
    } catch (error) {
      console.error('Randevu güncellenirken hata:', error);
      toast.error('Randevu güncellenirken bir hata oluştu');
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Randevu Yönetimi</h1>
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div 
            key={appointment.id} 
            className="border p-4 rounded shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  {appointment.customerName || 'İsimsiz Müşteri'}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.serviceName || 'Belirtilmemiş Hizmet'}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(appointment.date.seconds * 1000).toLocaleString('tr-TR')}
                </p>
                <p className="text-sm text-gray-600">
                  Durum: {appointment.status}
                </p>
              </div>
              <div className="space-x-2">
                {appointment.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(appointment.id, 'CONFIRMED')}
                      className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(appointment.id, 'CANCELLED')}
                      className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                      Reddet
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
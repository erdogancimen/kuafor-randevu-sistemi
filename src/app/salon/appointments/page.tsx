'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBarberAppointments, updateAppointmentStatus } from '@/lib/firebase/db';
import { Appointment } from '@/types/firebase';
import { toast } from 'react-hot-toast';
import SalonLayout from '@/components/layouts/SalonLayout';

export default function SalonAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadAppointments = async () => {
      if (!user) return;
      try {
        const data = await getBarberAppointments(user.id);
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

  return (
    <SalonLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Randevu Yönetimi</h1>

        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment) => (
              <div 
                key={appointment.id} 
                className="bg-white p-6 rounded-lg shadow"
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
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'CANCELLED')}
                          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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
        )}
      </div>
    </SalonLayout>
  );
} 
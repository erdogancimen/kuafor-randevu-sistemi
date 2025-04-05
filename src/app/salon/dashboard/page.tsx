'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSalon, getBarberAppointments } from '@/lib/firebase/db';
import { Salon, Appointment } from '@/types/firebase';
import SalonLayout from '@/components/layouts/SalonLayout';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

export default function Dashboard() {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Önce salon bilgilerini getir
        const salonData = await getSalon(user.uid);
        
        if (!salonData) {
          toast.error('Salon bilgileri bulunamadı');
          setLoading(false);
          return;
        }

        setSalon(salonData);

        // Salon ID'si varsa randevuları getir
        if (salonData.id) {
          try {
            const todayAppointments = await getBarberAppointments(salonData.id);
            setAppointments(todayAppointments);
          } catch (error: any) {
            console.error('Randevular yüklenirken hata:', error);
            toast.error('Randevular yüklenirken bir hata oluştu');
          }
        }
      } catch (error: any) {
        console.error('Dashboard verisi yüklenirken hata:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Timestamp'i Date'e çeviren yardımcı fonksiyon
  const timestampToDate = (timestamp: any) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date(timestamp.seconds * 1000);
  };

  if (loading) {
    return (
      <SalonLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">Yükleniyor...</p>
          </div>
        </div>
      </SalonLayout>
    );
  }

  // Eğer salon verisi yoksa
  if (!salon) {
    return (
      <SalonLayout>
        <div className="text-center py-12">
          <h3 className="text-xl text-gray-600">
            Kuaför bilgileri bulunamadı. Lütfen profilinizi tamamlayın.
          </h3>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* İstatistik Kartları */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Bugünkü Randevular</h3>
          <p className="text-3xl font-bold text-gray-900">
            {appointments.filter(apt => 
              timestampToDate(apt.date).toDateString() === new Date().toDateString()
            ).length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Bekleyen Randevular</h3>
          <p className="text-3xl font-bold text-gray-900">
            {appointments.filter(apt => apt.status === 'PENDING').length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Toplam Çalışan</h3>
          <p className="text-3xl font-bold text-gray-900">
            {salon?.barbers?.length || 0}
          </p>
        </div>
      </div>

      {/* Son Randevular */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Son Randevular
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hizmet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.slice(0, 5).map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.customerName || 'İsimsiz Müşteri'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {timestampToDate(appointment.date).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.serviceName || 'Belirtilmemiş'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SalonLayout>
  );
} 
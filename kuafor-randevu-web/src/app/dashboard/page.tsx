'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, Calendar, Users, Scissors, Clock, TrendingUp, Star, Bell } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalAppointments: number;
  totalCustomers: number;
  totalServices: number;
  averageRating: number;
  recentAppointments: {
    id: string;
    customerName: string;
    service: string;
    date: string;
    time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  }[];
  topServices: {
    name: string;
    count: number;
    revenue: number;
  }[];
  notifications: {
    id: string;
    title: string;
    message: string;
    type: 'appointment' | 'review' | 'system';
    read: boolean;
    createdAt: string;
  }[];
}

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Service {
  name: string;
  price: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          router.push('/');
          return;
        }

        const userData = docSnap.data();
        if (userData.role !== 'barber') {
    router.push('/');
          return;
        }

        // İstatistikleri yükle
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(
          appointmentsRef,
          where('barberId', '==', user.uid)
        );
        const appointmentsSnap = await getDocs(appointmentsQuery);

        const appointments = appointmentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        const stats: DashboardStats = {
          totalAppointments: appointments.length,
          totalCustomers: new Set(appointments.map(a => a.customerId)).size,
          totalServices: userData.services?.length || 0,
          averageRating: userData.rating || 0,
          recentAppointments: appointments
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(appointment => ({
              id: appointment.id,
              customerName: appointment.customerName,
              service: appointment.service,
              date: appointment.date,
              time: appointment.time,
              status: appointment.status
            })),
          topServices: (userData.services as Service[] || []).map(service => ({
            name: service.name,
            count: appointments.filter(a => a.service === service.name).length,
            revenue: appointments
              .filter(a => a.service === service.name)
              .reduce((sum, a) => sum + service.price, 0)
          })),
          notifications: userData.notifications || []
        };

        setStats(stats);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        toast.error('Dashboard yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Dashboard yüklenemedi</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="grid gap-8">
          {/* İstatistikler */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Toplam Randevu</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">{stats.totalAppointments}</p>
              <p className="text-sm text-muted-foreground">
                Bu ay +12 yeni randevu
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Toplam Müşteri</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">{stats.totalCustomers}</p>
              <p className="text-sm text-muted-foreground">
                Bu ay +5 yeni müşteri
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center space-x-2">
                <Scissors className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Toplam Hizmet</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">{stats.totalServices}</p>
              <p className="text-sm text-muted-foreground">
                Aktif hizmetler
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Ortalama Puan</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">
                Son 30 gün
              </p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Son Randevular */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Calendar className="mr-2 h-5 w-5" />
                  Son Randevular
                </h3>
                <button
                  onClick={() => router.push('/appointments')}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Tümünü Gör
                </button>
              </div>

              <div className="space-y-4">
                {stats.recentAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{appointment.customerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {appointment.service}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Date(appointment.date).toLocaleDateString('tr-TR')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.time}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          appointment.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : appointment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {appointment.status === 'confirmed'
                          ? 'Onaylandı'
                          : appointment.status === 'pending'
                          ? 'Beklemede'
                          : appointment.status === 'completed'
                          ? 'Tamamlandı'
                          : 'İptal Edildi'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popüler Hizmetler */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Popüler Hizmetler
                </h3>
                <button
                  onClick={() => router.push('/services')}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Tümünü Gör
                </button>
              </div>

              <div className="space-y-4">
                {stats.topServices
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((service, index) => (
                    <div
                      key={index}
                      className="rounded-lg border bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {service.count} randevu
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{service.revenue} ₺</p>
                          <p className="text-sm text-muted-foreground">
                            Toplam gelir
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Bildirimler */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center text-lg font-semibold">
                <Bell className="mr-2 h-5 w-5" />
                Bildirimler
              </h3>
              <button
                onClick={() => router.push('/notifications')}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Tümünü Gör
              </button>
            </div>

            <div className="space-y-4">
              {stats.notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border bg-background p-4 ${
                      !notification.read ? 'border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                        {!notification.read && (
                          <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
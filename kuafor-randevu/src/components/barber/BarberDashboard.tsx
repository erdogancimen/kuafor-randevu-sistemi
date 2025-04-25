'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Appointment, Review } from '@/types';
import Link from 'next/link';

export default function BarberDashboard() {
  const { currentUser } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Bugünün başlangıç ve bitiş zamanlarını ayarla
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Bugünkü randevuları getir
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('barberId', '==', currentUser?.uid),
          where('date', '>=', today),
          where('date', '<', tomorrow),
          orderBy('date', 'asc')
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setTodayAppointments(appointments);

        // Son yorumları getir
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('barberId', '==', currentUser?.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];

        setRecentReviews(reviews);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Bugünkü Randevular</h2>
          <Link
            href="/appointments"
            className="text-primary-600 hover:text-primary-700"
          >
            Tüm Randevular
          </Link>
        </div>
        {todayAppointments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white p-4 rounded-lg shadow"
              >
                <div className="text-lg font-medium">
                  {appointment.startTime.toLocaleTimeString()} - {appointment.endTime.toLocaleTimeString()}
                </div>
                <div className="text-gray-600 mt-1">
                  Hizmet: {appointment.serviceId}
                </div>
                <div className="mt-2">
                  <span className={`
                    inline-block px-2 py-1 rounded text-sm
                    ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                  `}>
                    {appointment.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Bugün için randevunuz bulunmamaktadır.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Son Değerlendirmeler</h2>
        {recentReviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white p-4 rounded-lg shadow"
              >
                <div className="text-yellow-500">
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </div>
                <p className="mt-2 text-gray-600">{review.comment}</p>
                <div className="mt-2 text-sm text-gray-500">
                  {review.createdAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Henüz değerlendirme yapılmamış.</p>
        )}
      </section>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Appointment, Barber } from '@/types';
import Link from 'next/link';

export default function CustomerDashboard() {
  const { currentUser } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recommendedBarbers, setRecommendedBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Yaklaşan randevuları getir
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', currentUser?.id),
          where('status', 'in', ['pending', 'confirmed']),
          orderBy('date', 'asc'),
          limit(5)
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setUpcomingAppointments(appointments);

        // Önerilen berberleri getir
        const barbersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'barber'),
          orderBy('rating', 'desc'),
          limit(3)
        );

        const barbersSnapshot = await getDocs(barbersQuery);
        const barbers = barbersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Barber[];

        setRecommendedBarbers(barbers);
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
        <h2 className="text-2xl font-semibold mb-4">Yaklaşan Randevularınız</h2>
          {upcomingAppointments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white p-4 rounded-lg shadow"
              >
                <div className="text-lg font-medium">{appointment.date.toLocaleDateString()}</div>
                <div className="text-gray-600">
                  {appointment.startTime.toLocaleTimeString()} - {appointment.endTime.toLocaleTimeString()}
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
          <p className="text-gray-500">Yaklaşan randevunuz bulunmamaktadır.</p>
          )}
        <div className="mt-4">
          <Link
            href="/appointments/new"
            className="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Yeni Randevu Al
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Önerilen Berberler</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendedBarbers.map((barber) => (
            <Link
              key={barber.id}
              href={`/barbers/${barber.id}`}
              className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="font-medium text-lg">{barber.name}</div>
              <div className="text-yellow-500 mt-1">
                {'★'.repeat(Math.round(barber.rating))}
                {'☆'.repeat(5 - Math.round(barber.rating))}
                <span className="text-gray-600 ml-1">({barber.rating.toFixed(1)})</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {barber.services.length} hizmet sunuyor
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
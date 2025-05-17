'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import NotificationList from '@/components/NotificationList';
import { User, MapPin, Star, Clock, Calendar } from 'lucide-react';
import Image from 'next/image';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
  type: 'male' | 'female' | 'mixed';
  services?: { name: string; price: number }[];
  workingHours?: string;
  photoURL?: string;
}

export default function BarberProfile() {
  const params = useParams();
  const router = useRouter();
  const barberId = params?.id as string;
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchBarber = async () => {
      try {
        const barberDoc = await getDoc(doc(db, 'users', barberId));
        if (barberDoc.exists()) {
          setBarber({ id: barberDoc.id, ...barberDoc.data() } as Barber);
        }
      } catch (error) {
        console.error('Error fetching barber:', error);
      } finally {
        setLoading(false);
      }
    };

    if (barberId) {
      fetchBarber();
    }
  }, [barberId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Berber bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{barber?.firstName} {barber?.lastName}</h1>
            <div className="flex items-center space-x-4">
              {user && <NotificationList />}
              {user ? (
                <button
                  onClick={() => router.push('/profil')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Profilim
                </button>
              ) : (
                <button
                  onClick={() => router.push('/giris')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Giriş Yap
                </button>
              )}
            </div>
          </div>

          {/* Berber Profili */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/10">
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end space-x-4">
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white">
                    <Image
                      src={barber.photoURL || '/images/default-barber.jpg'}
                      alt={`${barber.firstName} ${barber.lastName}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {barber.firstName} {barber.lastName}
                    </h1>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{barber.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold">{barber.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hizmetler */}
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Hizmetler</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {barber.services?.map((service, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-primary font-semibold">{service.price} TL</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Çalışma Saatleri */}
            <div className="p-6 border-t">
              <h2 className="text-xl font-semibold mb-4">Çalışma Saatleri</h2>
              <div className="space-y-2">
                {barber.workingHours ? (
                  Object.entries(JSON.parse(barber.workingHours)).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-gray-600">{day}</span>
                      <span className="text-gray-900">
                        {hours.isClosed ? 'Kapalı' : `${hours.start} - ${hours.end}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Çalışma saatleri bilgisi yok</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
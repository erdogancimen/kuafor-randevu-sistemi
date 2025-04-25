'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import { MapPin, Star, Clock, LogOut } from 'lucide-react';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
  imageUrl?: string;
  distance?: number;
}

const DashboardPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [popularBarbers, setPopularBarbers] = useState<Barber[]>([]);
  const [recentBarbers, setRecentBarbers] = useState<Barber[]>([]);
  const [nearbyBarbers, setNearbyBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        // Popüler kuaförleri getir (rating'e göre sırala)
        const popularQuery = query(
          collection(db, 'users'),
          where('role', '==', 'barber'),
          orderBy('rating', 'desc'),
          limit(6)
        );
        const popularSnapshot = await getDocs(popularQuery);
        const popularData = popularSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Barber[];
        
        setPopularBarbers(popularData);
        setRecentBarbers(popularData.slice(0, 3));
        setNearbyBarbers(popularData.slice(3, 6));
      } catch (error) {
        console.error('Error fetching barbers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Arama işlemi için yönlendirme yapılacak
    router.push(`/search?q=${searchQuery}`);
  };

  const BarberCard = ({ barber }: { barber: Barber }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="relative h-48">
        <Image
          src={barber.imageUrl || '/default-barber.jpg'}
          alt={`${barber.firstName} ${barber.lastName}`}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {barber.firstName} {barber.lastName}
        </h3>
        <div className="flex items-center text-sm text-gray-600 mt-1">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{barber.address}</span>
        </div>
        <div className="flex items-center mt-2">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          <span className="text-sm font-medium">{barber.rating.toFixed(1)}</span>
          {barber.distance && (
            <span className="text-sm text-gray-500 ml-2">
              • {barber.distance.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-indigo-600">KUAFÖRÜM</h1>
              <form onSubmit={handleSearch} className="max-w-2xl flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kuaför ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </form>
            </div>

            {/* Auth Buttons or User Info */}
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                >
                  Kayıt Ol
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Popüler Kuaförler */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Popüler Kuaförler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>

        {/* Son Ziyaret Edilenler */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Son Ziyaret Ettikleriniz</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>

        {/* Yakındaki Kuaförler */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Yakındaki Kuaförler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nearbyBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage; 
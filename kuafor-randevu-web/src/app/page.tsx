'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import { MapPin, Star, Clock, LogOut, Search, Map, Filter, Calendar, User } from 'lucide-react';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
  type: 'male' | 'female' | 'mixed';
  distance?: number;
  services?: { name: string; price: number }[];
  workingHours?: string;
  latitude?: number;
  longitude?: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [popularBarbers, setPopularBarbers] = useState<Barber[]>([]);
  const [recentBarbers, setRecentBarbers] = useState<Barber[]>([]);
  const [nearbyBarbers, setNearbyBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Konum izni reddedildi. Yakındaki kuaförleri görmek için lütfen konum izni verin.');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Konum bilgisi alınamadı. Lütfen internet bağlantınızı kontrol edin.');
              break;
            case error.TIMEOUT:
              setLocationError('Konum bilgisi alınırken zaman aşımı oluştu. Lütfen tekrar deneyin.');
              break;
            default:
              setLocationError('Konum bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
    }
  };

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
        // Tüm kuaförleri getir
        const barbersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'barber')
        );
        const barbersSnapshot = await getDocs(barbersQuery);
        const allBarbers = barbersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Barber[];

        // Popüler kuaförleri sırala (rating'e göre)
        const popularBarbers = [...allBarbers]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 6);

        // Son ziyaret edilenler (şimdilik popülerlerden ilk 3'ü)
        const recentBarbers = popularBarbers.slice(0, 3);

        // Yakındaki kuaförler (konum varsa)
        let nearbyBarbers = popularBarbers.slice(3, 6);
        if (location) {
          nearbyBarbers = allBarbers
            .map(barber => ({
              ...barber,
              distance: calculateDistance(
                location.lat,
                location.lng,
                barber.latitude || 0,
                barber.longitude || 0
              )
            }))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            .slice(0, 6);
        }

        setPopularBarbers(popularBarbers);
        setRecentBarbers(recentBarbers);
        setNearbyBarbers(nearbyBarbers);
      } catch (error) {
        console.error('Error fetching barbers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, [location]); // location değiştiğinde yakındaki kuaförleri güncelle

  // İki nokta arasındaki mesafeyi hesapla (km cinsinden)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRad = (value: number) => {
    return value * Math.PI / 180;
  };

  useEffect(() => {
    // Kullanıcı yakındaki kuaförler bölümüne geldiğinde konum izni iste
    const handleScroll = () => {
      const nearbySection = document.getElementById('nearby-barbers');
      if (nearbySection) {
        const rect = nearbySection.getBoundingClientRect();
        if (rect.top < window.innerHeight && !location && !locationError) {
          setShowLocationRequest(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location, locationError]);

  const requestLocationPermission = () => {
    setShowLocationRequest(false);
    getLocation();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Arama işlemi için yönlendirme yapılacak
    router.push(`/search?q=${searchQuery}`);
  };

  const BarberCard = ({ barber }: { barber: Barber }) => {
    const [imageError, setImageError] = useState(false);
    
    const getDefaultImage = (type: string) => {
      switch (type?.toLowerCase()) {
        case 'male':
          return '/images/default-male-barber.jpeg';
        case 'female':
          return '/images/default-female-barber.jpeg';
        case 'mixed':
          return '/images/default-unisex-barber.jpeg';
        default:
          return '/images/default-male-barber.jpeg';
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1">
        <div className="relative h-48">
          <img
            src={getDefaultImage(barber.type)}
            alt={`${barber.firstName} ${barber.lastName}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/images/default-male-barber.jpeg';
            }}
          />
          <div className="absolute top-3 right-3 bg-white/90 px-3 py-1.5 rounded-full text-base font-semibold flex items-center gap-1 shadow-md">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-800">{(barber.rating || 0).toFixed(1)}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {barber.firstName} {barber.lastName}
          </h3>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="truncate">{barber.address}</span>
          </div>
          {barber.distance && (
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Map className="w-4 h-4 mr-1" />
              <span>{barber.distance.toFixed(1)} km uzaklıkta</span>
            </div>
          )}
          {barber.workingHours && (
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Clock className="w-4 h-4 mr-1" />
              <span>{barber.workingHours}</span>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {barber.services?.slice(0, 3).map((service, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{service.name}</span>
                <span className="text-indigo-600 font-medium">{service.price} TL</span>
              </div>
            ))}
            {barber.services && barber.services.length > 3 && (
              <div className="text-sm text-indigo-600">
                +{barber.services.length - 3} hizmet daha
              </div>
            )}
          </div>
          <button
            onClick={() => router.push(`/barber/${barber.id}`)}
            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Randevu Al
          </button>
        </div>
      </div>
    );
  };

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
      <header className="bg-white shadow-sm sticky top-0 z-50">
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                  onClick={() => router.push('/profile')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                >
                  <User className="w-4 h-4" />
                  <span>Profil</span>
                </button>
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

      {/* Hero Section */}
      {!user && (
        <div className="bg-indigo-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">En İyi Kuaförlerle Tanışın</h1>
              <p className="text-xl mb-8">
                Size en yakın ve en iyi kuaförleri keşfedin, kolayca randevu alın.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push('/login')}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition-colors"
                >
                  Kayıt Ol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Popüler Kuaförler */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popüler Kuaförler</h2>
            <button className="flex items-center text-indigo-600 hover:text-indigo-700">
              <Filter className="w-4 h-4 mr-2" />
              Filtrele
            </button>
          </div>
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
        <section id="nearby-barbers">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Yakındaki Kuaförler</h2>
            {location ? (
              <button
                onClick={() => router.push('/map')}
                className="flex items-center text-indigo-600 hover:text-indigo-700"
              >
                <Map className="w-4 h-4 mr-2" />
                Haritada Göster
              </button>
            ) : (
              <button
                onClick={requestLocationPermission}
                className="flex items-center text-indigo-600 hover:text-indigo-700"
              >
                <Map className="w-4 h-4 mr-2" />
                Konumumu Göster
              </button>
            )}
          </div>
          {showLocationRequest && !locationError && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Map className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-indigo-800">Konum İzni</h3>
                  <p className="text-sm text-indigo-700 mt-1">
                    Yakındaki kuaförleri görebilmek için konum izni vermeniz gerekiyor.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={requestLocationPermission}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Konum İzni Ver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Map className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Konum Hatası</h3>
                  <p className="text-sm text-red-700 mt-1">{locationError}</p>
                  <div className="mt-4">
                    <button
                      onClick={requestLocationPermission}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nearbyBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import { MapPin, Star, Clock, LogOut, Search, Map, Filter, Calendar, User, ChevronRight } from 'lucide-react';
import NotificationList from '@/components/notifications/NotificationList';

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
  photoURL?: string;
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
  const [userRole, setUserRole] = useState<string | null>(null);
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
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Kullanıcı rolünü al
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUser(null);
        setUserRole(null);
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

  const handleProfileClick = () => {
    if (userRole === 'barber') {
      router.push('/barber/profile');
    } else if (userRole === 'customer') {
      router.push('/profile');
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

  const HeroSection = () => (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
      <div className="container mx-auto px-4">
        {/* Üst menü */}
        <div className="mb-8 flex items-center justify-end space-x-4">
          {user ? (
            <>
              <NotificationList />
              <button
                onClick={handleProfileClick}
                className="flex items-center space-x-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <User className="h-4 w-4" />
                <span>Profilim</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex items-center space-x-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <User className="h-4 w-4" />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-6 animate-in">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              En İyi Kuaförleri <br />
              <span className="text-primary">Keşfedin</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Size en yakın kuaförleri bulun, değerlendirmeleri inceleyin ve hemen randevu alın.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kuaför ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </form>
              {!user && (
                <button
                  onClick={() => router.push('/register')}
                  className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Hemen Başla
                </button>
              )}
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[500px] animate-in">
            <Image
              src="/images/hero-image.jpg"
              alt="Kuaför Randevu Sistemi"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
    <div className="space-y-2 mb-8">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );

  const BarberCard = ({ barber }: { barber: Barber }) => {
    const router = useRouter();

    const getWorkingHours = () => {
      if (!barber.workingHours) return 'Çalışma saatleri bilgisi yok';
      
      try {
        const hours = typeof barber.workingHours === 'string' 
          ? JSON.parse(barber.workingHours) 
          : barber.workingHours;

        const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
        const todayHours = hours[today];

        if (todayHours?.isClosed) return 'Bugün kapalı';
        if (!todayHours) return 'Çalışma saatleri bilgisi yok';

        return `${todayHours.start} - ${todayHours.end}`;
      } catch (error) {
        return 'Çalışma saatleri bilgisi yok';
      }
    };

    return (
      <div
        onClick={() => router.push(`/barber/${barber.id}`)}
        className="group cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
      >
        <div className="flex items-start space-x-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full">
            <Image
              src={barber.photoURL || '/images/default-barber.jpg'}
              alt={`${barber.firstName} ${barber.lastName}`}
              fill
              sizes="(max-width: 768px) 64px, 64px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {barber.firstName} {barber.lastName}
              </h3>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{barber.rating?.toFixed(1) || '0.0'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{barber.address}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{getWorkingHours()}</span>
            </div>
          </div>
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
    <main className="min-h-screen">
      <HeroSection />
      
      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Popüler Kuaförler */}
        <section className="animate-in">
          <SectionHeader
            title="Popüler Kuaförler"
            description="En çok tercih edilen kuaförlerimizi keşfedin"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>

        {/* Son Ziyaret Edilenler */}
        <section className="animate-in">
          <SectionHeader
            title="Son Ziyaret Edilenler"
            description="Daha önce baktığınız kuaförler"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>

        {/* Yakındaki Kuaförler */}
        <section id="nearby-barbers" className="animate-in">
          <SectionHeader
            title="Yakındaki Kuaförler"
            description="Size en yakın kuaförleri keşfedin"
          />
          {showLocationRequest && !location && !locationError && (
            <div className="mb-8 p-4 rounded-lg bg-primary/10 text-primary">
              <p className="text-sm">
                Yakındaki kuaförleri görmek için konum izni vermeniz gerekiyor.
              </p>
              <button
                onClick={requestLocationPermission}
                className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Konum İzni Ver
              </button>
            </div>
          )}
          {locationError && (
            <div className="mb-8 p-4 rounded-lg bg-destructive/10 text-destructive">
              <p className="text-sm">{locationError}</p>
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyBarbers.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

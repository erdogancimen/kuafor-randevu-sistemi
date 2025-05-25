'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import { MapPin, Star, Clock, LogOut, Search, Map, Filter, Calendar, User, ChevronRight, X, Navigation } from 'lucide-react';
import NotificationList from '@/components/notifications/NotificationList';
import React from 'react';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
  type: 'male' | 'female' | 'mixed';
  distance?: number;
  services?: { name: string; price: number }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  } | string;
  latitude?: number;
  longitude?: number;
  photoURL?: string;
  stats?: {
    averageRating: number;
    totalReviews: number;
  };
  createdAt?: string;
}

// HeroSection bileşenini ayrı bir bileşen olarak tanımla
const HeroSection = React.memo(({ 
  user, 
  userRole, 
  onProfileClick, 
  onLogout, 
  router,
  searchState,
  onSearchChange,
  onClearSearch,
  onToggleFilters,
  showFilters
}: { 
  user: any;
  userRole: string | null;
  onProfileClick: () => void;
  onLogout: () => void;
  router: any;
  searchState: {
    query: string;
    filteredBarbers: {
      popular: Barber[];
      nearby: Barber[];
    };
  };
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  showFilters: boolean;
}) => {
  // Sadece development modunda log göster
  if (process.env.NODE_ENV === 'development') {
    console.log('=== HeroSection Render ===');
    console.log('user:', user);
    console.log('userRole:', userRole);
  }

  // Event handler'ları useCallback ile optimize et
  const handleLoginClick = React.useCallback(() => {
    router.push('/login');
  }, [router]);

  const handleRegisterClick = React.useCallback(() => {
    router.push('/register');
  }, [router]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
      <div className="container mx-auto px-4">
        {/* Üst menü */}
        <div className="mb-8 flex items-center justify-end space-x-4 relative z-50">
          {user ? (
            <>
              <NotificationList userId={user.uid} />
              <button
                onClick={onProfileClick}
                className="flex items-center space-x-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <User className="h-4 w-4" />
                <span>Profilim</span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLoginClick}
                className="flex items-center space-x-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <User className="h-4 w-4" />
                <span>Giriş Yap</span>
              </button>
              <button
                onClick={handleRegisterClick}
                className="flex items-center space-x-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <span>Hemen Başla</span>
              </button>
            </div>
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

            {/* Arama Bölümü */}
            <div className="relative max-w-xl">
              <input
                type="text"
                id="barber-search"
                name="barber-search"
                placeholder="Kuaför ara..."
                value={searchState.query}
                onChange={onSearchChange}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchState.query && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onToggleFilters}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Filter className="w-5 h-5" />
              </button>
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
}, (prevProps, nextProps) => {
  // Sadece gerekli prop'lar değiştiğinde render et
  return (
    prevProps.user?.uid === nextProps.user?.uid &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.searchState.query === nextProps.searchState.query &&
    prevProps.showFilters === nextProps.showFilters
  );
});

HeroSection.displayName = 'HeroSection';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarberType, setSelectedBarberType] = useState<'male' | 'female' | 'mixed' | 'all'>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [popularBarbers, setPopularBarbers] = useState<Barber[]>([]);
  const [recentBarbers, setRecentBarbers] = useState<Barber[]>([]);
  const [nearbyBarbers, setNearbyBarbers] = useState<Barber[]>([]);
  const [filteredBarbers, setFilteredBarbers] = useState<{
    popular: Barber[];
    nearby: Barber[];
  }>({ popular: [], nearby: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  // Arama state'lerini birleştir ve optimize et
  const [searchState, setSearchState] = useState({
    query: '',
    filteredBarbers: {
      popular: [] as Barber[],
      nearby: [] as Barber[]
    }
  });

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
    } else if (userRole === 'employee') {
      router.push('/employee/profile');
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
        const allBarbers = await Promise.all(barbersSnapshot.docs.map(async (doc) => {
          const barberData = doc.data();
          
          // Her kuaför için değerlendirme istatistiklerini getir
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('barberId', '==', doc.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const reviews = reviewsSnapshot.docs.map(reviewDoc => reviewDoc.data());
          
          const totalReviews = reviews.length;
          const averageRating = totalReviews > 0
            ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / totalReviews
            : 0;

          // Mesafe bilgisini ekle
          let distance = undefined;
          if (location) {
            distance = calculateDistance(
              location.lat,
              location.lng,
              barberData.latitude || 0,
              barberData.longitude || 0
            );
          }

          return {
            id: doc.id,
            ...barberData,
            stats: {
              averageRating,
              totalReviews
            },
            distance
          } as Barber;
        }));

        // Popüler kuaförleri sırala (rating'e göre)
        const popularBarbers = [...allBarbers]
          .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
          .slice(0, 10);

        // Son eklenen kuaförler (createdAt'e göre sıralı)
        const recentBarbers = [...allBarbers]
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10);

        // Yakındaki kuaförler (mesafeye göre sıralı)
        let nearbyBarbers = [...allBarbers];
        if (location) {
          nearbyBarbers = allBarbers
            .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            .slice(0, 10);
        } else {
          // Konum yoksa son eklenen kuaförleri göster
          nearbyBarbers = recentBarbers;
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
  }, [location]);

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

  // Arama işlevi
  const handleSearch = useCallback(() => {
    const { query } = searchState;
    
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        filteredBarbers: {
          popular: [],
          nearby: []
        }
      }));
      return;
    }

    const allBarbers = [...popularBarbers, ...recentBarbers, ...nearbyBarbers];
    const uniqueBarbers = allBarbers.reduce((acc: Barber[], current) => {
      const exists = acc.find(barber => barber.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    const filtered = uniqueBarbers.filter(barber => {
      const nameMatch = `${barber.firstName} ${barber.lastName}`.toLowerCase().includes(query.toLowerCase());
      const addressMatch = barber.address?.toLowerCase().includes(query.toLowerCase());
      const serviceMatch = barber.services?.some(service => 
        service.name.toLowerCase().includes(query.toLowerCase())
      );

      return nameMatch || addressMatch || serviceMatch;
    });

    // Popüler ve yakın kuaförleri ayır
    const popularFiltered = [...filtered]
      .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
      .slice(0, 5);

    const nearbyFiltered = location 
      ? [...filtered]
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
          .slice(0, 5)
      : [];

    setSearchState(prev => ({
      ...prev,
      filteredBarbers: {
        popular: popularFiltered,
        nearby: nearbyFiltered
      }
    }));
  }, [searchState.query, popularBarbers, recentBarbers, nearbyBarbers, location]);

  // Arama çubuğu değiştiğinde
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchState(prev => ({
      ...prev,
      query: value
    }));
    handleSearch();
  }, [handleSearch]);

  // State değişikliklerini izle (sadece development modunda)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== State değişikliği ===');
      console.log('searchQuery:', searchState.query);
      console.log('filteredBarbers:', searchState.filteredBarbers);
    }
  }, [searchState]);

  const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
    <div className="space-y-2 mb-8">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {description && <p className="muted-foreground">{description}</p>}
    </div>
  );

  const BarberCard = ({ barber }: { barber: Barber }) => {
    const router = useRouter();

    const getWorkingHours = () => {
      if (!barber.workingHours) return 'Çalışma saatleri belirtilmemiş';
      
      if (typeof barber.workingHours === 'string') {
        return barber.workingHours;
      }
      
      const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
      const hours = barber.workingHours[today];
      
      if (!hours || hours.isClosed) return 'Bugün kapalı';
      return `${hours.start} - ${hours.end}`;
    };

    const handleShowOnMap = (e: React.MouseEvent) => {
      e.stopPropagation(); // Kartın tıklama olayını engelle
      if (barber.latitude && barber.longitude) {
        const url = `https://www.google.com/maps/search/?api=1&query=${barber.latitude},${barber.longitude}`;
        window.open(url, '_blank');
      }
    };

    return (
      <div
        onClick={() => router.push(`/barber/${barber.id}`)}
        className="group relative bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10 hover:border-primary/50 transition cursor-pointer"
      >
        <div className="flex items-start space-x-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden bg-white/5 border-2 border-white/10">
            <Image
              src={barber.photoURL || '/images/default-barber.jpg'}
              alt={`${barber.firstName} ${barber.lastName}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {barber.firstName} {barber.lastName}
            </h3>
            <div className="flex items-center mt-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="ml-1 text-sm font-medium text-white">
                {barber.stats?.averageRating.toFixed(1) || '0.0'}
              </span>
              <span className="ml-1 text-sm text-gray-400">
                ({barber.stats?.totalReviews || 0})
              </span>
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="truncate">{barber.address}</span>
            </div>
            {barber.distance !== undefined && (
              <div className="flex items-center mt-1 text-sm text-gray-400">
                <Map className="w-4 h-4 mr-1" />
                <span>{barber.distance.toFixed(1)} km uzaklıkta</span>
              </div>
            )}
            <div className="flex items-center mt-1 text-sm text-gray-400">
              <Clock className="w-4 h-4 mr-1" />
              <span>{getWorkingHours()}</span>
            </div>
            {barber.latitude && barber.longitude && (
              <button
                onClick={handleShowOnMap}
                className="mt-2 flex items-center space-x-1 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span>Haritada Göster</span>
              </button>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition" />
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
      <HeroSection 
        user={user}
        userRole={userRole}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        router={router}
        searchState={searchState}
        onSearchChange={(e) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('=== Search Input Change ===');
            console.log('value:', e.target.value);
          }
          handleSearchChange(e);
        }}
        onClearSearch={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('=== Clear Search ===');
          }
          setSearchState({
            query: '',
            filteredBarbers: {
              popular: [],
              nearby: []
            }
          });
        }}
        onToggleFilters={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('=== Toggle Filters ===');
          }
          setShowFilters(!showFilters);
        }}
        showFilters={showFilters}
      />
      
      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Filtreler */}
        {showFilters && (
          <div className="max-w-3xl mx-auto mt-4 grid grid-cols-2 gap-4 p-4 bg-background rounded-lg border border-input">
            <div>
              <label htmlFor="barber-type" className="block text-sm font-medium mb-2">Kuaför Türü</label>
              <select
                id="barber-type"
                name="barber-type"
                value={selectedBarberType}
                onChange={(e) => {
                  setSelectedBarberType(e.target.value as any);
                }}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tümü</option>
                <option value="male">Erkek Kuaförü</option>
                <option value="female">Kadın Kuaförü</option>
                <option value="mixed">Karma</option>
              </select>
            </div>
            <div>
              <label htmlFor="service-type" className="block text-sm font-medium mb-2">Hizmet</label>
              <select
                id="service-type"
                name="service-type"
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tümü</option>
                <option value="sac-kesimi">Saç Kesimi</option>
                <option value="sac-boyama">Saç Boyama</option>
                <option value="cilt-bakimi">Cilt Bakımı</option>
                <option value="sakal-tiras">Sakal Tıraşı</option>
                <option value="manikur">Manikür</option>
                <option value="pedikur">Pedikür</option>
              </select>
            </div>
          </div>
        )}

        {/* Arama Sonuçları */}
        {(searchState.filteredBarbers.popular.length > 0 || searchState.filteredBarbers.nearby.length > 0) && (
          <section className="animate-in">
            <div className="mb-6 flex items-center justify-between">
              <SectionHeader
                title="Arama Sonuçları"
                description={`"${searchState.query}" için sonuçlar`}
              />
              <button
                onClick={() => {
                  setSearchState({
                    query: '',
                    filteredBarbers: {
                      popular: [],
                      nearby: []
                    }
                  });
                }}
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span>Aramayı Temizle</span>
              </button>
            </div>

            {/* Popüler Kuaförler */}
            {searchState.filteredBarbers.popular.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl font-semibold mb-4">Popüler Kuaförler</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {searchState.filteredBarbers.popular.map((barber) => (
                <BarberCard key={barber.id} barber={barber} />
              ))}
                </div>
                </div>
              )}

            {/* Yakındaki Kuaförler */}
            {searchState.filteredBarbers.nearby.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Yakındaki Kuaförler</h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {searchState.filteredBarbers.nearby.map((barber) => (
                    <BarberCard key={barber.id} barber={barber} />
                  ))}
                </div>
            </div>
            )}
          </section>
        )}

        {/* Popüler Kuaförler */}
        {searchState.filteredBarbers.popular.length === 0 && searchState.filteredBarbers.nearby.length === 0 && (
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
        )}

        {/* Son Ziyaret Edilenler */}
        {searchState.filteredBarbers.popular.length === 0 && searchState.filteredBarbers.nearby.length === 0 && (
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
        )}

        {/* Yakındaki Kuaförler */}
        {searchState.filteredBarbers.popular.length === 0 && searchState.filteredBarbers.nearby.length === 0 && (
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
        )}
      </div>
    </main>
  );
}

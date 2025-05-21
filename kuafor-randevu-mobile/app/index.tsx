import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import NotificationList from '@/components/NotificationList';
import * as Location from 'expo-location';

// Varsayılan görseller için
const DEFAULT_IMAGES = {
  hero: require('@/assets/images/hero/hero-banner.jpg'),
  barber: require('@/assets/images/default.jpg'),
};

const { width } = Dimensions.get('window');

interface WorkingHours {
  start: string;
  end: string;
  isClosed: boolean;
}

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  rating?: number;
  reviews?: number;
  services: Array<{
    name: string;
    price: number;
    duration: number;
  }>;
  workingHours: Record<string, WorkingHours>;
  address: string;
  description: string;
  latitude?: number;
  longitude?: number;
  type: 'male' | 'female' | 'mixed';
  stats?: {
    averageRating: number;
    totalReviews: number;
  };
  updatedAt?: string;
  distance?: number;
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarberType, setSelectedBarberType] = useState<'male' | 'female' | 'mixed' | 'all'>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [popularBarbers, setPopularBarbers] = useState<Barber[]>([]);
  const [recentBarbers, setRecentBarbers] = useState<Barber[]>([]);
  const [nearbyBarbers, setNearbyBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAllRecentBarbers, setShowAllRecentBarbers] = useState(false);
  const [showAllNearbyBarbers, setShowAllNearbyBarbers] = useState(false);
  const [showAllPopularBarbers, setShowAllPopularBarbers] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filteredBarbers, setFilteredBarbers] = useState<{
    popular: Barber[];
    nearby: Barber[];
  }>({ popular: [], nearby: [] });
  const router = useRouter();
  const auth = getAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const db = getFirestore();
      const barbersRef = collection(db, 'users');
      
      // Önce tüm kuaförleri getir
      const allBarbersQuery = query(
        barbersRef,
        where('role', '==', 'barber')
      );
      const allBarbersSnapshot = await getDocs(allBarbersQuery);
      
      // Her kuaför için değerlendirme istatistiklerini getir
      const allBarbers = await Promise.all(allBarbersSnapshot.docs.map(async (doc) => {
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

        return {
          id: doc.id,
          ...barberData,
          photoURL: DEFAULT_IMAGES.barber,
          stats: {
            averageRating,
            totalReviews
          }
        } as Barber;
      }));

      // Popüler kuaförler (rating'e göre sıralı)
      const popularBarbers = [...allBarbers]
        .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
        .slice(0, 10);

      // Son eklenen kuaförler (updatedAt'e göre sıralı)
      const recentBarbers = [...allBarbers]
        .sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10);

      // Yakındaki kuaförler (konum varsa)
      let nearbyBarbers = [...allBarbers];
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

  // Arama işlevi
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredBarbers({ popular: [], nearby: [] });
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
      const nameMatch = `${barber.firstName} ${barber.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      const addressMatch = barber.address?.toLowerCase().includes(searchQuery.toLowerCase());
      const serviceMatch = barber.services?.some(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
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

    setFilteredBarbers({
      popular: popularFiltered,
      nearby: nearbyFiltered
    });
  };

  // Arama çubuğu değiştiğinde
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      handleSearch();
    } else {
      setFilteredBarbers({ popular: [], nearby: [] });
    }
  };

  const getWorkingHours = (workingHours: Record<string, WorkingHours>) => {
    if (!workingHours) return 'Çalışma saatleri bilgisi yok';
    
    try {
      const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
      const todayHours = workingHours[today];

      if (todayHours?.isClosed) return 'Bugün kapalı';
      if (!todayHours) return 'Çalışma saatleri bilgisi yok';

      return `${todayHours.start} - ${todayHours.end}`;
    } catch (error) {
      return 'Çalışma saatleri bilgisi yok';
    }
  };

  const handleProfilePress = () => {
    if (!userRole) return;
    
    switch (userRole) {
      case 'customer':
        router.push('/profile');
        break;
      case 'barber':
        router.push('/barber/profile');
        break;
      case 'employee':
        router.push('/employee/profile');
        break;
    }
  };

  // Konum alma fonksiyonu
  const getLocation = async () => {
    try {
      // Önce konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Konum izni reddedildi');
        return;
      }

      // Konum bilgisini al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
      setLocationError(null);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Konum bilgisi alınamadı');
    }
  };

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

  // Konum değiştiğinde kuaförleri yeniden yükle
  useEffect(() => {
    if (location) {
      fetchBarbers();
    }
  }, [location]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isAuthenticated && (
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleProfilePress}
          >
            <Ionicons name="person-circle-outline" size={24} color={theme.colors.text} />
            <Text style={styles.profileText}>Profilim</Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hero Section */}
      <View style={styles.hero}>
        <Image
          source={DEFAULT_IMAGES.hero}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>En İyi Kuaförleri</Text>
          <Text style={styles.heroSubtitle}>
            Size en yakın kuaförleri bulun, değerlendirmeleri inceleyin ve hemen randevu alın.
          </Text>
          {!isAuthenticated && (
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kuaför ara..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            placeholderTextColor={theme.colors.textMuted}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setFilteredBarbers({ popular: [], nearby: [] });
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Kuaför Türü</Text>
              <View style={styles.filterOptions}>
                {['all', 'male', 'female', 'mixed'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      selectedBarberType === type && styles.filterOptionSelected
                    ]}
                    onPress={() => setSelectedBarberType(type as any)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedBarberType === type && styles.filterOptionTextSelected
                    ]}>
                      {type === 'all' ? 'Tümü' : 
                       type === 'male' ? 'Erkek' :
                       type === 'female' ? 'Kadın' : 'Karma'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Arama Sonuçları */}
      {(filteredBarbers.popular.length > 0 || filteredBarbers.nearby.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Arama Sonuçları</Text>
          </View>

          {/* Popüler Kuaförler */}
          {filteredBarbers.popular.length > 0 && (
            <>
              <Text style={styles.subSectionTitle}>Popüler Kuaförler</Text>
              <ScrollView 
                horizontal={false} 
                showsVerticalScrollIndicator={false} 
                style={styles.barbersList}
              >
                {filteredBarbers.popular.map((barber) => (
                  <TouchableOpacity
                    key={barber.id}
                    style={[styles.barberCard, styles.barberCardVertical]}
                    onPress={() => router.push({
                      pathname: '/barber/[id]',
                      params: { id: barber.id }
                    })}
                  >
                    <Image
                      source={barber.photoURL || DEFAULT_IMAGES.barber}
                      style={styles.barberImageVertical}
                    />
                    <View style={styles.barberInfo}>
                      <Text style={styles.barberName}>
                        {barber.firstName} {barber.lastName}
                      </Text>
                      <View style={styles.barberRating}>
                        <Ionicons name="star" size={16} color={theme.colors.warning} />
                        <Text style={styles.ratingText}>
                          {barber.stats?.averageRating ? barber.stats.averageRating.toFixed(1) : '0.0'}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({barber.stats?.totalReviews || 0})
                        </Text>
                      </View>
                      <Text style={styles.workingHours}>
                        {getWorkingHours(barber.workingHours)}
                      </Text>
                      <TouchableOpacity
                        style={styles.appointmentButton}
                        onPress={() => router.push({
                          pathname: '/barber/[id]',
                          params: { id: barber.id }
                        })}
                      >
                        <Text style={styles.appointmentButtonText}>Randevu Oluştur</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Yakındaki Kuaförler */}
          {filteredBarbers.nearby.length > 0 && (
            <>
              <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Yakındaki Kuaförler</Text>
              <ScrollView 
                horizontal={false} 
                showsVerticalScrollIndicator={false} 
                style={styles.barbersList}
              >
                {filteredBarbers.nearby.map((barber) => (
                  <TouchableOpacity
                    key={barber.id}
                    style={[styles.barberCard, styles.barberCardVertical]}
                    onPress={() => router.push({
                      pathname: '/barber/[id]',
                      params: { id: barber.id }
                    })}
                  >
                    <Image
                      source={barber.photoURL || DEFAULT_IMAGES.barber}
                      style={styles.barberImageVertical}
                    />
                    <View style={styles.barberInfo}>
                      <Text style={styles.barberName}>
                        {barber.firstName} {barber.lastName}
                      </Text>
                      <View style={styles.barberRating}>
                        <Ionicons name="star" size={16} color={theme.colors.warning} />
                        <Text style={styles.ratingText}>
                          {barber.stats?.averageRating ? barber.stats.averageRating.toFixed(1) : '0.0'}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({barber.stats?.totalReviews || 0})
                        </Text>
                      </View>
                      {barber.distance && (
                        <Text style={styles.distanceText}>
                          {barber.distance.toFixed(1)} km uzaklıkta
                        </Text>
                      )}
                      <Text style={styles.workingHours}>
                        {getWorkingHours(barber.workingHours)}
                      </Text>
                      <TouchableOpacity
                        style={styles.appointmentButton}
                        onPress={() => router.push({
                          pathname: '/barber/[id]',
                          params: { id: barber.id }
                        })}
                      >
                        <Text style={styles.appointmentButtonText}>Randevu Oluştur</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Popular Barbers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popüler Kuaförler</Text>
          <TouchableOpacity onPress={() => setShowAllPopularBarbers(!showAllPopularBarbers)}>
            <Text style={styles.seeAllButton}>
              {showAllPopularBarbers ? 'Daha Az Göster' : 'Tümünü Gör'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal={!showAllPopularBarbers} 
          showsHorizontalScrollIndicator={false} 
          style={[styles.barbersList, showAllPopularBarbers && styles.barbersListVertical]}
        >
          {popularBarbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={[styles.barberCard, showAllPopularBarbers && styles.barberCardVertical]}
              onPress={() => router.push({
                pathname: '/barber/[id]',
                params: { id: barber.id }
              })}
            >
              <Image
                source={barber.photoURL || DEFAULT_IMAGES.barber}
                style={[styles.barberImage, showAllPopularBarbers && styles.barberImageVertical]}
              />
              <View style={styles.barberInfo}>
                <Text style={styles.barberName}>
                  {barber.firstName} {barber.lastName}
                </Text>
                <View style={styles.barberRating}>
                  <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.ratingText}>
                    {barber.stats?.averageRating ? barber.stats.averageRating.toFixed(1) : '0.0'}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({barber.stats?.totalReviews || 0})
                  </Text>
                </View>
                <Text style={styles.workingHours}>
                  {getWorkingHours(barber.workingHours)}
                </Text>
                <TouchableOpacity
                  style={styles.appointmentButton}
                  onPress={() => router.push({
                    pathname: '/barber/[id]',
                    params: { id: barber.id }
                  })}
                >
                  <Text style={styles.appointmentButtonText}>Randevu Oluştur</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Barbers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Eklenen Kuaförler</Text>
          <TouchableOpacity onPress={() => setShowAllRecentBarbers(!showAllRecentBarbers)}>
            <Text style={styles.seeAllButton}>
              {showAllRecentBarbers ? 'Daha Az Göster' : 'Tümünü Gör'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal={!showAllRecentBarbers} 
          showsHorizontalScrollIndicator={false} 
          style={[styles.barbersList, showAllRecentBarbers && styles.barbersListVertical]}
        >
          {recentBarbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={[styles.barberCard, showAllRecentBarbers && styles.barberCardVertical]}
              onPress={() => router.push({
                pathname: '/barber/[id]',
                params: { id: barber.id }
              })}
            >
              <Image
                source={barber.photoURL || DEFAULT_IMAGES.barber}
                style={[styles.barberImage, showAllRecentBarbers && styles.barberImageVertical]}
              />
              <View style={styles.barberInfo}>
                <Text style={styles.barberName}>
                  {barber.firstName} {barber.lastName}
                </Text>
                <View style={styles.barberRating}>
                  <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.ratingText}>
                    {barber.stats?.averageRating ? barber.stats.averageRating.toFixed(1) : '0.0'}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({barber.stats?.totalReviews || 0})
                  </Text>
                </View>
                <Text style={styles.workingHours}>
                  {getWorkingHours(barber.workingHours)}
                </Text>
                <TouchableOpacity
                  style={styles.appointmentButton}
                  onPress={() => router.push({
                    pathname: '/barber/[id]',
                    params: { id: barber.id }
                  })}
                >
                  <Text style={styles.appointmentButtonText}>Randevu Oluştur</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Nearby Barbers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yakındaki Kuaförler</Text>
          {location && (
            <TouchableOpacity onPress={() => setShowAllNearbyBarbers(!showAllNearbyBarbers)}>
              <Text style={styles.seeAllButton}>
                {showAllNearbyBarbers ? 'Daha Az Göster' : 'Tümünü Gör'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {!location && !locationError && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getLocation}
          >
            <Ionicons name="location" size={20} color={theme.colors.primary} />
            <Text style={styles.locationButtonText}>Konum İzni Ver</Text>
          </TouchableOpacity>
        )}
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
        {location && (
          <ScrollView 
            horizontal={!showAllNearbyBarbers} 
            showsHorizontalScrollIndicator={false} 
            style={[styles.barbersList, showAllNearbyBarbers && styles.barbersListVertical]}
          >
            {nearbyBarbers.map((barber) => (
              <TouchableOpacity
                key={barber.id}
                style={[styles.barberCard, showAllNearbyBarbers && styles.barberCardVertical]}
                onPress={() => router.push({
                  pathname: '/barber/[id]',
                  params: { id: barber.id }
                })}
              >
                <Image
                  source={barber.photoURL || DEFAULT_IMAGES.barber}
                  style={[styles.barberImage, showAllNearbyBarbers && styles.barberImageVertical]}
                />
                <View style={styles.barberInfo}>
                  <Text style={styles.barberName}>
                    {barber.firstName} {barber.lastName}
                  </Text>
                  <View style={styles.barberRating}>
                    <Ionicons name="star" size={16} color={theme.colors.warning} />
                    <Text style={styles.ratingText}>
                      {barber.stats?.averageRating ? barber.stats.averageRating.toFixed(1) : '0.0'}
                    </Text>
                    <Text style={styles.reviewCount}>
                      ({barber.stats?.totalReviews || 0})
                    </Text>
                  </View>
                  {barber.distance && (
                    <Text style={styles.distanceText}>
                      {barber.distance.toFixed(1)} km uzaklıkta
                    </Text>
                  )}
                  <Text style={styles.workingHours}>
                    {getWorkingHours(barber.workingHours)}
                  </Text>
                  <TouchableOpacity
                    style={styles.appointmentButton}
                    onPress={() => router.push({
                      pathname: '/barber/[id]',
                      params: { id: barber.id }
                    })}
                  >
                    <Text style={styles.appointmentButtonText}>Randevu Oluştur</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {isAuthenticated && auth.currentUser && (
        <NotificationList
          userId={auth.currentUser.uid}
          isVisible={showNotifications}
          onClose={() => setShowNotifications(false)}
          onNotificationCountChange={setNotificationCount}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.colors.text,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAllButton: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  barbersList: {
    paddingRight: 16,
    gap: 16,
    marginHorizontal: -16,
  },
  barbersListVertical: {
    flexDirection: 'column',
    paddingRight: 0,
    marginHorizontal: 0,
  },
  barberCard: {
    width: width * 0.8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    marginHorizontal: 8,
  },
  barberCardVertical: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 0,
  },
  barberImage: {
    width: '100%',
    height: 200,
  },
  barberImageVertical: {
    width: 120,
    height: 120,
  },
  barberInfo: {
    padding: 16,
  },
  barberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  barberRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  workingHours: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  notificationButton: {
    padding: theme.spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  appointmentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    marginBottom: 16,
  },
  locationButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  clearButton: {
    padding: 8,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
});

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
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

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
  rating: number;
  reviews: number;
  services: string[];
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
  const router = useRouter();

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const db = getFirestore();
      const barbersRef = collection(db, 'users');
      const q = query(
        barbersRef,
        where('role', '==', 'barber'),
        orderBy('rating', 'desc'),
        limit(6)
      );
      
      const querySnapshot = await getDocs(q);
      const barbers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        photoURL: doc.data().photoURL || DEFAULT_IMAGES.barber,
      })) as Barber[];

      setPopularBarbers(barbers.slice(0, 3));
      setRecentBarbers(barbers.slice(3));
      setNearbyBarbers(barbers.slice(3, 6));
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
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
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
          <Ionicons name="filter" size={20} color={theme.colors.textSecondary} />

          </TouchableOpacity>
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

      {/* Popular Barbers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popüler Kuaförler</Text>
          <TouchableOpacity onPress={() => router.push('/barbers')}>
            <Text style={styles.seeAllButton}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barbersList}>
          {popularBarbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={styles.barberCard}
              onPress={() => router.push(`/barber/${barber.id}`)}
            >
              <Image
                source={barber.photoURL || DEFAULT_IMAGES.barber}
                style={styles.barberImage}
              />
              <View style={styles.barberInfo}>
                <Text style={styles.barberName}>
                  {barber.firstName} {barber.lastName}
                </Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.ratingText}>
                    {barber.stats?.averageRating.toFixed(1) || barber.rating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({barber.stats?.totalReviews || barber.reviews})
                  </Text>
                </View>
                <Text style={styles.workingHours}>
                  {getWorkingHours(barber.workingHours)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Barbers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Eklenen Kuaförler</Text>
          <TouchableOpacity onPress={() => router.push('/barbers')}>
            <Text style={styles.seeAllButton}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentBarbersContainer}>
          {recentBarbers.map((barber) => (
            <TouchableOpacity 
              key={barber.id}
              style={styles.recentBarberCard}
              onPress={() => router.push(`/barber/${barber.id}`)}
            >
              <Image
                source={{ uri: barber.photoURL }}
                style={styles.recentBarberImage}
                resizeMode="cover"
              />
              <View style={styles.recentBarberInfo}>
                <Text style={styles.recentBarberName}>
                  {barber.firstName} {barber.lastName}
                </Text>
                <View style={styles.recentBarberRating}>
                <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.recentRatingText}>
                    {barber.stats?.averageRating.toFixed(1) || '0.0'} ({barber.stats?.totalReviews || 0})
                  </Text>
                </View>
                <View style={styles.recentBarberLocation}>
                <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.recentLocationText}>{barber.address}</Text>
                </View>
                <View style={styles.recentBarberHours}>
                <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.recentHoursText}>
                    {getWorkingHours(barber.workingHours)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
  },
  barberImage: {
    width: '100%',
    height: 200,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
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
  recentBarbersContainer: {
    gap: 16,
  },
  recentBarberCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recentBarberImage: {
    width: 100,
    height: 100,
  },
  recentBarberInfo: {
    flex: 1,
    padding: 12,
  },
  recentBarberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  recentBarberRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentRatingText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  recentBarberLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentLocationText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  recentBarberHours: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentHoursText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

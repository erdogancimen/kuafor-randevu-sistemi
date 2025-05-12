import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageStyle,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Varsayılan görseller için
const DEFAULT_IMAGES = {
  hero: require('@/assets/images/hero/hero-banner.jpg'),
  barber: require('@/assets/images/barbers/default.jpg'),
};

interface WorkingHours {
  start: string;
  end: string;
  isClosed: boolean;
}

interface Barber {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  services: string[];
  workingHours: Record<string, WorkingHours>;
  location: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredBarbers, setFeaturedBarbers] = useState<Barber[]>([]);
  const [recentBarbers, setRecentBarbers] = useState<Barber[]>([]);
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
        image: doc.data().photoURL || DEFAULT_IMAGES.barber,
      })) as Barber[];

      setFeaturedBarbers(barbers.slice(0, 3));
      setRecentBarbers(barbers.slice(3));
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
      <View style={styles.hero}>
        <Image
          source={DEFAULT_IMAGES.hero}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>En İyi Berberler</Text>
          <Text style={styles.heroSubtitle}>
            Size en yakın berberi bulun ve hemen randevu alın
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Berber ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Öne Çıkan Berberler</Text>
          <TouchableOpacity onPress={() => router.push('/barbers')}>
            <Text style={styles.seeAllButton}>Tümünü Gör</Text>
        </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredBarbersContainer}
        >
          {featuredBarbers.map((barber) => (
        <TouchableOpacity 
              key={barber.id}
              style={styles.barberCard}
              onPress={() => router.push(`/barber/${barber.id}`)}
            >
              <Image
                source={DEFAULT_IMAGES.barber}
                style={styles.barberImage}
                resizeMode="cover"
              />
              <View style={styles.barberInfo}>
                <Text style={styles.barberName}>{barber.name}</Text>
                <View style={styles.barberRating}>
                  <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.ratingText}>
                    {barber.rating.toFixed(1)} ({barber.reviews})
                  </Text>
                </View>
                <Text style={styles.barberLocation}>{barber.location}</Text>
                <Text style={styles.workingHours}>
                  {getWorkingHours(barber.workingHours)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Eklenen Berberler</Text>
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
                source={{ uri: barber.image }}
                style={styles.recentBarberImage}
                resizeMode="cover"
              />
              <View style={styles.recentBarberInfo}>
                <Text style={styles.recentBarberName}>{barber.name}</Text>
                <View style={styles.recentBarberRating}>
                  <Ionicons name="star" size={16} color={theme.colors.warning} />
                  <Text style={styles.recentRatingText}>
                    {barber.rating.toFixed(1)} ({barber.reviews})
                  </Text>
                </View>
                <Text style={styles.recentBarberLocation}>{barber.location}</Text>
                <Text style={styles.recentWorkingHours}>
                  {getWorkingHours(barber.workingHours)}
                </Text>
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
    padding: theme.spacing.xl,
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    marginBottom: theme.spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.surface,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 18,
    marginBottom: theme.spacing.xl,
  },
  loginButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    ...theme.typography.body,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  seeAllButton: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontSize: 14,
  },
  featuredBarbersContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  barberCard: {
    width: 300,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
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
    padding: theme.spacing.lg,
  },
  barberName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontSize: 20,
    fontWeight: 'bold',
  },
  barberRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  ratingText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontSize: 14,
  },
  barberLocation: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontSize: 14,
  },
  workingHours: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  recentBarbersContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  recentBarberCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
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
    padding: theme.spacing.md,
  },
  recentBarberName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recentBarberRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  recentRatingText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  recentBarberLocation: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recentWorkingHours: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
});

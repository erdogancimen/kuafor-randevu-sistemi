import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface BarberProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoURL?: string;
  location: string;
  description: string;
  rating: number;
  reviews: number;
  services: string[];
  workingHours: Record<string, {
    start: string;
    end: string;
    isClosed: boolean;
  }>;
}

export default function BarberProfileScreen() {
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    fetchBarberProfile();
  }, []);

  const fetchBarberProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const db = getFirestore();
      const barberDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (barberDoc.exists()) {
        setProfile(barberDoc.data() as BarberProfile);
      }
    } catch (error) {
      console.error('Error fetching barber profile:', error);
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/barber/profile/edit');
  };

  const getWorkingHours = (workingHours: Record<string, { start: string; end: string; isClosed: boolean }>) => {
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
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profil bilgileri bulunamadı</Text>
        <Button
          title="Yeniden Dene"
          onPress={fetchBarberProfile}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.photoURL ? (
            <Image
              source={{ uri: profile.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{`${profile.firstName} ${profile.lastName}`}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={20} color={theme.colors.warning} />
          <Text style={styles.rating}>
            {profile.rating.toFixed(1)} ({profile.reviews} değerlendirme)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
          <TouchableOpacity onPress={handleEditProfile}>
            <Ionicons name="pencil" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{profile.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{profile.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{profile.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{getWorkingHours(profile.workingHours)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkımda</Text>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{profile.description}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hizmetler</Text>
        <View style={styles.servicesContainer}>
          {profile.services.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <Ionicons name="cut-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.buttonContainer}>
          <Button
            title="Çalışma Saatleri"
            onPress={() => router.push('/barber/working-hours')}
            variant="outline"
            fullWidth
          />
          <Button
            title="Hizmetler"
            onPress={() => router.push('/barber/services')}
            variant="outline"
            fullWidth
          />
          <Button
            title="Randevular"
            onPress={() => router.push('/barber/appointments')}
            variant="outline"
            fullWidth
          />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  infoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  descriptionContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  servicesContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  serviceText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
}); 
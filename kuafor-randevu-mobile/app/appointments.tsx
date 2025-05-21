import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';

interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  employeeId: string;
  barberName: string;
  employeeName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  createdAt: any;
  isReviewed?: boolean;
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Sayfa odaklandığında randevuları yenile
  useFocusEffect(
    React.useCallback(() => {
      fetchAppointments();
    }, [])
  );

  const fetchAppointments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const db = getFirestore();
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const appointmentData = doc.data();
          
          // Değerlendirme durumunu kontrol et
          const reviewsRef = collection(db, 'reviews');
          const reviewsQuery = query(
            reviewsRef,
            where('appointmentId', '==', doc.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const isReviewed = !reviewsSnapshot.empty;

          return {
            id: doc.id,
            ...appointmentData,
            isReviewed
          } as Appointment;
        })
      );

      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      setCancelling(appointmentId);
      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'cancelled'
      });

      setAppointments(appointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'cancelled' }
          : appointment
      ));

      Alert.alert('Başarılı', 'Randevu iptal edildi');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Hata', 'Randevu iptal edilirken bir hata oluştu');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'confirmed':
        return theme.colors.primary;
      case 'cancelled':
        return theme.colors.destructive;
      case 'completed':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'Onay Bekliyor';
      case 'confirmed':
        return 'Onaylandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevularım</Text>
      </View>

      <ScrollView style={styles.content}>
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Henüz randevunuz yok</Text>
            <Text style={styles.emptyText}>
              Randevu oluşturmak için kuaför profillerini inceleyebilirsiniz
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.exploreButtonText}>Kuaförleri Keşfet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.employeeInfo}>
                    <Image
                      source={require('@/assets/images/default-customer.jpg')}
                      style={styles.employeeImage}
                    />
                    <View>
                      <Text style={styles.employeeName}>
                        {appointment.employeeName || appointment.barberName}
                      </Text>
                      <Text style={styles.serviceName}>{appointment.service}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="hourglass-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.duration} dk</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.price} TL</Text>
                  </View>
                </View>

                <View style={styles.appointmentActions}>
                  {appointment.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancel(appointment.id)}
                      disabled={cancelling === appointment.id}
                    >
                      {cancelling === appointment.id ? (
                        <ActivityIndicator size="small" color={theme.colors.surface} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={20} color={theme.colors.surface} />
                          <Text style={styles.cancelButtonText}>İptal Et</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {appointment.status === 'completed' && !appointment.isReviewed && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => router.push(`/review/${appointment.id}`)}
                    >
                      <Ionicons name="star-outline" size={20} color={theme.colors.surface} />
                      <Text style={styles.reviewButtonText}>Değerlendir</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  exploreButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryForeground,
  },
  appointmentsList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  appointmentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  employeeImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  employeeName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  serviceName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  reviewButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
}); 
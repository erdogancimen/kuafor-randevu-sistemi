import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Appointment {
  id: string;
  userId: string;
  userName?: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: any;
}

export default function BarberAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const fetchAppointments = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }

      try {
        const db = getFirestore();
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('barberId', '==', user.uid),
          where('employeeId', 'in', [user.uid, null])
        );

        const querySnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu', [
          {
            text: 'Tamam',
            onPress: () => router.back()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleStatusUpdate = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    setUpdating(appointmentId);
    try {
      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: newStatus }
          : appointment
      ));

      Alert.alert('Başarılı', `Randevu ${newStatus === 'confirmed' ? 'onaylandı' : newStatus === 'cancelled' ? 'iptal edildi' : 'tamamlandı'}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Hata', 'Randevu güncellenirken bir hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'confirmed':
        return theme.colors.success;
      case 'completed':
        return theme.colors.primary;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'confirmed':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
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
        <Text style={styles.headerTitle}>Randevular</Text>
      </View>

      <ScrollView style={styles.content}>
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Henüz randevu yok</Text>
            <Text style={styles.emptyText}>Müşteriler randevu oluşturduğunda burada görünecektir</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentName}>{appointment.userName || 'Müşteri'}</Text>
                    <Text style={styles.appointmentService}>{appointment.service}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                      {getStatusText(appointment.status)}
                    </Text>
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
                    <Text style={styles.detailText}>{appointment.duration} dakika</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{appointment.price} TL</Text>
                  </View>
                </View>

                {appointment.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() => handleStatusUpdate(appointment.id, 'confirmed')}
                      disabled={updating === appointment.id}
                    >
                      {updating === appointment.id ? (
                        <ActivityIndicator color={theme.colors.background} />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color={theme.colors.background} />
                          <Text style={styles.actionButtonText}>Onayla</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleStatusUpdate(appointment.id, 'cancelled')}
                      disabled={updating === appointment.id}
                    >
                      {updating === appointment.id ? (
                        <ActivityIndicator color={theme.colors.background} />
                      ) : (
                        <>
                          <Ionicons name="close" size={20} color={theme.colors.background} />
                          <Text style={styles.actionButtonText}>Reddet</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {appointment.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleStatusUpdate(appointment.id, 'completed')}
                    disabled={updating === appointment.id}
                  >
                    {updating === appointment.id ? (
                      <ActivityIndicator color={theme.colors.background} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
                        <Text style={styles.actionButtonText}>Tamamlandı</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
    backgroundColor: theme.colors.surface,
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
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
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
  appointmentInfo: {
    flex: 1,
  },
  appointmentName: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  appointmentService: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  confirmButton: {
    backgroundColor: theme.colors.success,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  actionButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
  },
}); 
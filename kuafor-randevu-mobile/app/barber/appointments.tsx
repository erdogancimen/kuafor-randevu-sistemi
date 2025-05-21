import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';

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
          where('employeeId', 'in', [user.uid, null]),
          orderBy('createdAt', 'desc')
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
                  <View style={styles.customerInfo}>
                    <Image
                      source={require('@/assets/images/default-customer.jpg')}
                      style={styles.customerImage}
                    />
                    <View>
                      <Text style={styles.customerName}>{appointment.userName || 'Müşteri'}</Text>
                      <Text style={styles.serviceName}>{appointment.service}</Text>
                      <View style={styles.appointmentDetails}>
                        <View style={styles.detailItem}>
                          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{appointment.date}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{appointment.time}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailText}>{appointment.duration} dk</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.appointmentActions}>
                    <Text style={styles.price}>{appointment.price} TL</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                    </View>
                    {appointment.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.confirmButton]}
                          onPress={() => handleStatusUpdate(appointment.id, 'confirmed')}
                          disabled={updating === appointment.id}
                        >
                          {updating === appointment.id ? (
                            <ActivityIndicator size="small" color={theme.colors.background} />
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
                            <ActivityIndicator size="small" color={theme.colors.background} />
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
                          <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={20} color={theme.colors.background} />
                            <Text style={styles.actionButtonText}>Tamamlayın</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
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
    gap: theme.spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  customerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  customerName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  serviceName: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  appointmentDetails: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  appointmentActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  price: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    ...theme.typography.bodySmall,
    color: theme.colors.background,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  confirmButton: {
    backgroundColor: theme.colors.success,
  },
  cancelButton: {
    backgroundColor: theme.colors.destructive,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
  },
}); 
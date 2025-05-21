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
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

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
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  createdAt: any;
  customerName?: string;
  customerPhone?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

export default function EmployeeAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        Alert.alert('Hata', 'Lütfen önce giriş yapın');
        router.replace('/login');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        Alert.alert('Hata', 'Kullanıcı bilgileri bulunamadı');
        router.replace('/login');
        return;
      }

      const userData = userDoc.data() as UserData;
      if (userData?.role !== 'employee') {
        Alert.alert('Hata', 'Bu sayfaya erişim yetkiniz yok');
        router.replace('/');
        return;
      }

      fetchAppointments();
    };

    checkAuth();
  }, []);

  const fetchAppointments = async () => {
    if (!auth.currentUser) return;

    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('employeeId', '==', auth.currentUser.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const appointments = await Promise.all(
        appointmentsSnapshot.docs.map(async (appointmentDoc) => {
          const appointmentData = appointmentDoc.data() as Appointment;
          
          const userRef = doc(db, 'users', appointmentData.userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as UserData;

          return {
            ...appointmentData,
            id: appointmentDoc.id,
            customerName: userData?.firstName + ' ' + userData?.lastName,
            customerPhone: userData?.phone
          };
        })
      );

      appointments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentStatus = async (appointmentId: string, status: 'confirmed' | 'rejected' | 'completed') => {
    if (!auth.currentUser) return;

    try {
      setUpdating(appointmentId);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status,
        updatedAt: new Date().toISOString()
      });

      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );

      Alert.alert('Başarılı', `Randevu ${status === 'confirmed' ? 'onaylandı' : status === 'rejected' ? 'reddedildi' : 'tamamlandı'}`);
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
      case 'rejected':
        return theme.colors.destructive;
      case 'completed':
        return theme.colors.primary;
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
      case 'rejected':
        return 'Reddedildi';
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
        <Text style={styles.headerTitle}>Randevular</Text>
      </View>

      <ScrollView style={styles.content}>
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.textSecondary} />
            </View>
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
                      <Text style={styles.customerName}>{appointment.customerName}</Text>
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
                          onPress={() => handleAppointmentStatus(appointment.id, 'confirmed')}
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
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleAppointmentStatus(appointment.id, 'rejected')}
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
                        onPress={() => handleAppointmentStatus(appointment.id, 'completed')}
                        disabled={updating === appointment.id}
                      >
                        {updating === appointment.id ? (
                          <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={20} color={theme.colors.background} />
                            <Text style={styles.actionButtonText}>Tamamlandı</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
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
  rejectButton: {
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
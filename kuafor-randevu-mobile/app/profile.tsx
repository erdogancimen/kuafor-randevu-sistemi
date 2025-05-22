import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import NotificationList from '@/components/NotificationList';

interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoURL: string;
}

interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  employeeId: string;
  barberName: string;
  employeeName: string;
  service: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  createdAt: any;
}

interface Statistics {
  totalAppointments: number;
  monthlyAppointments: number;
  lastAppointment: {
    date: string;
    service: string;
  } | null;
}

export default function CustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalAppointments: 0,
    monthlyAppointments: 0,
    lastAppointment: null
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'customer') {
          const userData = userDoc.data();
          const defaultProfile: CustomerProfile = {
            name: userData.name || userData.displayName || '',
            email: userData.email || auth.currentUser.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            photoURL: userData.photoURL || require('@/assets/images/default-customer.jpg')
          };
          setProfile(defaultProfile);

          // Fetch recent appointments
          const appointmentsRef = collection(db, 'appointments');
          const q = query(
            appointmentsRef,
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(3)
          );

          const querySnapshot = await getDocs(q);
          const appointmentsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Appointment[];

          setRecentAppointments(appointmentsData);

          // Fetch all appointments for statistics
          const allAppointmentsQuery = query(
            appointmentsRef,
            where('userId', '==', auth.currentUser.uid)
          );
          const allAppointmentsSnapshot = await getDocs(allAppointmentsQuery);
          const allAppointments = allAppointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Appointment[];

          // Calculate statistics
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const monthlyAppointments = allAppointments.filter(appointment => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate >= firstDayOfMonth;
          }).length;

          const lastAppointment = allAppointments.length > 0 
            ? {
                date: allAppointments[0].date,
                service: allAppointments[0].serviceName || allAppointments[0].service
              }
            : null;

          setStatistics({
            totalAppointments: allAppointments.length,
            monthlyAppointments,
            lastAppointment
          });

        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/');
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        ...profile,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof CustomerProfile, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'confirmed':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.destructive;
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

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuItemPress = (route: string) => {
    setShowMenu(false);
    router.push(route);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profil bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilim</Text>
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menü</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowNotifications(true);
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Bildirimler</Text>
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('/')}
          >
              <Ionicons name="home-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Anasayfa</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('/appointments')}
            >
              <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Randevularım</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutButton]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.colors.destructive} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <Image
                source={profile.photoURL.startsWith('http') ? { uri: profile.photoURL } : require('@/assets/images/default-customer.jpg')}
                style={styles.profileImage}
              />
            </View>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileRole}>Müşteri</Text>

            {editing ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ad Soyad</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.name}
                    onChangeText={(text) => handleProfileChange('name', text)}
                    placeholder="Ad Soyad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Telefon</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.phone}
                    onChangeText={(text) => handleProfileChange('phone', text)}
                    placeholder="Telefon"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Adres</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={profile.address}
                    onChangeText={(text) => handleProfileChange('address', text)}
                    placeholder="Adres"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleUpdateProfile}
                  >
                    <Text style={styles.saveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{profile.address}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{profile.phone}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.infoText}>{profile.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.editProfileButtonText}>Profili Düzenle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Sağ Taraf - Randevular ve İstatistikler */}
        <View style={styles.mainSection}>
          {/* Randevular */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Randevular</Text>
              <TouchableOpacity onPress={() => router.push('/appointments')}>
                <Text style={styles.seeAllButton}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {recentAppointments.length === 0 ? (
              <Text style={styles.emptyText}>Henüz randevunuz bulunmuyor.</Text>
            ) : (
              <View style={styles.appointmentsList}>
                {recentAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentBarber}>{appointment.barberName}</Text>
                      <Text style={styles.appointmentDate}>
                        {new Date(appointment.date).toLocaleDateString('tr-TR')} - {appointment.time}
                      </Text>
                      <Text style={styles.appointmentService}>{appointment.serviceName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* İstatistikler */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statTitle}>Toplam Randevu</Text>
              </View>
              <Text style={styles.statValue}>{statistics.totalAppointments}</Text>
              <Text style={styles.statSubtext}>
                Bu ay {statistics.monthlyAppointments} randevu
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statTitle}>Son Randevu</Text>
              </View>
              {statistics.lastAppointment ? (
                <>
                  <Text style={styles.statValue}>
                    {new Date(statistics.lastAppointment.date).toLocaleDateString('tr-TR')}
                  </Text>
                  <Text style={styles.statSubtext}>
                    {statistics.lastAppointment.service}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statSubtext}>Henüz randevu yok</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {auth.currentUser && (
        <NotificationList
          userId={auth.currentUser.uid}
          isVisible={showNotifications}
          onClose={() => setShowNotifications(false)}
          onNotificationCountChange={setNotificationCount}
        />
      )}
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
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  menuButton: {
    padding: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '80%',
    height: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  menuTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  menuItemText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.destructive,
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
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    marginBottom: theme.spacing.xl,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  profileRole: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  profileInfo: {
    width: '100%',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  editProfileButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  editProfileButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryForeground,
  },
  editForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  button: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryForeground,
  },
  mainSection: {
    gap: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  seeAllButton: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  appointmentsList: {
    gap: theme.spacing.md,
  },
  appointmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentBarber: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  appointmentDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  appointmentService: {
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
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statSubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  notificationBadge: {
    position: 'absolute',
    right: theme.spacing.md,
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
}); 
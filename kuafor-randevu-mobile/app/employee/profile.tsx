import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, updateProfile, signOut, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { EmailAuthProvider } from 'firebase/auth';
import NotificationList from '@/components/NotificationList';
import { Calendar } from 'react-native-calendars';

interface EmployeeProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  workingHours: string;
  photoURL: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

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

const DAYS = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar'
];

const DEFAULT_WORKING_HOURS: WorkingHours[] = DAYS.map(day => ({
  day,
  isOpen: day !== 'Pazar',
  openTime: '09:00',
  closeTime: '18:00'
}));

export default function EmployeeProfileScreen() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    duration: 30,
    price: 0
  });
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>(DEFAULT_WORKING_HOURS);
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    fetchProfile();
    fetchServices();
    fetchWorkingHours();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchTodayAppointments();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      setMarkedDates({
        [selectedDate]: {
          selected: true,
          selectedColor: theme.colors.primary,
        },
      });
    }
  }, [selectedDate]);

  const fetchProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const docRef = doc(getFirestore(), 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().role === 'employee') {
        const userData = docSnap.data();
        setProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          workingHours: userData.workingHours || '',
          photoURL: userData.photoURL || user.photoURL || require('@/assets/images/default-customer.jpg')
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

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const servicesRef = collection(getFirestore(), 'services');
      const q = query(servicesRef, where('employeeId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];

      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Hata', 'Hizmetler yüklenirken bir hata oluştu');
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(getFirestore(), 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.workingHours && Array.isArray(data.workingHours)) {
          setWorkingHours(data.workingHours);
        }
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
      Alert.alert('Hata', 'Çalışma saatleri yüklenirken bir hata oluştu');
    }
  };

  const fetchTodayAppointments = async () => {
    if (!auth.currentUser) return;

    try {
      const appointmentsQuery = query(
        collection(getFirestore(), 'appointments'),
        where('employeeId', '==', auth.currentUser.uid),
        where('date', '==', selectedDate),
        where('status', 'in', ['pending', 'confirmed'])
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const appointments = await Promise.all(
        appointmentsSnapshot.docs.map(async (appointmentDoc) => {
          const appointmentData = appointmentDoc.data() as Appointment;
          
          // Müşteri bilgilerini getir
          const userRef = doc(getFirestore(), 'users', appointmentData.userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();

          return {
            ...appointmentData,
            id: appointmentDoc.id,
            customerName: userData?.firstName + ' ' + userData?.lastName,
            customerPhone: userData?.phone
          };
        })
      );

      setTodayAppointments(appointments);
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      Alert.alert('Başarılı', 'Başarıyla çıkış yapıldı');
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    setPasswordError(null);
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Şifre güncelleme kontrolü
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordError('Yeni şifreler eşleşmiyor');
          setLoading(false);
          return;
        }

        if (passwordData.newPassword.length < 6) {
          setPasswordError('Şifre en az 6 karakter olmalıdır');
          setLoading(false);
          return;
        }

        // Mevcut şifreyi kontrol et ve yeni şifreyi güncelle
        try {
          const credential = EmailAuthProvider.credential(
            user.email!,
            passwordData.currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, passwordData.newPassword);
        } catch (error) {
          setPasswordError('Mevcut şifre yanlış');
          setLoading(false);
          return;
        }
      }

      await updateProfile(user, {
        displayName: `${profile.firstName} ${profile.lastName}`
      });

      const docRef = doc(getFirestore(), 'users', user.uid);
      await updateDoc(docRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        workingHours: profile.workingHours,
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
      setEditingProfile(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const servicesRef = collection(getFirestore(), 'services');
      await addDoc(servicesRef, {
        ...newService,
        employeeId: user.uid,
        createdAt: new Date().toISOString()
      });

      Alert.alert('Başarılı', 'Hizmet başarıyla eklendi');
      setIsAddingService(false);
      setNewService({ name: '', duration: 30, price: 0 });
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      Alert.alert('Hata', 'Hizmet eklenirken bir hata oluştu');
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    try {
      const serviceRef = doc(getFirestore(), 'services', editingService.id);
      await updateDoc(serviceRef, {
        name: editingService.name,
        duration: editingService.duration,
        price: editingService.price,
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Başarılı', 'Hizmet başarıyla güncellendi');
      setEditingService(null);
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Hata', 'Hizmet güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    Alert.alert(
      'Hizmeti Sil',
      'Bu hizmeti silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(getFirestore(), 'services', serviceId));
              Alert.alert('Başarılı', 'Hizmet başarıyla silindi');
              fetchServices();
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Hata', 'Hizmet silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const handleUpdateWorkingHours = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const docRef = doc(getFirestore(), 'users', user.uid);
      await updateDoc(docRef, {
        workingHours,
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Başarılı', 'Çalışma saatleri başarıyla güncellendi');
      setEditingWorkingHours(false);
    } catch (error) {
      console.error('Error updating working hours:', error);
      Alert.alert('Hata', 'Çalışma saatleri güncellenirken bir hata oluştu');
    }
  };

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNotificationsPress = () => {
    setShowNotifications(true);
  };

  const generateTimeSlots = (startTime: string, endTime: string, interval: number = 30) => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0);
    
    const endDateTime = new Date();
    endDateTime.setHours(endHour, endMinute, 0);
    
    while (currentTime < endDateTime) {
      slots.push(
        currentTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      );
      currentTime.setMinutes(currentTime.getMinutes() + interval);
    }
    
    return slots;
  };

  const isTimeSlotOccupied = (time: string, appointments: Appointment[]) => {
    const [hour, minute] = time.split(':').map(Number);
    const slotStartTime = hour * 60 + minute;

    return appointments.some(appointment => {
      const [appHour, appMinute] = appointment.time.split(':').map(Number);
      const appStartTime = appHour * 60 + appMinute;
      const appEndTime = appStartTime + appointment.duration;

      return slotStartTime >= appStartTime && slotStartTime < appEndTime;
    });
  };

  const getAppointmentForTimeSlot = (time: string, appointments: Appointment[]) => {
    const [hour, minute] = time.split(':').map(Number);
    const slotStartTime = hour * 60 + minute;

    return appointments.find(appointment => {
      const [appHour, appMinute] = appointment.time.split(':').map(Number);
      const appStartTime = appHour * 60 + appMinute;
      const appEndTime = appStartTime + appointment.duration;

      return slotStartTime >= appStartTime && slotStartTime < appEndTime;
    });
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
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profil bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Çalışan Profili</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNotificationsPress} style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
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
                router.push('/');
              }}
            >
              <Ionicons name="home-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Anasayfa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/employee/appointments');
              }}
            >
              <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Randevular</Text>
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
        {/* Profil Bilgileri */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={typeof profile.photoURL === 'string' ? { uri: profile.photoURL } : profile.photoURL}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text style={styles.profileRole}>Çalışan</Text>
            </View>
          </View>

          {editingProfile ? (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Ad"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={profile.firstName}
                  onChangeText={(text) => setProfile({ ...profile, firstName: text })}
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Soyad"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={profile.lastName}
                  onChangeText={(text) => setProfile({ ...profile, lastName: text })}
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={profile.phone}
                  onChangeText={(text) => setProfile({ ...profile, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Çalışma Saatleri"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={profile.workingHours}
                  onChangeText={(text) => setProfile({ ...profile, workingHours: text })}
                />
              </View>

              <Text style={styles.sectionTitle}>Şifre Güncelle</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Mevcut Şifre"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => handlePasswordChange('currentPassword', text)}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={passwordData.newPassword}
                  onChangeText={(text) => handlePasswordChange('newPassword', text)}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Yeni Şifre (Tekrar)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => handlePasswordChange('confirmPassword', text)}
                  secureTextEntry
                />
              </View>
              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setEditingProfile(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setPasswordError(null);
                  }}
                >
                  <Text style={styles.buttonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleUpdateProfile}
                >
                  <Text style={[styles.buttonText, styles.saveButtonText]}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{profile.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{profile.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{profile.workingHours}</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditingProfile(true)}
              >
                <Text style={styles.editButtonText}>Profili Düzenle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bugünkü Randevular */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>Bugünkü Randevular</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/employee/appointments')}
            >
              <Text style={styles.viewAllButtonText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {/* Tarih Seçici */}
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowCalendar(true)}
          >
            <Text style={styles.dateInputText}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Tarih seçin'}
            </Text>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Takvim Modal */}
          <Modal
            visible={showCalendar}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCalendar(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.calendarModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tarih Seçin</Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <Calendar
                  onDayPress={(day: { dateString: string }) => {
                    setSelectedDate(day.dateString);
                    setShowCalendar(false);
                  }}
                  markedDates={markedDates}
                  minDate={new Date().toISOString().split('T')[0]}
                  theme={{
                    todayTextColor: theme.colors.primary,
                    selectedDayBackgroundColor: theme.colors.primary,
                    selectedDayTextColor: '#ffffff',
                    arrowColor: theme.colors.primary,
                  }}
                />
              </View>
            </View>
          </Modal>

          {/* Saatlik Randevu Listesi */}
          <View style={styles.timeSlotsContainer}>
            {(() => {
              const today = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
              const currentWorkingHours = workingHours.find((h: WorkingHours) => h.day === today) || { isOpen: true, openTime: '09:00', closeTime: '18:00' };
              
              if (!currentWorkingHours.isOpen) {
                return (
                  <View style={styles.closedMessage}>
                    <Text style={styles.closedMessageText}>Bugün kapalı</Text>
                  </View>
                );
              }

              const timeSlots = generateTimeSlots(currentWorkingHours.openTime, currentWorkingHours.closeTime, 30);
              
              return (
                <View style={styles.timeSlotsGrid}>
                  {timeSlots.map((time) => {
                    const isOccupied = isTimeSlotOccupied(time, todayAppointments);
                    const appointment = getAppointmentForTimeSlot(time, todayAppointments);
                    const isExactTime = appointment?.time === time;
                    
                    return (
                      <TouchableOpacity
                        key={time}
                        style={styles.timeSlotCard}
                        onPress={() => {
                          if (isOccupied) {
                            router.push('/employee/appointments');
                          }
                        }}
                        disabled={!isOccupied}
                      >
                        <View style={styles.timeSlotHeader}>
                          <Text style={styles.timeSlotTime}>{time}</Text>
                          {appointment && (
                            <View style={[
                              styles.appointmentStatus,
                              appointment.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
                            ]}>
                              <Text style={styles.appointmentStatusText}>
                                {appointment.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {isOccupied ? (
                          <View style={styles.appointmentContent}>
                            <View style={styles.appointmentInfo}>
                              <Text style={styles.customerName}>{appointment?.customerName || 'Müşteri'}</Text>
                              <Text style={styles.serviceName}>
                                {isExactTime ? appointment?.service : 'Devam eden hizmet'}
                              </Text>
                            </View>
                            <View style={styles.appointmentDuration}>
                              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                              <Text style={styles.durationText}>{appointment?.duration || 0} dk</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.emptySlot}>
                            <Text style={styles.emptySlotText}>Boş</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Hizmetler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="cut-outline" size={24} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>Hizmetlerim</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsAddingService(true)}
            >
              <Ionicons name="add" size={24} color={theme.colors.background} />
            </TouchableOpacity>
          </View>

          {(isAddingService || editingService) && (
            <View style={styles.serviceForm}>
              <TextInput
                style={styles.input}
                placeholder="Hizmet Adı"
                placeholderTextColor={theme.colors.textSecondary}
                value={isAddingService ? newService.name : editingService?.name}
                onChangeText={(text) => isAddingService 
                  ? setNewService({ ...newService, name: text })
                  : setEditingService({ ...editingService!, name: text })
                }
              />
              <View style={styles.serviceFormRow}>
                <View style={styles.serviceFormInput}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.serviceInput]}
                    placeholder="Süre (dk)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={isAddingService ? newService.duration.toString() : editingService?.duration.toString()}
                    onChangeText={(text) => isAddingService
                      ? setNewService({ ...newService, duration: parseInt(text) || 0 })
                      : setEditingService({ ...editingService!, duration: parseInt(text) || 0 })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.serviceFormInput}>
                  <Text style={styles.currencySymbol}>₺</Text>
                  <TextInput
                    style={[styles.input, styles.serviceInput]}
                    placeholder="Fiyat"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={isAddingService ? newService.price.toString() : editingService?.price.toString()}
                    onChangeText={(text) => isAddingService
                      ? setNewService({ ...newService, price: parseInt(text) || 0 })
                      : setEditingService({ ...editingService!, price: parseInt(text) || 0 })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsAddingService(false);
                    setEditingService(null);
                    setNewService({ name: '', duration: 30, price: 0 });
                  }}
                >
                  <Text style={styles.buttonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={isAddingService ? handleAddService : handleUpdateService}
                >
                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                    {isAddingService ? 'Hizmet Ekle' : 'Değişiklikleri Kaydet'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.servicesList}>
            {services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity
                      onPress={() => setEditingService(service)}
                      style={styles.serviceActionButton}
                    >
                      <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteService(service.id)}
                      style={styles.serviceActionButton}
                    >
                      <Ionicons name="trash" size={20} color={theme.colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.serviceDetails}>
                  <View style={styles.serviceDetail}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.serviceDetailText}>{service.duration} dk</Text>
                  </View>
                  <Text style={styles.servicePrice}>{service.price} ₺</Text>
                </View>
              </View>
            ))}
            {services.length === 0 && (
              <Text style={styles.emptyText}>
                Henüz hizmet eklenmemiş. Yeni bir hizmet eklemek için "+" butonuna tıklayın.
              </Text>
            )}
          </View>
        </View>

        {/* Çalışma Saatleri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={24} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditingWorkingHours(!editingWorkingHours)}
            >
              <Text style={styles.editButtonText}>
                {editingWorkingHours ? 'Kaydet' : 'Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.workingHoursList}>
            {workingHours.map((day) => (
              <View key={day.day} style={styles.workingHoursItem}>
                <View style={styles.workingHoursHeader}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => {
                      if (editingWorkingHours) {
                        const newHours = workingHours.map(h => 
                          h.day === day.day ? { ...h, isOpen: !h.isOpen } : h
                        );
                        setWorkingHours(newHours);
                      }
                    }}
                  >
                    <Ionicons
                      name={day.isOpen ? "checkbox" : "square-outline"}
                      size={24}
                      color={editingWorkingHours ? theme.colors.primary : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.workingHoursDay}>{day.day}</Text>
                </View>
                {day.isOpen ? (
                  <View style={styles.workingHoursTime}>
                    <TextInput
                      style={styles.timeInput}
                      value={day.openTime}
                      onChangeText={(text) => {
                        if (editingWorkingHours) {
                          const newHours = workingHours.map(h => 
                            h.day === day.day ? { ...h, openTime: text } : h
                          );
                          setWorkingHours(newHours);
                        }
                      }}
                      editable={editingWorkingHours}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={day.closeTime}
                      onChangeText={(text) => {
                        if (editingWorkingHours) {
                          const newHours = workingHours.map(h => 
                            h.day === day.day ? { ...h, closeTime: text } : h
                          );
                          setWorkingHours(newHours);
                        }
                      }}
                      editable={editingWorkingHours}
                    />
                  </View>
                ) : (
                  <Text style={styles.closedText}>Kapalı</Text>
                )}
              </View>
            ))}
          </View>

          {editingWorkingHours && (
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEditingWorkingHours(false);
                  fetchWorkingHours();
                }}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateWorkingHours}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  menuButton: {
    padding: theme.spacing.sm,
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.destructive,
  },
  profileSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  profileRole: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  profileDetails: {
    gap: theme.spacing.md,
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
  editForm: {
    gap: theme.spacing.md,
    width: '100%',
    padding: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    width: '100%',
  },
  input: {
    flex: 1,
    marginLeft: theme.spacing.md,
    ...theme.typography.body,
    width: '100%',
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  button: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  saveButtonText: {
    color: theme.colors.background,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  editButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
  },
  section: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  viewAllButton: {
    padding: theme.spacing.sm,
  },
  viewAllButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  appointmentsList: {
    gap: theme.spacing.md,
  },
  appointmentCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  appointmentCustomer: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  appointmentTimeText: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  appointmentDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  durationText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.bodySmall.fontWeight,
    color: theme.colors.textSecondary,
  },
  serviceForm: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceFormRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  serviceFormInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceInput: {
    flex: 1,
    borderWidth: 0,
    padding: 0,
    marginLeft: theme.spacing.sm,
  },
  currencySymbol: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  servicesList: {
    gap: theme.spacing.md,
  },
  serviceCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  serviceName: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  serviceActionButton: {
    padding: theme.spacing.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  serviceDetailText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  servicePrice: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  workingHoursList: {
    gap: theme.spacing.md,
  },
  workingHoursItem: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workingHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    padding: theme.spacing.xs,
  },
  workingHoursDay: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  workingHoursTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    textAlign: 'center',
  },
  timeSeparator: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  closedText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateInputText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  calendarModal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  timeSlotsContainer: {
    marginTop: theme.spacing.md,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  timeSlotCard: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timeSlotTime: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight,
    color: theme.colors.text,
  },
  appointmentStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusConfirmed: {
    backgroundColor: theme.colors.success,
  },
  statusPending: {
    backgroundColor: theme.colors.warning,
  },
  appointmentStatusText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.bodySmall.fontWeight,
    color: theme.colors.primaryForeground,
  },
  appointmentContent: {
    gap: theme.spacing.xs,
  },
  customerName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySlot: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  emptySlotText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
    color: theme.colors.textSecondary,
  },
  closedMessage: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  closedMessageText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
    color: theme.colors.error,
  },
}); 
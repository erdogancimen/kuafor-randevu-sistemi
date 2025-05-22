import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Button } from '@/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import NotificationList from '@/components/NotificationList';
import { Calendar } from 'react-native-calendars';

const defaultImage = require('@/assets/images/default.jpg');

interface BarberProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  workingHours: {
    [key: string]: { start: string; end: string; isClosed?: boolean };
  };
  services: {
    name: string;
    price: number;
    duration: number;
  }[];
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
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  createdAt: any;
  customerName?: string;
}

interface Statistics {
  totalCustomers: number;
  todayAppointments: number;
  completedTodayAppointments: number;
  monthlyServices: number;
  lastMonthServices: number;
  averageDuration: number;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
}

export default function BarberProfileScreen() {
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingServices, setEditingServices] = useState(false);
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMenu, setShowMenu] = useState(false);
  const [statistics, setStatistics] = useState<Statistics>({
    totalCustomers: 0,
    todayAppointments: 0,
    completedTodayAppointments: 0,
    monthlyServices: 0,
    lastMonthServices: 0,
    averageDuration: 0
  });
  const router = useRouter();
  const auth = getAuth();
  const [editedProfile, setEditedProfile] = useState<BarberProfile | null>(null);
  const [editedServices, setEditedServices] = useState<BarberProfile['services']>([]);
  const [editedWorkingHours, setEditedWorkingHours] = useState<BarberProfile['workingHours']>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // Varsayılan çalışma saatleri
  const defaultWorkingHours = {
    'Pazartesi': { start: '09:00', end: '18:00', isClosed: false },
    'Salı': { start: '09:00', end: '18:00', isClosed: false },
    'Çarşamba': { start: '09:00', end: '18:00', isClosed: false },
    'Perşembe': { start: '09:00', end: '18:00', isClosed: false },
    'Cuma': { start: '09:00', end: '18:00', isClosed: false },
    'Cumartesi': { start: '10:00', end: '16:00', isClosed: false },
    'Pazar': { start: '00:00', end: '00:00', isClosed: true }
  };

  useEffect(() => {
    fetchBarberProfile();
  }, [selectedDate]);

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
      setEditedServices(profile.services);
      setEditedWorkingHours(profile.workingHours);
    }
  }, [profile]);

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
        const userData = barberDoc.data();
        const defaultProfile: BarberProfile = {
          name: userData.name || user.displayName || '',
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          workingHours: userData.workingHours || defaultWorkingHours,
          services: userData.services || [],
          photoURL: userData.photoURL || user.photoURL || '/images/default-barber.jpg'
        };
        setProfile(defaultProfile);

        // Randevuları getir
        await fetchAppointments(user.uid);

        // İstatistikleri getir
        await fetchStatistics(user.uid);
      }
    } catch (error) {
      console.error('Error fetching barber profile:', error);
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (barberId: string) => {
    try {
      const db = getFirestore();
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('employeeId', '==', barberId),
        where('date', '==', selectedDate),
        where('status', 'in', ['pending', 'confirmed'])
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const appointmentData = docSnapshot.data();
          
          // Müşteri bilgilerini getir
          const userRef = doc(db, 'users', appointmentData.userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as UserData | undefined;
          
          return {
            id: docSnapshot.id,
            ...appointmentData,
            customerName: userData ? `${userData.firstName} ${userData.lastName}` : 'Bilinmeyen Müşteri'
          } as Appointment;
        })
      );
      
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu');
    }
  };

  const fetchStatistics = async (barberId: string) => {
    try {
      const db = getFirestore();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const allAppointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];

      const uniqueCustomers = new Set(allAppointments.map(app => app.userId));
      
      const todayAppointments = allAppointments.filter(app => {
        const appointmentDate = new Date(app.date);
        return appointmentDate >= today;
      });

      const completedTodayAppointments = todayAppointments.filter(
        app => app.status === 'completed'
      );

      const monthlyServices = allAppointments.filter(app => {
        const appointmentDate = new Date(app.date);
        return appointmentDate >= firstDayOfMonth;
      });

      const lastMonthServices = allAppointments.filter(app => {
        const appointmentDate = new Date(app.date);
        return appointmentDate >= firstDayOfLastMonth && appointmentDate <= lastDayOfLastMonth;
      });

      const totalDuration = allAppointments.reduce((sum, app) => sum + (app.duration || 0), 0);
      const averageDuration = allAppointments.length > 0 
        ? Math.round(totalDuration / allAppointments.length) 
        : 0;

      setStatistics({
        totalCustomers: uniqueCustomers.size,
        todayAppointments: todayAppointments.length,
        completedTodayAppointments: completedTodayAppointments.length,
        monthlyServices: monthlyServices.length,
        lastMonthServices: lastMonthServices.length,
        averageDuration
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      Alert.alert('Hata', 'İstatistikler yüklenirken bir hata oluştu');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNotificationsPress = () => {
    router.push('/notifications');
  };

  const handleMenuItemPress = (route: string) => {
    setShowMenu(false);
    router.push(route);
  };

  const handleProfileSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        name: editedProfile?.name,
        email: editedProfile?.email,
        phone: editedProfile?.phone,
        address: editedProfile?.address,
      });

      setEditingProfile(false);
      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil bilgileri güncellenirken bir hata oluştu');
    }
  };

  const handleServicesSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        services: editedServices,
      });

      setEditingServices(false);
      Alert.alert('Başarılı', 'Hizmetler güncellendi');
    } catch (error) {
      console.error('Error updating services:', error);
      Alert.alert('Hata', 'Hizmetler güncellenirken bir hata oluştu');
    }
  };

  const handleWorkingHoursSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        workingHours: editedWorkingHours,
      });

      setEditingWorkingHours(false);
      Alert.alert('Başarılı', 'Çalışma saatleri güncellendi');
    } catch (error) {
      console.error('Error updating working hours:', error);
      Alert.alert('Hata', 'Çalışma saatleri güncellenirken bir hata oluştu');
    }
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
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kuaför Profili</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.notificationButton}>
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
              onPress={() => handleMenuItemPress('/')}
            >
              <Ionicons name="home-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Anasayfa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('/barber/appointments')}
            >
              <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Randevular</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('/barber/reviews')}
            >
              <Ionicons name="star-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Değerlendirmeler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('/barber/employees')}
            >
              <Ionicons name="people-outline" size={24} color={theme.colors.text} />
              <Text style={styles.menuItemText}>Çalışanlar</Text>
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

      <ScrollView style={styles.scrollView}>
        {/* Profil Resmi ve İsim */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={defaultImage}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editImageButton}>
              <Ionicons name="camera" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileRole}>Kuaför</Text>
        </View>

        {/* Profil Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditingProfile(!editingProfile)}
            >
              <Text style={styles.editButtonText}>
                {editingProfile ? 'İptal' : 'Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
            {editingProfile ? (
              <>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile?.email}
                    onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, email: text} : null)}
                    placeholder="E-posta"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile?.phone}
                    onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, phone: text} : null)}
                    placeholder="Telefon"
                  />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={editedProfile?.address}
                    onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, address: text} : null)}
                    placeholder="Adres"
                  />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleProfileSave}>
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
                  <Text style={styles.infoText}>{profile.address}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Randevular */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Randevular</Text>
            <TouchableOpacity onPress={() => router.push('/barber/appointments')}>
              <Text style={styles.seeAllButton}>Tümünü Gör</Text>
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
              const workingHours = profile.workingHours[today] || { start: '09:00', end: '18:00', isClosed: false };
              
              if (workingHours.isClosed) {
                return (
                  <View style={styles.closedMessage}>
                    <Text style={styles.closedMessageText}>Bugün kapalı</Text>
                  </View>
                );
              }

              const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 30);
              
              return (
                <View style={styles.timeSlotsGrid}>
                  {timeSlots.map((time) => {
                    const isOccupied = isTimeSlotOccupied(time, appointments);
                    const appointment = getAppointmentForTimeSlot(time, appointments);
                    const isExactTime = appointment?.time === time;
                    
                    return (
                      <TouchableOpacity
                        key={time}
                        style={styles.timeSlotCard}
                        onPress={() => {
                          if (isOccupied) {
                            router.push('/barber/appointments');
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
            <Text style={styles.sectionTitle}>Hizmetler</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditingServices(!editingServices)}
            >
              <Text style={styles.editButtonText}>
                {editingServices ? 'İptal' : 'Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.servicesContainer}>
            {editingServices ? (
              <>
                <View style={styles.servicesHeader}>
                  <Text style={styles.servicesHeaderText}>Hizmet Adı</Text>
                  <Text style={styles.servicesHeaderText}>Süre</Text>
                  <Text style={styles.servicesHeaderText}>Fiyat</Text>
                  <View style={styles.servicesHeaderAction} />
                </View>
                {editedServices.map((service, index) => (
                  <View key={index} style={styles.serviceEditCard}>
                    <TextInput
                      style={[styles.serviceInput, styles.serviceNameInput]}
                      value={service.name}
                      onChangeText={(text) => {
                        const newServices = [...editedServices];
                        newServices[index] = { ...service, name: text };
                        setEditedServices(newServices);
                      }}
                      placeholder="Hizmet adı"
                    />
                    <View style={styles.serviceTimeInput}>
                      <TextInput
                        style={styles.serviceInput}
                        value={service.duration.toString()}
                        onChangeText={(text) => {
                          const newServices = [...editedServices];
                          newServices[index] = { ...service, duration: parseInt(text) || 0 };
                          setEditedServices(newServices);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <Text style={styles.serviceTimeUnit}>dk</Text>
                    </View>
                    <View style={styles.servicePriceInput}>
                      <TextInput
                        style={styles.serviceInput}
                        value={service.price.toString()}
                        onChangeText={(text) => {
                          const newServices = [...editedServices];
                          newServices[index] = { ...service, price: parseInt(text) || 0 };
                          setEditedServices(newServices);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <Text style={styles.servicePriceUnit}>₺</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteServiceButton}
                      onPress={() => {
                        const newServices = editedServices.filter((_, i) => i !== index);
                        setEditedServices(newServices);
                      }}
                    >
                      <Ionicons name="trash-outline" size={24} color={theme.colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => setEditedServices([...editedServices, { name: '', price: 0, duration: 0 }])}
                >
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.addButtonText}>Yeni Hizmet Ekle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleServicesSave}>
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </>
            ) : (
              profile.services.map((service, index) => (
                <View key={index} style={styles.serviceCard}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceDetails}>
                    <View style={styles.serviceDetail}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.serviceDetailText}>{service.duration} dk</Text>
                    </View>
                    <Text style={styles.servicePrice}>{service.price} ₺</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Çalışma Saatleri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditingWorkingHours(!editingWorkingHours)}
            >
              <Text style={styles.editButtonText}>
                {editingWorkingHours ? 'İptal' : 'Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.workingHoursContainer}>
            {Object.entries(defaultWorkingHours).map(([day, defaultHours]) => {
              const hours = editingWorkingHours ? editedWorkingHours[day] || defaultHours : profile.workingHours[day] || defaultHours;
              return (
                <View key={day} style={styles.workingHourRow}>
                  <Text style={styles.workingHourDay}>{day}</Text>
                  {editingWorkingHours ? (
                    <View style={styles.workingHourEdit}>
                      <TouchableOpacity
                        style={styles.closedToggle}
                        onPress={() => {
                          const newHours = { ...editedWorkingHours };
                          newHours[day] = { ...hours, isClosed: !hours.isClosed };
                          setEditedWorkingHours(newHours);
                        }}
                      >
                        <Ionicons
                          name={hours.isClosed ? "close-circle" : "checkmark-circle"}
                          size={24}
                          color={hours.isClosed ? theme.colors.error : theme.colors.success}
                        />
                      </TouchableOpacity>
                      {!hours.isClosed && (
                        <View style={styles.timeInputs}>
                          <TextInput
                            style={styles.timeInput}
                            value={hours.start}
                            onChangeText={(text) => {
                              const newHours = { ...editedWorkingHours };
                              newHours[day] = { ...hours, start: text };
                              setEditedWorkingHours(newHours);
                            }}
                            placeholder="09:00"
                          />
                          <Text style={styles.timeSeparator}>-</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={hours.end}
                            onChangeText={(text) => {
                              const newHours = { ...editedWorkingHours };
                              newHours[day] = { ...hours, end: text };
                              setEditedWorkingHours(newHours);
                            }}
                            placeholder="18:00"
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    hours.isClosed ? (
                      <Text style={styles.closedText}>Kapalı</Text>
                    ) : (
                      <Text style={styles.workingHourTime}>
                        {hours.start} - {hours.end}
                      </Text>
                    )
                  )}
                </View>
              );
            })}
            {editingWorkingHours && (
              <TouchableOpacity style={styles.saveButton} onPress={handleWorkingHoursSave}>
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>İstatistikler</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{statistics.totalCustomers}</Text>
                <Text style={styles.statLabel}>Toplam Müşteri</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{statistics.todayAppointments}</Text>
                <Text style={styles.statLabel}>Bugünkü Randevu</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="cut-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{statistics.monthlyServices}</Text>
                <Text style={styles.statLabel}>Aylık Hizmet</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{statistics.averageDuration}dk</Text>
                <Text style={styles.statLabel}>Ortalama Süre</Text>
              </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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
  scrollView: {
    flex: 1,
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
  seeAllButton: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
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
  servicesContainer: {
    gap: theme.spacing.md,
  },
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  serviceName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  servicePrice: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  appointmentsContainer: {
    gap: theme.spacing.md,
  },
  appointmentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentInfo: {
    gap: theme.spacing.xs,
  },
  appointmentService: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  appointmentEmployee: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  appointmentTimeText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  appointmentDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAppointments: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  workingHoursContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  workingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  workingHourDay: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  workingHourTime: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  closedText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  profileRole: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  input: {
    flex: 1,
    marginLeft: theme.spacing.md,
    ...theme.typography.body,
  },
  serviceInput: {
    flex: 1,
    ...theme.typography.body,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  timeInput: {
    width: 80,
    ...theme.typography.body,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    textAlign: 'center',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSeparator: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.text,
  },
  workingHourEdit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closedToggle: {
    marginRight: theme.spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  addButtonText: {
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  servicesHeaderText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  servicesHeaderAction: {
    width: 40,
  },
  serviceEditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  serviceNameInput: {
    flex: 2,
  },
  serviceTimeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
  },
  servicePriceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
  },
  serviceTimeUnit: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  servicePriceUnit: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  deleteServiceButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  editButtonText: {
    ...theme.typography.body,
    color: theme.colors.primaryForeground,
    fontWeight: '600',
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
    backgroundColor: theme.colors.surface,
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
    ...theme.typography.h4,
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
    ...theme.typography.bodySmall,
    color: theme.colors.primaryForeground,
  },
  appointmentContent: {
    gap: theme.spacing.xs,
  },
  customerName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  durationText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  emptySlot: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  emptySlotText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  closedMessage: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  closedMessageText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
}); 
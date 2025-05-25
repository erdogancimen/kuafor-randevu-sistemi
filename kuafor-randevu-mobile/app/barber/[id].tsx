import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Calendar } from 'react-native-calendars';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  services?: {
    name: string;
    price: number;
    duration: number;
  }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  };
}

interface BarberStats {
  averageRating: number;
  totalReviews: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  services?: {
    name: string;
    price: number;
    duration: number;
  }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  };
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
}

interface Review {
  id: string;
  userId: string;
  service: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function BarberDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [barberStats, setBarberStats] = useState<BarberStats>({ averageRating: 0, totalReviews: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

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
    const fetchBarberAndEmployees = async () => {
      if (!params?.id) {
        Alert.alert('Hata', 'Kuaför ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        // Kuaför bilgilerini getir
        const barberRef = doc(db, 'users', params.id);
        const barberDoc = await getDoc(barberRef);
        
        if (barberDoc.exists()) {
          const barberData = { id: barberDoc.id, ...barberDoc.data() } as Barber;
          setBarber(barberData);

          // Değerlendirme istatistiklerini getir
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('barberId', '==', params.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          
          const reviews = reviewsSnapshot.docs.map(doc => doc.data());
          const totalReviews = reviews.length;
          const averageRating = totalReviews > 0
            ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / totalReviews
            : 0;

          setBarberStats({
            averageRating,
            totalReviews
          });

          // Çalışanları getir
          const employeesQuery = query(
            collection(db, 'users'),
            where('barberId', '==', params.id),
            where('role', '==', 'employee')
          );
          const employeesSnapshot = await getDocs(employeesQuery);
          
          const employeesData = await Promise.all(
            employeesSnapshot.docs.map(async (doc) => {
              const employeeData = doc.data();
              
              // Çalışanın hizmetlerini getir
              const servicesQuery = query(
                collection(db, 'services'),
                where('employeeId', '==', doc.id)
              );
              const servicesSnapshot = await getDocs(servicesQuery);
              const services = servicesSnapshot.docs.map(serviceDoc => ({
                ...serviceDoc.data()
              }));

              // Çalışma saatlerini doğru formata dönüştür
              let workingHours = {};
              if (typeof employeeData.workingHours === 'string') {
                const [start, end] = employeeData.workingHours.split('-');
                workingHours = {
                  'Pazartesi': { start, end, isClosed: false },
                  'Salı': { start, end, isClosed: false },
                  'Çarşamba': { start, end, isClosed: false },
                  'Perşembe': { start, end, isClosed: false },
                  'Cuma': { start, end, isClosed: false },
                  'Cumartesi': { start, end, isClosed: false },
                  'Pazar': { start: '00:00', end: '00:00', isClosed: true }
                };
              } else {
                workingHours = employeeData.workingHours || {};
              }

              return {
                id: doc.id,
                ...employeeData,
                services: services,
                workingHours: workingHours
              } as Employee;
            })
          );

          // Kuaför sahibini de çalışanlar listesine ekle
          let ownerWorkingHours = barberData.workingHours || {};
          if (typeof ownerWorkingHours === 'string') {
            const [start, end] = (ownerWorkingHours as string).split('-');
            ownerWorkingHours = {
              'Pazartesi': { start, end, isClosed: false },
              'Salı': { start, end, isClosed: false },
              'Çarşamba': { start, end, isClosed: false },
              'Perşembe': { start, end, isClosed: false },
              'Cuma': { start, end, isClosed: false },
              'Cumartesi': { start, end, isClosed: false },
              'Pazar': { start: '00:00', end: '00:00', isClosed: true }
            };
          }
          const allEmployees = [
            {
              id: barberData.id,
              firstName: barberData.firstName,
              lastName: barberData.lastName,
              services: barberData.services,
              workingHours: ownerWorkingHours
            },
            ...employeesData
          ];

          setEmployees(allEmployees);
        } else {
          Alert.alert('Hata', 'Kuaför bulunamadı');
        }

        // Değerlendirmeleri getir
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('barberId', '==', params.id),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        const reviewsData = await Promise.all(
          reviewsSnapshot.docs.map(async (reviewDoc) => {
            const reviewData = reviewDoc.data();
            return {
              id: reviewDoc.id,
              userId: reviewData.userId,
              service: reviewData.service || 'Bilinmeyen Hizmet',
              rating: reviewData.rating,
              comment: reviewData.comment,
              createdAt: reviewData.createdAt
            } as Review;
          })
        );

        setReviews(reviewsData);
        setReviewsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Hata', 'Bilgiler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchBarberAndEmployees();
  }, [params?.id]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!barber?.id || !selectedDate) return;

      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('barberId', '==', barber.id),
          where('date', '==', selectedDate),
          where('status', 'in', ['pending', 'confirmed'])
        );

        const querySnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setExistingAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu');
      }
    };

    fetchAppointments();
  }, [barber?.id, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !selectedEmployee || !selectedService) return;

    const selectedServiceData = selectedEmployee.services?.find(s => s.name === selectedService);
    if (!selectedServiceData || !selectedServiceData.duration) return;

    const dayOfWeek = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
    const workingHours = selectedEmployee.workingHours?.[dayOfWeek];

    if (!workingHours || workingHours.isClosed) {
      setAvailableSlots([]);
      return;
    }

    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const duration = selectedServiceData.duration;

    const slots: string[] = [];
    for (let time = startTime; time + duration <= endTime; time += 30) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Sadece onaylanmış ve bekleyen randevuları kontrol et
      const isAvailable = !existingAppointments.some(appointment => {
        // Sadece seçili çalışanın randevularını kontrol et
        if (appointment.employeeId !== selectedEmployee.id) return false;

        const [appHour, appMinute] = appointment.time.split(':').map(Number);
        const appStartTime = appHour * 60 + appMinute;
        const appEndTime = appStartTime + appointment.duration;
        const slotEndTime = time + duration;

        return (time >= appStartTime && time < appEndTime) ||
               (slotEndTime > appStartTime && slotEndTime <= appEndTime) ||
               (time <= appStartTime && slotEndTime >= appEndTime);
      });

      if (isAvailable) {
        slots.push(timeString);
      }
    }

    setAvailableSlots(slots);
  }, [selectedDate, selectedService, selectedEmployee, existingAppointments]);

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

  const handleBooking = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Giriş Gerekli',
        'Randevu oluşturmak için giriş yapmanız gerekmektedir.',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Giriş Yap',
            onPress: () => router.push('/login')
          }
        ]
      );
      return;
    }

    if (!selectedEmployee?.id) {
      Alert.alert('Hata', 'Lütfen bir çalışan seçin');
      return;
    }

    try {
      setBookingLoading(true);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        Alert.alert('Hata', 'Kullanıcı bilgileri bulunamadı');
        return;
      }

      const userData = userDoc.data();
      
      if (userData?.role === 'barber' || userData?.role === 'employee') {
        Alert.alert('Hata', 'Kuaförler ve çalışanlar randevu oluşturamaz');
        return;
      }

      const selectedServiceData = selectedEmployee.services?.find(s => s.name === selectedService);
      if (!selectedServiceData) {
        Alert.alert('Hata', 'Hizmet bilgileri bulunamadı');
        return;
      }
      
      const appointmentsRef = collection(db, 'appointments');
      await addDoc(appointmentsRef, {
        userId: auth.currentUser.uid,
        barberId: barber?.id,
        employeeId: selectedEmployee.id,
        barberName: `${barber?.firstName} ${barber?.lastName}`,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        price: selectedServiceData.price,
        duration: selectedServiceData.duration,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      Alert.alert('Başarılı', 'Randevu talebiniz başarıyla oluşturuldu');
      router.push('/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Hata', 'Randevu oluşturulurken bir hata oluştu');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleShowOnMap = () => {
    if (!barber?.latitude || !barber?.longitude) return;

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:'
    });
    const latLng = `${barber.latitude},${barber.longitude}`;
    const label = `${barber.firstName} ${barber.lastName}`;
    const url = Platform.select({
      ios: `${scheme}?q=${label}&ll=${latLng}`,
      android: `${scheme}?q=${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!barber) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kuaför bulunamadı</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.homeButtonText}>Anasayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={require('@/assets/images/default.jpg')}
          style={styles.heroBackground}
        />
        <View style={styles.heroContent}>
          <View style={styles.profileImageContainer}>
            <Image
              source={require('@/assets/images/default.jpg')}
              style={styles.profileImage}
            />
          </View>
          <View style={styles.barberInfo}>
            <Text style={styles.barberName}>
              {barber.firstName} {barber.lastName}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color={theme.colors.warning} />
              <Text style={styles.ratingText}>
                {barberStats.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.reviewCount}>
                ({barberStats.totalReviews} değerlendirme)
              </Text>
            </View>
            {barber.latitude && barber.longitude && (
              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleShowOnMap}
              >
                <Ionicons name="navigate" size={20} color={theme.colors.primary} />
                <Text style={styles.mapButtonText}>Haritada Göster</Text>
              </TouchableOpacity>
            )}
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{barber.address}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{barber.phone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{barber.email}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Çalışan Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çalışan Seçimi</Text>
          <Text style={styles.sectionDescription}>
            Randevu almak ve hizmetleri görmek için çalışan seçin
          </Text>
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => setShowEmployeePicker(true)}
          >
            <Text style={styles.pickerText}>
              {selectedEmployee
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} ${selectedEmployee.id === barber.id ? '(Kuaför Sahibi)' : ''}`
                : 'Çalışan seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <Modal
            visible={showEmployeePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEmployeePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Çalışan Seçin</Text>
                  <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  {employees.map((employee) => (
                    <TouchableOpacity
                      key={employee.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedEmployee(employee);
                        setShowEmployeePicker(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>
                        {employee.firstName} {employee.lastName}
                        {employee.id === barber.id ? ' (Kuaför Sahibi)' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>

        {/* Hizmetler */}
        {selectedEmployee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hizmetler</Text>
            {selectedEmployee.services && selectedEmployee.services.length > 0 ? (
              selectedEmployee.services.map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceCard,
                    selectedService === service.name && styles.selectedServiceCard
                  ]}
                  onPress={() => setSelectedService(service.name)}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceDetails}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.serviceDuration}>{service.duration} dakika</Text>
                    </View>
                  </View>
                  <Text style={styles.servicePrice}>{service.price} TL</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Bu çalışan için henüz hizmet eklenmemiş</Text>
            )}
          </View>
        )}

        {/* Randevu Al */}
        {selectedEmployee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Randevu Al</Text>
            <View style={styles.bookingForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tarih</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateInputText}>
                    {selectedDate || 'Tarih seçin'}
                  </Text>
                  <Ionicons name="calendar-outline" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>

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
                        firstDay={1}
                        monthFormat="MMMM yyyy"
                        dayNames={['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']}
                        monthNames={[
                          'Ocak',
                          'Şubat',
                          'Mart',
                          'Nisan',
                          'Mayıs',
                          'Haziran',
                          'Temmuz',
                          'Ağustos',
                          'Eylül',
                          'Ekim',
                          'Kasım',
                          'Aralık'
                        ]}
                      />
                    </View>
                  </View>
                </Modal>
              </View>

              {selectedDate && selectedService && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Müsait Saatler</Text>
                  <View style={styles.timeSlotsContainer}>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.timeSlot,
                            selectedTime === slot && styles.selectedTimeSlot
                          ]}
                          onPress={() => setSelectedTime(slot)}
                        >
                          <Text style={[
                            styles.timeSlotText,
                            selectedTime === slot && styles.selectedTimeSlotText
                          ]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>
                        {(() => {
                          const dayOfWeek = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
                          const isClosed = selectedEmployee?.workingHours?.[dayOfWeek]?.isClosed ?? true;
                          return isClosed ? 'Bu gün kapalıdır' : 'Bu tarihte müsait saat bulunmamaktadır';
                        })()}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.bookButton,
                  (!selectedEmployee || !selectedService || !selectedDate || !selectedTime || bookingLoading) && styles.bookButtonDisabled
                ]}
                onPress={handleBooking}
                disabled={!selectedEmployee || !selectedService || !selectedDate || !selectedTime || bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={styles.bookButtonText}>Randevu Oluştur</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Çalışma Saatleri */}
        {selectedEmployee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
            {Object.entries(defaultWorkingHours).map(([day, defaultHours]) => {
              const hours = selectedEmployee.workingHours?.[day] || defaultHours;
              return (
                <View key={day} style={styles.workingHoursCard}>
                  <Text style={styles.dayText}>{day}</Text>
                  <Text style={styles.hoursText}>
                    {hours.isClosed ? 'Kapalı' : `${hours.start} - ${hours.end}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Değerlendirmeler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
          {reviewsLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewService}>
                    <Ionicons name="cut-outline" size={24} color={theme.colors.textSecondary} />
                    <Text style={styles.reviewServiceName}>{review.service}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={16} color={theme.colors.warning} />
                    <Text style={styles.reviewRatingText}>{review.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {review.createdAt?.toDate().toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz değerlendirme yapılmamış</Text>
          )}
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
    ...theme.typography.h2,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  homeButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  heroSection: {
    position: 'relative',
    backgroundColor: theme.colors.surface,
    paddingBottom: theme.spacing.xl,
  },
  heroBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  heroContent: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  barberInfo: {
    width: '100%',
    alignItems: 'center',
  },
  barberName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  ratingText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  reviewCount: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  infoContainer: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    justifyContent: 'center',
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  pickerText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  modalList: {
    padding: theme.spacing.md,
  },
  modalItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalItemText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDuration: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  servicePrice: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  workingHoursCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  dayText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  hoursText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  selectedServiceCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primary + '20',
  },
  bookingForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
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
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedTimeSlot: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeSlotText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  selectedTimeSlotText: {
    color: theme.colors.background,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reviewService: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewServiceName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  reviewComment: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  reviewDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    alignSelf: 'center',
  },
  mapButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '500',
  },
}); 
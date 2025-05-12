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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';

interface BarberProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'barber';
  address: string;
  barberType: string;
  workingHours: {
    [key: string]: { start: string; end: string; isClosed?: boolean };
  };
  services: Array<{
    name: string;
    price: number;
    duration: number;
  }>;
  rating?: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingServices, setEditingServices] = useState(false);
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    price: 0,
    duration: 30
  });
  const router = useRouter();

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
    const checkAuth = async () => {
      if (!auth.currentUser) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'barber') {
          const userData = userDoc.data();
          // Firestore verilerini kullanarak profil oluştur
          const barberProfile: BarberProfile = {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || auth.currentUser.email || '',
            phone: userData.phone || '',
            role: 'barber',
            address: userData.address || '',
            barberType: userData.barberType || 'male',
            workingHours: userData.workingHours || defaultWorkingHours,
            services: userData.services || [],
            rating: userData.rating || 0
          };
          setProfile(barberProfile);
        } else if (userDoc.exists() && userDoc.data().role === 'customer') {
          // Müşteri profil sayfasına yönlendir
          router.replace('/customer/profile');
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser || !profile) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        address: profile.address,
        workingHours: profile.workingHours,
        services: profile.services
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: `${profile.firstName} ${profile.lastName}`
        });
      }

      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
      setEditingProfile(false);
      setEditingServices(false);
      setEditingWorkingHours(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      [field]: value
    });
  };

  const handleWorkingHourChange = (day: string, field: 'start' | 'end', value: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      workingHours: {
        ...profile.workingHours,
        [day]: {
          ...profile.workingHours[day],
          [field]: value
        }
      }
    });
  };

  const toggleClosedDay = (day: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      workingHours: {
        ...profile.workingHours,
        [day]: {
          ...profile.workingHours[day],
          isClosed: !profile.workingHours[day].isClosed
        }
      }
    });
  };

  const handleAddService = () => {
    if (!profile || !newService.name) return;
    
    if (isNaN(newService.price) || newService.price <= 0) {
      Alert.alert('Hata', 'Geçerli bir ücret girin');
      return;
    }

    if (isNaN(newService.duration) || newService.duration <= 0) {
      Alert.alert('Hata', 'Geçerli bir süre girin');
      return;
    }

    setProfile({
      ...profile,
      services: [
        ...profile.services,
        {
          name: newService.name,
          price: newService.price,
          duration: newService.duration
        }
      ]
    });

    setNewService({
      name: '',
      price: 0,
      duration: 30
    });
  };

  const handleRemoveService = (index: number) => {
    if (!profile) return;
    
    const updatedServices = [...profile.services];
    updatedServices.splice(index, 1);
    
    setProfile({
      ...profile,
      services: updatedServices
    });
  };

  const renderWorkingHours = () => {
    if (!profile?.workingHours) return null;

    const days = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar'
    ];

    return days.map((day) => {
      const hours = profile.workingHours[day];
      
      if (!hours) {
        return (
          <View key={day} style={styles.workingHourItem}>
            <Text style={styles.workingHourDay}>{day}</Text>
            <Text style={styles.workingHourTime}>Tanımlanmamış</Text>
          </View>
        );
      }

      const isClosed = hours.isClosed === undefined ? false : hours.isClosed;
      const timeText = isClosed ? 'Kapalı' : `${hours.start} - ${hours.end}`;

      if (editingWorkingHours) {
        return (
          <View key={day} style={styles.workingHourEditItem}>
            <View style={styles.workingHourEditDay}>
              <Text style={styles.workingHourDay}>{day}</Text>
              <View style={styles.closedSwitch}>
                <Text style={styles.closedText}>Kapalı</Text>
                <Switch
                  value={isClosed}
                  onValueChange={() => toggleClosedDay(day)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                />
              </View>
            </View>
            {!isClosed && (
              <View style={styles.timeInputs}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="09:00"
                  value={hours.start || ""}
                  onChangeText={(value) => handleWorkingHourChange(day, 'start', value)}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Text style={styles.timeSeparator}>-</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="18:00"
                  value={hours.end || ""}
                  onChangeText={(value) => handleWorkingHourChange(day, 'end', value)}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}
          </View>
        );
      }

      return (
        <View key={day} style={styles.workingHourItem}>
          <Text style={styles.workingHourDay}>{day}</Text>
          <Text style={styles.workingHourTime}>{timeText}</Text>
        </View>
      );
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
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.subtitle}>Kuaför</Text>
        <Text style={styles.email}>{profile.email}</Text>
        {profile.rating !== undefined && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Kişisel Bilgiler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditingProfile(!editingProfile)}
            >
              <Ionicons name={editingProfile ? "close" : "create-outline"} size={20} color={theme.colors.primary} />
              <Text style={styles.editButtonText}>
                {editingProfile ? 'İptal' : 'Düzenle'}
              </Text>
            </TouchableOpacity>
          </View>

          {editingProfile ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Adınız"
                  value={profile.firstName}
                  onChangeText={(value) => handleProfileChange('firstName', value)}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Soyad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Soyadınız"
                  value={profile.lastName}
                  onChangeText={(value) => handleProfileChange('lastName', value)}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Telefon numaranız"
                  value={profile.phone}
                  onChangeText={(value) => handleProfileChange('phone', value)}
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adres</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="İşletme adresiniz"
                  value={profile.address}
                  onChangeText={(value) => handleProfileChange('address', value)}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>{profile.phone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>{profile.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>{profile.address}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="cut-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  {profile.barberType === 'male' ? 'Erkek Kuaförü' :
                   profile.barberType === 'female' ? 'Kadın Kuaförü' : 'Karma Kuaför'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {profile.role === 'barber' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>İşletme Bilgileri</Text>
              <View style={styles.infoItem}>
                <Ionicons name="business-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  {profile.barberType === 'male' ? 'Erkek Kuaförü' :
                   profile.barberType === 'female' ? 'Kadın Kuaförü' : 'Karma Kuaför'}
                </Text>
              </View>
            </View>

            {/* Çalışma Saatleri */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingWorkingHours(!editingWorkingHours)}
                >
                  <Ionicons name={editingWorkingHours ? "close" : "create-outline"} size={20} color={theme.colors.primary} />
                  <Text style={styles.editButtonText}>
                    {editingWorkingHours ? 'İptal' : 'Düzenle'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.workingHoursContainer}>
                {renderWorkingHours()}
              </View>

              {editingWorkingHours && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hizmetler */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="cut-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Hizmetler</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingServices(!editingServices)}
                >
                  <Ionicons name={editingServices ? "close" : "create-outline"} size={20} color={theme.colors.primary} />
                  <Text style={styles.editButtonText}>
                    {editingServices ? 'İptal' : 'Düzenle'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingServices && (
                <View style={styles.addServiceForm}>
                  <Text style={styles.formLabel}>Yeni Hizmet Ekle</Text>
                  <View style={styles.serviceInputGroup}>
                    <TextInput
                      style={styles.serviceInput}
                      placeholder="Hizmet adı"
                      value={newService.name}
                      onChangeText={(text) => setNewService({...newService, name: text})}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TextInput
                      style={styles.serviceInput}
                      placeholder="Ücret"
                      value={newService.price === 0 ? '' : newService.price.toString()}
                      onChangeText={(text) => setNewService({...newService, price: parseFloat(text) || 0})}
                      keyboardType="numeric"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TextInput
                      style={styles.serviceInput}
                      placeholder="Süre (dk)"
                      value={newService.duration.toString()}
                      onChangeText={(text) => setNewService({...newService, duration: parseInt(text) || 30})}
                      keyboardType="numeric"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddService}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.surface} />
                    <Text style={styles.addButtonText}>Ekle</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.serviceList}>
                {profile.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <View>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDetails}>
                        {service.price} TL - {service.duration} dakika
                      </Text>
                    </View>
                    {editingServices && (
                      <TouchableOpacity
                        onPress={() => handleRemoveService(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {editingServices && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Randevular */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Bugünkü Randevular</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {/* Örnek randevular */}
          <View style={styles.appointmentList}>
            <View style={styles.appointmentItem}>
              <View style={styles.appointmentCustomer}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitials}>AY</Text>
                </View>
                <View>
                  <Text style={styles.customerName}>Ahmet Yılmaz</Text>
                  <Text style={styles.appointmentService}>Saç Kesimi</Text>
                </View>
              </View>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>14:30</Text>
                <Text style={styles.durationText}>30 dk</Text>
              </View>
            </View>

            <View style={styles.appointmentItem}>
              <View style={styles.appointmentCustomer}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitials}>AD</Text>
                </View>
                <View>
                  <Text style={styles.customerName}>Ayşe Demir</Text>
                  <Text style={styles.appointmentService}>Saç Boyama</Text>
                </View>
              </View>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>16:00</Text>
                <Text style={styles.durationText}>60 dk</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/profile/edit')}
        >
          <Ionicons name="create-outline" size={24} color={theme.colors.surface} />
          <Text style={styles.editButtonText}>Profili Düzenle</Text>
        </TouchableOpacity>

        {/* Çıkış Yap */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
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
  header: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.surface,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.surface,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  ratingText: {
    ...theme.typography.body,
    color: theme.colors.surface,
    marginLeft: theme.spacing.xs,
    fontWeight: 'bold',
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  editButtonText: {
    ...theme.typography.button,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  profileInfo: {
    padding: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  editForm: {
    padding: theme.spacing.md,
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  workingHoursContainer: {
    padding: theme.spacing.md,
  },
  workingHourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  workingHourDay: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  workingHourTime: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  workingHourEditItem: {
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  workingHourEditDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  closedSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closedText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  timeSeparator: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  addServiceForm: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  formLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  serviceInputGroup: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  serviceInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
    marginLeft: theme.spacing.xs,
  },
  serviceList: {
    padding: theme.spacing.md,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  serviceName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  serviceDetails: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  appointmentList: {
    padding: theme.spacing.md,
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appointmentCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  customerInitials: {
    ...theme.typography.bodySmall,
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  customerName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  appointmentService: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  durationText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  logoutButtonText: {
    ...theme.typography.button,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
}); 
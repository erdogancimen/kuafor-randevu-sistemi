import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import * as Location from 'expo-location';

interface Service {
  name: string;
  price: number;
  duration: number;
}

interface Employee {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  workingHours: string;
}

export default function BarberRegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [barberType, setBarberType] = useState('male');
  const [workingHours, setWorkingHours] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Employee>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    workingHours: ''
  });
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddService = () => {
    if (!newService.name.trim() || !newService.price.trim() || !newService.duration.trim()) {
      Alert.alert('Hata', 'Lütfen hizmet adı, ücreti ve süresini girin');
      return;
    }

    const price = parseFloat(newService.price);
    const duration = parseInt(newService.duration);
    
    if (isNaN(price) || price <= 0) {
      Alert.alert('Hata', 'Geçerli bir ücret girin');
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Hata', 'Geçerli bir süre girin (dakika)');
      return;
    }

    setServices([...services, { name: newService.name, price, duration }]);
    setNewService({ name: '', price: '', duration: '' });
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleAddEmployee = () => {
    if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.phone || 
        !newEmployee.email || !newEmployee.password || !newEmployee.workingHours) {
      Alert.alert('Hata', 'Lütfen tüm çalışan bilgilerini doldurun');
      return;
    }

    setEmployees([...employees, newEmployee]);
    setNewEmployee({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      workingHours: ''
    });
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni reddedildi');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      Alert.alert('Başarılı', 'Konum başarıyla alındı');
    } catch (error) {
      Alert.alert('Hata', 'Konum alınamadı');
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (services.length === 0) {
      Alert.alert('Hata', 'En az bir hizmet eklemelisiniz');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { 
        displayName: `${firstName} ${lastName}` 
      });

      // Çalışanlar için hesaplar oluştur
      const employeeAccounts = await Promise.all(
        employees.map(async (employee) => {
          const employeeCredential = await createUserWithEmailAndPassword(auth, employee.email, employee.password);
          await updateProfile(employeeCredential.user, {
            displayName: `${employee.firstName} ${employee.lastName}`
          });
          return {
            uid: employeeCredential.user.uid,
            ...employee
          };
        })
      );

      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        phone,
        email,
        address,
        barberType,
        role: 'barber',
        workingHours,
        services,
        latitude,
        longitude,
        imageUrl,
        rating: 0,
        employees: employeeAccounts,
        createdAt: new Date().toISOString()
      });

      Alert.alert('Başarılı', 'Kayıt işlemi tamamlandı');
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
        <Text style={styles.title}>Kuaför Kayıt</Text>
        </View>
        <Text style={styles.subtitle}>İşletmenizi kaydedin ve müşterilerinizi yönetin</Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ad</Text>
        <TextInput
          style={styles.input}
            placeholder="Adınız"
          value={firstName}
          onChangeText={setFirstName}
            placeholderTextColor={theme.colors.textMuted}
        />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Soyad</Text>
        <TextInput
          style={styles.input}
            placeholder="Soyadınız"
          value={lastName}
          onChangeText={setLastName}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            placeholder="Telefon numaranız"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
            placeholder="E-posta adresiniz"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifreniz"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi tekrar girin"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adres</Text>
        <TextInput
          style={styles.input}
            placeholder="İşletme adresiniz"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            placeholderTextColor={theme.colors.textMuted}
        />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kuaför Türü</Text>
          <View style={styles.pickerContainer}>
        <TouchableOpacity 
              style={[
                styles.pickerOption,
                barberType === 'male' && styles.pickerOptionSelected,
              ]}
              onPress={() => setBarberType('male')}
        >
              <Text style={[
                styles.pickerOptionText,
                barberType === 'male' && styles.pickerOptionTextSelected,
              ]}>Erkek Kuaförü</Text>
        </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                barberType === 'female' && styles.pickerOptionSelected,
              ]}
              onPress={() => setBarberType('female')}
        >
              <Text style={[
                styles.pickerOptionText,
                barberType === 'female' && styles.pickerOptionTextSelected,
              ]}>Kadın Kuaförü</Text>
            </TouchableOpacity>
                <TouchableOpacity
              style={[
                styles.pickerOption,
                barberType === 'mixed' && styles.pickerOptionSelected,
              ]}
              onPress={() => setBarberType('mixed')}
                >
              <Text style={[
                styles.pickerOptionText,
                barberType === 'mixed' && styles.pickerOptionTextSelected,
              ]}>Karma Kuaför</Text>
                </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Çalışma Saatleri</Text>
        <TextInput
          style={styles.input}
            placeholder="Örn: 09:00-18:00"
            value={workingHours}
            onChangeText={setWorkingHours}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hizmetler</Text>
          <View style={styles.serviceInputs}>
            <TextInput
              style={[styles.input, styles.serviceInput]}
              placeholder="Hizmet adı"
              value={newService.name}
              onChangeText={(text) => setNewService({ ...newService, name: text })}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.serviceInput]}
              placeholder="Ücret"
              value={newService.price}
              onChangeText={(text) => setNewService({ ...newService, price: text })}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.serviceInput]}
              placeholder="Süre (dk)"
              value={newService.duration}
              onChangeText={(text) => setNewService({ ...newService, duration: text })}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity
              style={styles.addServiceButton}
              onPress={handleAddService}
            >
              <Ionicons name="add" size={24} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>

          {services.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDetails}>
                  {service.price} TL - {service.duration} dakika
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveService(index)}
                style={styles.removeServiceButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Çalışanlar</Text>
          <View style={styles.employeeInputs}>
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="Ad"
              value={newEmployee.firstName}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, firstName: text })}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="Soyad"
              value={newEmployee.lastName}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, lastName: text })}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="Telefon"
              value={newEmployee.phone}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="E-posta"
              value={newEmployee.email}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="Şifre"
              value={newEmployee.password}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, password: text })}
              secureTextEntry
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.employeeInput]}
              placeholder="Çalışma Saatleri"
              value={newEmployee.workingHours}
              onChangeText={(text) => setNewEmployee({ ...newEmployee, workingHours: text })}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity
              style={styles.addEmployeeButton}
              onPress={handleAddEmployee}
            >
              <Text style={styles.addEmployeeButtonText}>Çalışan Ekle</Text>
            </TouchableOpacity>
          </View>

          {employees.map((employee, index) => (
            <View key={index} style={styles.employeeItem}>
              <View>
                <Text style={styles.employeeName}>
                  {employee.firstName} {employee.lastName}
                </Text>
                <Text style={styles.employeeDetails}>
                  {employee.phone} - {employee.email}
                </Text>
                <Text style={styles.employeeDetails}>
                  Çalışma Saatleri: {employee.workingHours}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveEmployee(index)}
                style={styles.removeEmployeeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Konum</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleLocation}
          >
            <Ionicons name="location" size={24} color={theme.colors.primary} />
            <Text style={styles.locationButtonText}>Konumumu Al</Text>
          </TouchableOpacity>
          {latitude !== 0 && longitude !== 0 && (
            <Text style={styles.locationText}>
              Konum: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.registerButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}>Zaten hesabınız var mı? Giriş yapın</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/register/customer')}>
            <Text style={styles.link}>Müşteri olarak kayıt olmak için tıklayın</Text>
        </TouchableOpacity>
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
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  form: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pickerOption: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  pickerOptionTextSelected: {
    color: theme.colors.surface,
  },
  serviceInputs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  serviceInput: {
    flex: 1,
  },
  addServiceButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
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
  removeServiceButton: {
    padding: theme.spacing.xs,
  },
  employeeInputs: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  employeeInput: {
    width: '100%',
  },
  addEmployeeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  addEmployeeButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  employeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  employeeName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  employeeDetails: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  removeEmployeeButton: {
    padding: theme.spacing.xs,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  locationButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  locationText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  registerButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  registerButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  links: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  link: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 
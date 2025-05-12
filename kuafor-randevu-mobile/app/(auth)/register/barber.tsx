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
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

interface Service {
  name: string;
  price: number;
  duration: number;
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
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
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
        rating: 0,
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
        <Text style={styles.title}>Kuaför Kayıt</Text>
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
    backgroundColor: theme.colors.primary,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.surface,
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
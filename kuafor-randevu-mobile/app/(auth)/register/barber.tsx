import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { auth } from '@/config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createUser } from '@/services/firebase';

const BARBER_TYPES = [
  { label: 'Erkek Kuaförü', value: 'male' },
  { label: 'Kadın Kuaförü', value: 'female' },
  { label: 'Karma Kuaför', value: 'mixed' },
];

export default function BarberRegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barberType, setBarberType] = useState<'male' | 'female' | 'mixed'>('male');
  const [showPicker, setShowPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setError('');
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { 
        displayName: `${firstName} ${lastName}` 
      });

      await createUser({
        firstName,
        lastName,
        email,
        phone,
        barberType,
        role: 'barber',
      }, user.uid);
      
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Kuaför Kaydı</ThemedText>
      </View>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Ad"
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Soyad"
          value={lastName}
          onChangeText={setLastName}
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Telefon"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor="#666"
        />

        <TouchableOpacity 
          style={styles.input}
          onPress={() => setShowPicker(true)}
        >
          <ThemedText style={styles.pickerText}>
            {BARBER_TYPES.find(type => type.value === barberType)?.label || 'Kuaför Türü Seçin'}
          </ThemedText>
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {BARBER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.pickerItem}
                  onPress={() => {
                    setBarberType(type.value as 'male' | 'female' | 'mixed');
                    setShowPicker(false);
                  }}
                >
                  <ThemedText style={styles.pickerItemText}>{type.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
        
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#666"
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => router.push('/register')}
        >
          <ThemedText style={styles.switchButtonText}>
            Müşteri olarak kayıt olmak için tıklayın
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>Zaten hesabınız var mı? </ThemedText>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <ThemedText style={styles.footerLink}>Giriş Yapın</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerText: {
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerItemText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
}); 
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { auth } from '@/config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createUser } from '@/services/firebase';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda. Lütfen giriş yapın veya farklı bir e-posta adresi kullanın.';
      case 'auth/invalid-email':
        return 'Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.';
      case 'auth/weak-password':
        return 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
      case 'auth/operation-not-allowed':
        return 'E-posta/şifre girişi devre dışı bırakılmış. Lütfen sistem yöneticisiyle iletişime geçin.';
      case 'auth/network-request-failed':
        return 'İnternet bağlantınızı kontrol edin.';
      case 'permission-denied':
        return 'İşlem için gerekli izinler bulunmuyor. Lütfen sistem yöneticisiyle iletişime geçin.';
      default:
        return 'Kayıt işlemi başarısız oldu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      setError('Ad alanı boş bırakılamaz.');
      return false;
    }
    if (!lastName.trim()) {
      setError('Soyad alanı boş bırakılamaz.');
      return false;
    }
    if (!email.trim()) {
      setError('E-posta alanı boş bırakılamaz.');
      return false;
    }
    if (!phone.trim()) {
      setError('Telefon alanı boş bırakılamaz.');
      return false;
    }
    if (!password) {
      setError('Şifre alanı boş bırakılamaz.');
      return false;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    try {
      if (!validateForm()) return;

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
        role: 'customer',
      }, user.uid);
      
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Müşteri Kaydı</ThemedText>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.error}>{error}</ThemedText>
        </View>
      ) : null}
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Ad"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            setError('');
          }}
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Soyad"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            setError('');
          }}
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Telefon"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setError('');
          }}
          keyboardType="phone-pad"
          placeholderTextColor="#666"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError('');
          }}
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
          onPress={() => router.push('/register/barber')}
        >
          <ThemedText style={styles.switchButtonText}>
            Kuaför olarak kayıt olmak için tıklayın
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
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
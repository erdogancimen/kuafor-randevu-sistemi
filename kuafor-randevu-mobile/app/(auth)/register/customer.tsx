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

export default function CustomerRegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
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
        role: 'customer',
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
        <Text style={styles.title}>Müşteri Kayıt</Text>
        </View>
        <Text style={styles.subtitle}>Hesabınızı oluşturun ve randevularınızı yönetin</Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.inputGroupHalf]}>
          <Text style={styles.label}>Ad</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
            placeholder="Adınız"
          value={firstName}
          onChangeText={setFirstName}
            placeholderTextColor={theme.colors.textMuted}
        />
            </View>
        </View>
        
          <View style={[styles.inputGroup, styles.inputGroupHalf]}>
          <Text style={styles.label}>Soyad</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
            placeholder="Soyadınız"
          value={lastName}
          onChangeText={setLastName}
            placeholderTextColor={theme.colors.textMuted}
          />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefon</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Telefon numaranız"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textMuted}
          />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
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
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
            placeholder="Şifreniz"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre Tekrar</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifrenizi tekrar girin"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.surface} />
              <Text style={styles.loadingText}>Kayıt yapılıyor...</Text>
            </View>
          ) : (
            <Text style={styles.registerButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        <View style={styles.links}>
        <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}>Zaten hesabınız var mı? Giriş yapın</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/register/barber')}>
            <Text style={styles.link}>Kuaför olarak kayıt olmak için tıklayın</Text>
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
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputGroupHalf: {
    flex: 1,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
  },
  inputIcon: {
    padding: theme.spacing.md,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    color: theme.colors.text,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
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
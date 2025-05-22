import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Button } from '@/components/common/Button';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Kullanıcı verisi:', userData);
        if (userData.role === 'barber') {
          router.replace('/barber/profile');
        } else if (userData.role === 'employee') {
          router.replace('/employee/profile');
        } else if (userData.role === 'customer') {
          router.replace('/');
        } else {
          setError('Geçersiz kullanıcı rolü. Lütfen yönetici ile iletişime geçin.');
        }
      } else {
        setError('Kullanıcı bilgileri bulunamadı. Lütfen yönetici ile iletişime geçin.');
      }
    } catch (err: any) {
      console.log('Giriş hatası:', err.code);
      let errorMessage = '';
      
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = 'Lütfen geçerli bir e-posta adresi giriniz.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Bu hesap devre dışı bırakılmış. Lütfen yönetici ile iletişime geçin.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Girdiğiniz şifre hatalı. Lütfen tekrar deneyiniz.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyiniz.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'İnternet bağlantınızı kontrol ediniz.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.';
          break;
        default:
          errorMessage = 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyiniz.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
      </View>
      
      <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-posta</Text>
            <View style={[styles.inputWrapper, error && error.includes('e-posta') && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={error && error.includes('e-posta') ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
                placeholder="E-posta adresiniz"
          value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
          keyboardType="email-address"
          autoCapitalize="none"
                placeholderTextColor={theme.colors.textMuted}
        />
            </View>
          </View>
        
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre</Text>
            <View style={[styles.inputWrapper, error && error.includes('şifre') && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={error && error.includes('şifre') ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
                placeholder="Şifreniz"
          value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor={theme.colors.textMuted}
        />
        <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={error && error.includes('şifre') ? theme.colors.error : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        
          <View style={styles.buttonContainer}>
            <Button
              title="Giriş Yap"
          onPress={handleLogin}
              loading={loading}
              variant="primary"
              fullWidth
            />
      </View>

          <TouchableOpacity
            onPress={() => router.push('/register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Hesabınız yok mu? <Text style={styles.registerTextBold}>Kayıt olun</Text>
            </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputContainer: {
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    ...theme.typography.body,
  },
  passwordToggle: {
    padding: theme.spacing.xs,
  },
  error: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: theme.spacing.md,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  registerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  registerTextBold: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  error: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    flex: 1,
  },
}); 
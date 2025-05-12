import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Button } from '@/components/common/Button';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kayıt Ol</Text>
        <Text style={styles.subtitle}>Hesap türünüzü seçin</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Berber Olarak Kayıt Ol"
          onPress={() => router.push('/register/barber')}
          variant="primary"
          fullWidth
        />
        <Button
          title="Müşteri Olarak Kayıt Ol"
          onPress={() => router.push('/register/customer')}
          variant="outline"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  buttonContainer: {
    gap: theme.spacing.md,
  },
}); 
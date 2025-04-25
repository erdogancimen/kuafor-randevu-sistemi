import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { auth } from '@/config/firebase';

export default function HomeScreen() {
  const handleButtonPress = (route: string) => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }
    router.push(route);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Kuaför Randevu</ThemedText>
        <ThemedText style={styles.subtitle}>Hoş Geldiniz</ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleButtonPress('/appointments/new')}
        >
          <ThemedText style={styles.buttonText}>Randevu Al</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleButtonPress('/appointments')}
        >
          <ThemedText style={styles.buttonText}>Randevularım</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleButtonPress('/services')}
        >
          <ThemedText style={styles.buttonText}>Hizmetler</ThemedText>
        </TouchableOpacity>
      </View>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

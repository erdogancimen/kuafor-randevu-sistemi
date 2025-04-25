import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { auth } from '@/config/firebase';
import { getBarbers, getReviews } from '@/services/firebase';
import { Barber, Review, Service, WorkingHours } from '@/types';

export default function BarberProfileScreen() {
  const [barber, setBarber] = useState<Barber | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarber = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const barbers = await getBarbers();
          const barberData = barbers.find(b => b.email === currentUser.email);
          if (barberData) {
            setBarber(barberData);
            const barberReviews = await getReviews(barberData.id);
            setReviews(barberReviews);
          }
        }
      } catch (error) {
        console.error('Error fetching barber:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarber();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Yükleniyor...</ThemedText>
      </ThemedView>
    );
  }

  if (!barber) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Berber bulunamadı</ThemedText>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <ThemedText style={styles.buttonText}>Çıkış Yap</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {barber.photoUrl ? (
          <Image source={{ uri: barber.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {barber.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <ThemedText type="title" style={styles.name}>{barber.name}</ThemedText>
        <ThemedText style={styles.email}>{barber.email}</ThemedText>
        <View style={styles.ratingContainer}>
          <ThemedText style={styles.rating}>{barber.rating.toFixed(1)}</ThemedText>
          <ThemedText style={styles.ratingText}>/ 5.0</ThemedText>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <ThemedText style={styles.label}>Telefon</ThemedText>
          <ThemedText style={styles.value}>{barber.phone || 'Belirtilmemiş'}</ThemedText>
        </View>

        <View style={styles.infoItem}>
          <ThemedText style={styles.label}>Adres</ThemedText>
          <ThemedText style={styles.value}>{barber.address || 'Belirtilmemiş'}</ThemedText>
        </View>

        <View style={styles.infoItem}>
          <ThemedText style={styles.label}>Hizmetler</ThemedText>
          {barber.services?.map((service: Service) => (
            <View key={service.id} style={styles.serviceItem}>
              <ThemedText style={styles.serviceName}>{service.name}</ThemedText>
              <ThemedText style={styles.servicePrice}>{service.price} TL</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.infoItem}>
          <ThemedText style={styles.label}>Çalışma Saatleri</ThemedText>
          {barber.workingHours?.map((hours: WorkingHours, index: number) => (
            <View key={index} style={styles.workingHoursItem}>
              <ThemedText style={styles.day}>
                {['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][hours.day]}
              </ThemedText>
              <ThemedText style={styles.hours}>
                {hours.startTime} - {hours.endTime}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.infoItem}>
          <ThemedText style={styles.label}>Değerlendirmeler</ThemedText>
          {reviews.map(review => (
            <View key={review.id} style={styles.reviewItem}>
              <ThemedText style={styles.reviewRating}>★ {review.rating}</ThemedText>
              <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>
              <ThemedText style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString('tr-TR')}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <ThemedText style={styles.buttonText}>Çıkış Yap</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    color: '#666',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingText: {
    color: '#666',
    marginLeft: 5,
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoItem: {
    marginBottom: 20,
  },
  label: {
    color: '#666',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  serviceName: {
    fontSize: 16,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  workingHoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  day: {
    fontSize: 16,
  },
  hours: {
    fontSize: 16,
    color: '#666',
  },
  reviewItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviewRating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  reviewComment: {
    fontSize: 16,
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
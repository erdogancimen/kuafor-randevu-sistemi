import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface Appointment {
  id: string;
  barberId: string;
  barberName: string;
  employeeName: string;
  service: string;
  date: string;
  time: string;
}

export default function ReviewScreen() {
  const { appointmentId } = useLocalSearchParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    fetchAppointment();
  }, []);

  const fetchAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      const db = getFirestore();
      const appointmentRef = doc(db, 'appointments', appointmentId as string);
      const appointmentDoc = await getDoc(appointmentRef);

      if (!appointmentDoc.exists()) {
        Alert.alert('Hata', 'Randevu bulunamadı');
        router.back();
        return;
      }

      const appointmentData = appointmentDoc.data() as Omit<Appointment, 'id'>;

      // Değerlendirme durumunu kontrol et
      const reviewsRef = collection(db, 'reviews');
      const reviewsQuery = query(
        reviewsRef,
        where('appointmentId', '==', appointmentId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);

      if (!reviewsSnapshot.empty) {
        Alert.alert('Hata', 'Bu randevu için zaten değerlendirme yapılmış');
        router.back();
        return;
      }

      setAppointment({
        ...appointmentData,
        id: appointmentDoc.id
      });
    } catch (error) {
      console.error('Error fetching appointment:', error);
      Alert.alert('Hata', 'Randevu bilgileri yüklenirken bir hata oluştu');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen bir puan seçin');
      return;
    }

    try {
      setSubmitting(true);
      const user = auth.currentUser;

      if (!user || !appointment) {
        Alert.alert('Hata', 'Bir hata oluştu');
        return;
      }

      // Değerlendirmeyi kaydet
      await addDoc(collection(getFirestore(), 'reviews'), {
        userId: user.uid,
        barberId: appointment.barberId,
        appointmentId: appointment.id,
        rating,
        comment,
        createdAt: new Date()
      });

      // Randevunun değerlendirildi durumunu güncelle
      const appointmentRef = doc(getFirestore(), 'appointments', appointment.id);
      await updateDoc(appointmentRef, {
        isReviewed: true
      });

      Alert.alert('Başarılı', 'Değerlendirmeniz kaydedildi');
      router.replace('/appointments');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Hata', 'Değerlendirme kaydedilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Değerlendirme Yap</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.appointmentCard}>
          <Text style={styles.barberName}>{appointment.barberName}</Text>
          <Text style={styles.employeeName}>{appointment.employeeName}</Text>
          <Text style={styles.serviceName}>{appointment.service}</Text>
          <Text style={styles.dateTime}>
            {appointment.date} - {appointment.time}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Puanınız</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? theme.colors.warning : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Yorumunuz</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Deneyiminizi paylaşın..."
            placeholderTextColor={theme.colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Değerlendirmeyi Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  barberName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  employeeName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  serviceName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  dateTime: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.lg,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  submitButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
}); 
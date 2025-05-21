import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

interface Review {
  id: string;
  userId: string;
  barberId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: any;
  userName: string;
  userPhotoURL: string;
  service: string;
  date: string;
  time: string;
}

export default function BarberReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const fetchReviews = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }

      try {
        const db = getFirestore();
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('barberId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = await Promise.all(
          reviewsSnapshot.docs.map(async (reviewDoc) => {
            const reviewData = reviewDoc.data();
            
            // Kullanıcı bilgilerini getir
            const userDocRef = doc(db, 'users', reviewData.userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            // Randevu bilgilerini getir
            const appointmentDocRef = doc(db, 'appointments', reviewData.appointmentId);
            const appointmentDoc = await getDoc(appointmentDocRef);
            const appointmentData = appointmentDoc.exists() ? appointmentDoc.data() : {};

            // İsim formatla
            const formatName = (name: string) => {
              const parts = name.split(' ');
              const firstName = parts[0];
              const lastName = parts[1] || '';
              
              const formattedFirstName = firstName.slice(0, 2) + '*'.repeat(firstName.length - 2);
              const formattedLastName = lastName ? lastName.slice(0, 2) + '*'.repeat(lastName.length - 2) : '';
              
              return `${formattedFirstName} ${formattedLastName}`.trim();
            };

            return {
              id: reviewDoc.id,
              ...reviewData,
              userName: userData.name ? formatName(userData.name) : 'İsimsiz Kullanıcı',
              userPhotoURL: userData.photoURL || '/images/default-avatar.jpg',
              service: appointmentData.service || '',
              date: appointmentData.date || '',
              time: appointmentData.time || ''
            } as Review;
          })
        );

        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        Alert.alert('Hata', 'Değerlendirmeler yüklenirken bir hata oluştu', [
          {
            text: 'Tamam',
            onPress: () => router.back()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Değerlendirmeler</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Müşterilerinizin yaptığı değerlendirmeleri buradan görüntüleyebilirsiniz.
          </Text>
        </View>

        {reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.userInfo}>
                    <Image
                      source={{ uri: review.userPhotoURL }}
                      style={styles.userAvatar}
                    />
                    <View style={styles.userDetails}>
                      <Text style={styles.userName} numberOfLines={1}>{review.userName}</Text>
                      <View style={styles.ratingContainer}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < review.rating ? "star" : "star-outline"}
                            size={16}
                            color={i < review.rating ? theme.colors.warning : theme.colors.textSecondary}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate} numberOfLines={1}>
                    {new Date(review.createdAt?.toDate()).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>

                <Text style={styles.reviewComment} numberOfLines={3}>{review.comment}</Text>

                <View style={styles.reviewDetails}>
                  {review.service && (
                    <View style={styles.detailItem}>
                      <Ionicons name="cut-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>{review.service}</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>{review.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>{review.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Henüz değerlendirme yapılmamış</Text>
            <Text style={styles.emptyText}>Müşteriler değerlendirme yaptığında burada görünecektir</Text>
          </View>
        )}
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
    backgroundColor: theme.colors.surface,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    padding: theme.spacing.lg,
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  reviewsList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.md,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  reviewComment: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  reviewDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  detailText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 
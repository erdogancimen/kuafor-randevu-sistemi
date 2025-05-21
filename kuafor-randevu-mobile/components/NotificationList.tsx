import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'review' | 'system';
  read: boolean;
  data?: {
    appointmentId?: string;
    reviewId?: string;
  };
  createdAt: Date;
}

interface NotificationListProps {
  userId: string;
  isVisible: boolean;
  onClose: () => void;
  onNotificationCountChange?: (count: number) => void;
}

export default function NotificationList({ userId, isVisible, onClose, onNotificationCountChange }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];

      setNotifications(notificationsData);
      
      // Okunmamış bildirim sayısını hesapla ve callback'i çağır
      const unreadCount = notificationsData.filter(n => !n.read).length;
      onNotificationCountChange?.(unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde bildirimleri getir
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  // Modal açıldığında bildirimleri yenile
  useEffect(() => {
    if (isVisible) {
      fetchNotifications();
    }
  }, [isVisible]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        });

        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );

        // Okunmamış bildirim sayısını güncelle
        const unreadCount = notifications.filter(n => !n.read).length - 1;
        onNotificationCountChange?.(unreadCount);
      }

      // Kullanıcı rolünü kontrol et
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      // Kullanıcı rolüne göre yönlendirme yap
      if (userData?.role === 'barber') {
        router.push('/barber/appointments');
      } else if (userData?.role === 'employee') {
        router.push('/employee/appointments');
      } else {
        router.push('/appointments');
      }

      onClose();
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true
          })
        )
      );

      setNotifications(prevNotifications =>
        prevNotifications.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="notifications" size={24} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>Bildirimler</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{unreadCount} yeni</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead}>
                <Text style={styles.markAllRead}>Tümünü okundu işaretle</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Henüz bildiriminiz bulunmuyor</Text>
            </View>
          ) : (
            <ScrollView style={styles.notificationsList}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationTime}>
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                          locale: tr
                        })}
                      </Text>
                    </View>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    {notification.type === 'appointment' && (
                      <View style={styles.appointmentBadge}>
                        <Ionicons name="calendar" size={16} color={theme.colors.primary} />
                        <Text style={styles.appointmentText}>Randevu detaylarını görüntüle</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  unreadCount: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
  },
  markAllRead: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unreadNotification: {
    backgroundColor: theme.colors.primary + '10',
  },
  notificationContent: {
    gap: theme.spacing.xs,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  notificationTime: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  notificationMessage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  appointmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  appointmentText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
  },
}); 
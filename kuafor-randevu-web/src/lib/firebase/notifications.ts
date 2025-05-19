import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { Notification } from '@/types/notification';

export interface Notification {
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
  createdAt: any;
}

export async function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>) {
  try {
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp()
    });

    return notificationRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const getNotifications = async (userId: string) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Notification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}; 
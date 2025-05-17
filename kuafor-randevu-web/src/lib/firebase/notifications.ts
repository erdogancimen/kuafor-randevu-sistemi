import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { Notification, NotificationData } from '@/types/notification';

export const createNotification = async (notificationData: NotificationData) => {
  try {
    console.log('Creating notification:', notificationData);

    if (!notificationData.userId) {
      throw new Error('User ID is required');
    }

    const notificationsRef = collection(db, 'notifications');
    const notificationRef = await addDoc(notificationsRef, {
      ...notificationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('Notification created with ID:', notificationRef.id);
    return notificationRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getNotifications = async (userId: string) => {
  try {
    console.log('Getting notifications for user:', userId);
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Retrieved notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    console.log('Marking notification as read:', notificationId);
    
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });

    console.log('Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    console.log('Marking all notifications as read for user:', userId);
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log('All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}; 
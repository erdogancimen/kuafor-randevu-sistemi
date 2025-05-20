import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export async function createNotification(
  userId: string,
  type: 'appointment' | 'review' | 'system',
  title: string,
  message: string,
  data?: any
) {
  try {
    const notificationRef = collection(db, 'notifications');
    const notificationData = {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp()
    };

    await addDoc(notificationRef, notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
} 
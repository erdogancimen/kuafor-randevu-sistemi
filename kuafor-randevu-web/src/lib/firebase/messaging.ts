import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';
import { doc, setDoc, getFirestore } from 'firebase/firestore';

const messaging = getMessaging(app);
const db = getFirestore(app);

// FCM token'ı al ve Firestore'a kaydet
export const requestNotificationPermission = async (userId: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      // Token'ı Firestore'a kaydet
      await setDoc(doc(db, 'users', userId), {
        fcmToken: token,
        notificationEnabled: true
      }, { merge: true });

      return token;
    }
    throw new Error('Notification permission denied');
  } catch (error) {
    console.error('Notification permission error:', error);
    throw error;
  }
};

// Bildirim dinleyicisi
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Bildirim gönderme fonksiyonu
export const sendNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (!userData?.fcmToken) {
      throw new Error('User FCM token not found');
    }

    const message = {
      token: userData.fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    // Cloud Function'a bildirim gönderme isteği
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}; 
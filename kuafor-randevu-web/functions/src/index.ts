import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

interface EmailData {
  to: string;
  subject: string;
  text: string;
}

interface NotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// E-posta gönderme fonksiyonu
export const sendEmail = functions.https.onCall(async (data: EmailData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı girişi gerekli');
  }

  const { to, subject, text } = data;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'E-posta gönderilemedi');
  }
});

// FCM bildirimi gönderme fonksiyonu
export const sendFCMNotification = functions.https.onCall(async (data: NotificationData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı girişi gerekli');
  }

  const { userId, title, body, data: notificationData } = data;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.fcmToken) {
      throw new functions.https.HttpsError('not-found', 'Kullanıcı FCM token\'ı bulunamadı');
    }

    const message = {
      token: userData.fcmToken,
      notification: {
        title,
        body
      },
      data: notificationData || {}
    };

    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    throw new functions.https.HttpsError('internal', 'Bildirim gönderilemedi');
  }
});

// Randevu oluşturulduğunda bildirim gönderme
export const onAppointmentCreated = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    const appointmentData = snap.data();
    
    if (!appointmentData) {
      console.error('No data in appointment document');
      return null;
    }

    try {
      // Müşteri bilgilerini al
      const customerDoc = await admin.firestore().collection('users').doc(appointmentData.userId).get();
      const customerData = customerDoc.data();
      const customerName = customerData ? `${customerData.firstName} ${customerData.lastName}` : 'Yeni bir müşteri';

      // Berbere bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: appointmentData.barberId,
        title: 'Yeni Randevu',
        message: `${customerName} adlı müşteri randevu talebinde bulundu.`,
        type: 'appointment',
        read: false,
        data: { appointmentId: context.params.appointmentId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Müşteriye bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: appointmentData.userId,
        title: 'Randevu Talebi',
        message: 'Randevu talebiniz berbere iletildi. Onay bekleniyor.',
        type: 'appointment',
        read: false,
        data: { appointmentId: context.params.appointmentId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return null;
    }
  });

// Randevu durumu değiştiğinde bildirim gönderme
export const onAppointmentStatusUpdated = functions.firestore
  .document('appointments/{appointmentId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    if (!newData || !previousData) {
      console.error('No data in appointment document');
      return null;
    }

    // Sadece status değişikliğinde bildirim gönder
    if (newData.status === previousData.status) {
      return null;
    }

    try {
      // Müşteri ve berber bilgilerini al
      const [customerDoc, barberDoc] = await Promise.all([
        admin.firestore().collection('users').doc(newData.userId).get(),
        admin.firestore().collection('users').doc(newData.barberId).get()
      ]);

      const customerData = customerDoc.data();
      const barberData = barberDoc.data();
      const customerName = customerData?.name || 'Müşteri';
      const barberName = barberData?.name || 'Berber';

      // Müşteriye bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: newData.userId,
        title: 'Randevu Durumu Güncellendi',
        message: newData.status === 'confirmed' 
          ? `${barberName} randevunuzu onayladı.`
          : newData.status === 'rejected'
            ? `${barberName} randevunuzu reddetti.`
            : newData.status === 'cancelled'
              ? `${barberName} randevunuzu iptal etti.`
              : `${barberName} randevunuzu tamamlandı olarak işaretledi.`,
        type: 'appointment',
        read: false,
        data: {
          appointmentId: context.params.appointmentId
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Berbere bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: newData.barberId,
        title: 'Randevu Durumu Güncellendi',
        message: newData.status === 'confirmed'
          ? `${customerName} adlı müşterinin randevusunu onayladınız.`
          : newData.status === 'rejected'
            ? `${customerName} adlı müşterinin randevusunu reddettiniz.`
            : newData.status === 'cancelled'
              ? `${customerName} adlı müşterinin randevusunu iptal ettiniz.`
              : `${customerName} adlı müşterinin randevusunu tamamlandı olarak işaretlediniz.`,
        type: 'appointment',
        read: false,
        data: {
          appointmentId: context.params.appointmentId
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return null;
    }
  }); 
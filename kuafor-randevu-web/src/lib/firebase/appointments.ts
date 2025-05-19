import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { createNotification } from './notifications';
import { AppointmentData, AppointmentStatus } from '@/types/appointment';
import { sendEmail } from './email';

export async function createAppointment(appointmentData: Omit<AppointmentData, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Randevuyu oluştur
    const appointmentRef = await addDoc(collection(db, 'appointments'), {
      ...appointmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return appointmentRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
  try {
    console.log('Updating appointment status:', { appointmentId, status });
    
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      throw new Error('Randevu bulunamadı');
    }

    const appointmentData = appointmentDoc.data();
    const { userId, barberId } = appointmentData;

    // Randevu durumunu güncelle
    await updateDoc(appointmentRef, {
      status,
      updatedAt: Timestamp.now()
    });

    console.log('Appointment status updated');

    // Kullanıcı ve kuaför bilgilerini al
    const [userDoc, barberDoc] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'users', barberId))
    ]);

    if (!userDoc.exists() || !barberDoc.exists()) {
      throw new Error('Kullanıcı veya kuaför bilgileri bulunamadı');
    }

    const userData = userDoc.data();
    const barberData = barberDoc.data();

    console.log('User and barber data retrieved:', { userData, barberData });

    // Bildirim mesajlarını hazırla
    let userMessage = '';
    let barberMessage = '';

    switch (status) {
      case 'confirmed':
        userMessage = `${barberData.firstName} ${barberData.lastName} randevunuzu onayladı.`;
        barberMessage = `${userData.firstName} ${userData.lastName} için randevuyu onayladınız.`;
        break;
      case 'rejected':
        userMessage = `${barberData.firstName} ${barberData.lastName} randevunuzu reddetti.`;
        barberMessage = `${userData.firstName} ${userData.lastName} için randevuyu reddettiniz.`;
        break;
      case 'cancelled':
        userMessage = `${barberData.firstName} ${barberData.lastName} randevunuzu iptal etti.`;
        barberMessage = `${userData.firstName} ${userData.lastName} için randevuyu iptal ettiniz.`;
        break;
      case 'completed':
        userMessage = `${barberData.firstName} ${barberData.lastName} randevunuzu tamamlandı olarak işaretledi.`;
        barberMessage = `${userData.firstName} ${userData.lastName} için randevuyu tamamlandı olarak işaretlediniz.`;
        break;
    }

    console.log('Notification messages prepared:', { userMessage, barberMessage });

    // Müşteriye bildirim gönder
    await createNotification({
      userId,
      title: 'Randevu Durumu Güncellendi',
      message: userMessage,
      type: 'appointment',
      read: false,
      data: { appointmentId },
      updatedAt: Timestamp.now()
    });

    console.log('Customer notification created');

    // Sadece çalışana bildirim gönder
    await createNotification({
      userId: barberId,
      title: 'Randevu Durumu Güncellendi',
      message: barberMessage,
      type: 'appointment',
      read: false,
      data: { appointmentId },
      updatedAt: Timestamp.now()
    });

    console.log('Employee notification created');

    // E-posta gönder
    if (status === 'confirmed' && userData.email) {
      await sendEmail({
        to: userData.email,
        subject: 'Randevu Onaylandı',
        text: `Sayın ${userData.firstName} ${userData.lastName},\n\n${barberData.firstName} ${barberData.lastName} randevunuzu onayladı.\n\nRandevu Detayları:\nTarih: ${appointmentData.date}\nSaat: ${appointmentData.time}\nHizmet: ${appointmentData.service}\n\nİyi günler dileriz.`
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

export const getAppointments = async (userId: string, role: string) => {
  try {
    let appointmentsQuery;

    if (role === 'customer') {
      // Müşteri için kendi randevularını getir
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', userId)
      );
    } else if (role === 'employee') {
      // Çalışan için kendi randevularını getir
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('barberId', '==', userId)
      );
    } else {
      throw new Error('Geçersiz kullanıcı rolü');
    }

    const querySnapshot = await getDocs(appointmentsQuery);
    const appointments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return appointments;
  } catch (error) {
    console.error('Error getting appointments:', error);
    throw error;
  }
}; 
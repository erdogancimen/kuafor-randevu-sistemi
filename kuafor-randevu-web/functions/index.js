const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// E-posta gönderimi için transporter oluşturma
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ieulez.x3@gmail.com',
    pass: 'hhuhfzpoudhbdavn'
  }
});

// FCM bildirimi gönderme fonksiyonu
async function sendFCMNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.fcmToken) {
      console.log('Kullanıcının FCM token\'ı bulunamadı:', userId);
      return;
    }

    const message = {
      token: userData.fcmToken,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };

    await admin.messaging().send(message);
    console.log('FCM bildirimi başarıyla gönderildi:', userId);
  } catch (error) {
    console.error('FCM bildirimi gönderilirken hata:', error);
  }
}

// Randevu oluşturulduğunda bildirim gönderme
exports.onAppointmentCreated = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snap, context) => {
    const appointmentData = snap.data();
    if (!appointmentData) {
      console.error('No data in appointment document');
      return null;
    }

    try {
      // Müşteri ve berber/çalışan bilgilerini al
      const [customerDoc, barberDoc] = await Promise.all([
        admin.firestore().collection('users').doc(appointmentData.userId).get(),
        admin.firestore().collection('users').doc(appointmentData.employeeId || appointmentData.barberId).get()
      ]);

      const customerData = customerDoc.data();
      const barberData = barberDoc.data();

      if (!customerData || !barberData) {
        throw new Error('Kullanıcı veya berber bilgileri bulunamadı');
      }

      const customerName = `${customerData.firstName} ${customerData.lastName}`;
      const barberName = `${barberData.firstName} ${barberData.lastName}`;

      // Müşteriye bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: appointmentData.userId,
        title: 'Randevu Talebi',
        message: `${barberName} ile randevunuz oluşturuldu.`,
        type: 'appointment',
        read: false,
        data: { appointmentId: context.params.appointmentId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Berbere/çalışana bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: appointmentData.employeeId || appointmentData.barberId,
        title: 'Yeni Randevu Talebi',
        message: `${customerName} adlı müşteri ${appointmentData.date} tarihinde ${appointmentData.time} saatinde ${appointmentData.service} hizmeti için randevu talebinde bulundu.`,
        type: 'appointment',
        read: false,
        data: { appointmentId: context.params.appointmentId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Müşteriye FCM bildirimi gönder
      await sendFCMNotification(
        appointmentData.userId,
        'Randevu Talebi',
        `${barberName} ile randevunuz oluşturuldu.`,
        { appointmentId: context.params.appointmentId }
      );

      // Çalışana FCM bildirimi gönder
      await sendFCMNotification(
        appointmentData.employeeId || appointmentData.barberId,
        'Yeni Randevu Talebi',
        `${customerName} adlı müşteri ${appointmentData.date} tarihinde ${appointmentData.time} saatinde ${appointmentData.service} hizmeti için randevu talebinde bulundu.`,
        { appointmentId: context.params.appointmentId }
      );

      // Çalışana e-posta bildirimi gönder
      if (barberData.email) {
        try {
          const subject = 'Yeni Randevu Talebi';
          const text = `Sayın ${barberName},\n\n${customerName} adlı müşteri sizinle randevu talebinde bulundu.\n\nRandevu Detayları:\nTarih: ${appointmentData.date}\nSaat: ${appointmentData.time}\nHizmet: ${appointmentData.service}\nSüre: ${appointmentData.duration} dakika\n\nRandevuyu onaylamak veya reddetmek için uygulamayı kontrol edin.`;

          await transporter.sendMail({
            from: 'ieulez.x3@gmail.com',
            to: barberData.email,
            subject: subject,
            text: text
          });
          console.log('Çalışana e-posta başarıyla gönderildi:', barberData.email);
        } catch (emailError) {
          console.error('Çalışana e-posta gönderimi sırasında hata:', emailError);
        }
      }

      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return null;
    }
  });

// Randevu durumu değiştiğinde bildirim gönderme
exports.onAppointmentStatusUpdated = functions.firestore
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
      // Müşteri ve berber/çalışan bilgilerini al
      const [customerDoc, barberDoc] = await Promise.all([
        admin.firestore().collection('users').doc(newData.userId).get(),
        admin.firestore().collection('users').doc(newData.employeeId || newData.barberId).get()
      ]);

      const customerData = customerDoc.data();
      const barberData = barberDoc.data();

      if (!customerData || !barberData) {
        throw new Error('Kullanıcı veya berber bilgileri bulunamadı');
      }

      const customerName = `${customerData.firstName} ${customerData.lastName}`;
      const barberName = `${barberData.firstName} ${barberData.lastName}`;

      // Bildirim mesajlarını hazırla
      let customerMessage = '';
      let barberMessage = '';

      switch (newData.status) {
        case 'confirmed':
          customerMessage = `${barberName} randevunuzu onayladı.`;
          barberMessage = `${customerName} adlı müşterinin randevusunu onayladınız.`;
          break;
        case 'rejected':
          customerMessage = `${barberName} randevunuzu reddetti.`;
          barberMessage = `${customerName} adlı müşterinin randevusunu reddettiniz.`;
          break;
        case 'cancelled':
          customerMessage = `${barberName} randevunuzu iptal etti.`;
          barberMessage = `${customerName} adlı müşterinin randevusunu iptal ettiniz.`;
          break;
        case 'completed':
          customerMessage = `${barberName} randevunuzu tamamlandı olarak işaretledi.`;
          barberMessage = `${customerName} adlı müşterinin randevusunu tamamlandı olarak işaretlediniz.`;
          break;
      }

      // Müşteriye bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: newData.userId,
        title: 'Randevu Durumu Güncellendi',
        message: customerMessage,
        type: 'appointment',
        read: false,
        data: {
          appointmentId: context.params.appointmentId
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Berbere/çalışana bildirim gönder
      await admin.firestore().collection('notifications').add({
        userId: newData.employeeId || newData.barberId,
        title: 'Randevu Durumu Güncellendi',
        message: barberMessage,
        type: 'appointment',
        read: false,
        data: {
          appointmentId: context.params.appointmentId
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Müşteriye FCM bildirimi gönder
      await sendFCMNotification(
        newData.userId,
        'Randevu Durumu Güncellendi',
        customerMessage,
        { appointmentId: context.params.appointmentId }
      );

      // Çalışana FCM bildirimi gönder
      await sendFCMNotification(
        newData.employeeId || newData.barberId,
        'Randevu Durumu Güncellendi',
        barberMessage,
        { appointmentId: context.params.appointmentId }
      );

      // Müşteriye e-posta bildirimi gönder
      if (customerData.email) {
        let subject = '';
        let text = '';

        switch (newData.status) {
          case 'confirmed':
            subject = 'Randevunuz Onaylandı';
            text = `Sayın ${customerName},\n\n${newData.date} tarihli, ${newData.time} saatindeki randevunuz onaylanmıştır.\n\nHizmet: ${newData.service}\nSüre: ${newData.duration} dakika\n\nBizi tercih ettiğiniz için teşekkür ederiz.`;
            break;
          case 'cancelled':
            subject = 'Randevunuz İptal Edildi';
            text = `Sayın ${customerName},\n\n${newData.date} tarihli, ${newData.time} saatindeki randevunuz iptal edilmiştir.\n\nHizmet: ${newData.service}\nSüre: ${newData.duration} dakika\n\nBaşka bir randevu almak için bizi arayabilirsiniz.`;
            break;
          case 'rejected':
            subject = 'Randevunuz Reddedildi';
            text = `Sayın ${customerName},\n\n${newData.date} tarihli, ${newData.time} saatindeki randevunuz reddedilmiştir.\n\nHizmet: ${newData.service}\nSüre: ${newData.duration} dakika\n\nBaşka bir randevu almak için bizi arayabilirsiniz.`;
            break;
          case 'completed':
            subject = 'Randevunuz Tamamlandı';
            text = `Sayın ${customerName},\n\n${newData.date} tarihli, ${newData.time} saatindeki randevunuz tamamlanmıştır.\n\nHizmet: ${newData.service}\nSüre: ${newData.duration} dakika\n\nBizi tercih ettiğiniz için teşekkür ederiz.`;
            break;
        }

        if (subject && text) {
          try {
            await transporter.sendMail({
              from: 'ieulez.x3@gmail.com',
              to: customerData.email,
              subject: subject,
              text: text
            });
            console.log('Müşteriye e-posta başarıyla gönderildi:', customerData.email);
          } catch (emailError) {
            console.error('Müşteriye e-posta gönderimi sırasında hata:', emailError);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return null;
    }
  }); 
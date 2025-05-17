"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentStatusUpdated = exports.onAppointmentCreated = exports.sendFCMNotification = exports.sendEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
admin.initializeApp();
// E-posta gönderme fonksiyonu
exports.sendEmail = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw new functions.https.HttpsError('internal', 'E-posta gönderilemedi');
    }
});
// FCM bildirimi gönderme fonksiyonu
exports.sendFCMNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı girişi gerekli');
    }
    const { userId, title, body, data: notificationData } = data;
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (!(userData === null || userData === void 0 ? void 0 : userData.fcmToken)) {
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
    }
    catch (error) {
        console.error('Error sending FCM notification:', error);
        throw new functions.https.HttpsError('internal', 'Bildirim gönderilemedi');
    }
});
// Randevu oluşturulduğunda bildirim gönderme
exports.onAppointmentCreated = functions.firestore
    .document('appointments/{appointmentId}')
    .onCreate(async (snap, context) => {
    var _a, _b;
    const appointmentData = snap.data();
    try {
        // Berbere bildirim gönder
        await admin.messaging().send({
            token: (_a = (await admin.firestore().collection('users').doc(appointmentData.barberId).get()).data()) === null || _a === void 0 ? void 0 : _a.fcmToken,
            notification: {
                title: 'Yeni Randevu',
                body: `${appointmentData.customerName} adlı müşteri randevu talebinde bulundu.`
            },
            data: {
                appointmentId: context.params.appointmentId
            }
        });
        // Müşteriye bildirim gönder
        await admin.messaging().send({
            token: (_b = (await admin.firestore().collection('users').doc(appointmentData.userId).get()).data()) === null || _b === void 0 ? void 0 : _b.fcmToken,
            notification: {
                title: 'Randevu Talebi',
                body: 'Randevu talebiniz berbere iletildi. Onay bekleniyor.'
            },
            data: {
                appointmentId: context.params.appointmentId
            }
        });
    }
    catch (error) {
        console.error('Error sending notifications:', error);
    }
});
// Randevu durumu güncellendiğinde bildirim gönderme
exports.onAppointmentStatusUpdated = functions.firestore
    .document('appointments/{appointmentId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const newData = change.after.data();
    const previousData = change.before.data();
    if (newData.status === previousData.status)
        return;
    try {
        if (newData.status === 'approved') {
            // Berbere bildirim gönder
            await admin.messaging().send({
                token: (_a = (await admin.firestore().collection('users').doc(newData.barberId).get()).data()) === null || _a === void 0 ? void 0 : _a.fcmToken,
                notification: {
                    title: 'Randevu Onaylandı',
                    body: `${newData.customerName} adlı müşterinin randevusu onaylandı.`
                },
                data: {
                    appointmentId: context.params.appointmentId
                }
            });
            // Müşteriye bildirim gönder
            await admin.messaging().send({
                token: (_b = (await admin.firestore().collection('users').doc(newData.userId).get()).data()) === null || _b === void 0 ? void 0 : _b.fcmToken,
                notification: {
                    title: 'Randevu Onaylandı',
                    body: 'Randevu talebiniz onaylandı.'
                },
                data: {
                    appointmentId: context.params.appointmentId
                }
            });
            // Müşteriye e-posta gönder
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: newData.customerEmail,
                subject: 'Randevu Onaylandı',
                text: `Sayın ${newData.customerName},\n\nRandevu talebiniz onaylandı. Randevu detayları:\nTarih: ${newData.date}\nSaat: ${newData.time}\nHizmet: ${newData.service}\n\nİyi günler dileriz.`
            });
        }
    }
    catch (error) {
        console.error('Error sending notifications:', error);
    }
});
//# sourceMappingURL=index.js.map
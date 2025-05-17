import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: EmailParams) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Randevu onay e-postası şablonu
export const getAppointmentConfirmationEmail = (
  customerName: string,
  barberName: string,
  appointmentDate: string,
  appointmentTime: string
) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Randevu Onaylandı!</h2>
      <p>Sayın ${customerName},</p>
      <p>Randevunuz ${barberName} tarafından onaylandı.</p>
      <p><strong>Randevu Detayları:</strong></p>
      <ul>
        <li>Tarih: ${appointmentDate}</li>
        <li>Saat: ${appointmentTime}</li>
        <li>Kuaför: ${barberName}</li>
      </ul>
      <p>Randevunuzu görüntülemek için <a href="${process.env.NEXT_PUBLIC_APP_URL}/appointments">tıklayın</a>.</p>
      <p>İyi günler dileriz.</p>
    </div>
  `;
};

// Yeni randevu talebi e-postası şablonu
export const getNewAppointmentEmail = (
  barberName: string,
  customerName: string,
  appointmentDate: string,
  appointmentTime: string
) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Yeni Randevu Talebi</h2>
      <p>Sayın ${barberName},</p>
      <p>${customerName} adlı müşteri tarafından yeni bir randevu talebi oluşturuldu.</p>
      <p><strong>Randevu Detayları:</strong></p>
      <ul>
        <li>Tarih: ${appointmentDate}</li>
        <li>Saat: ${appointmentTime}</li>
        <li>Müşteri: ${customerName}</li>
      </ul>
      <p>Randevuyu onaylamak veya reddetmek için <a href="${process.env.NEXT_PUBLIC_APP_URL}/appointments">tıklayın</a>.</p>
    </div>
  `;
}; 
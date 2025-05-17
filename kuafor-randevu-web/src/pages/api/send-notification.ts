import { NextApiRequest, NextApiResponse } from 'next';
import { getMessaging } from 'firebase-admin/messaging';
import { adminApp } from '@/lib/firebase/admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token, notification, data } = req.body;

    const message = {
      token,
      notification,
      data,
    };

    const response = await getMessaging(adminApp).send(message);
    
    return res.status(200).json({ 
      success: true, 
      messageId: response 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
} 
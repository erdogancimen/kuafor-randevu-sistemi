import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/firebase/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, message, type, data } = body;

    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notificationId = await createNotification({
      userId,
      title,
      message,
      type,
      data,
      read: false
    });

    return NextResponse.json({ id: notificationId });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
} 
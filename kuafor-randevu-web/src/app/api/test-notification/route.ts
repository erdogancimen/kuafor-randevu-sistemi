import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/firebase/notifications';
import { db } from '@/lib/firebase/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  console.log('Test notification request for userId:', userId);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Firebase bağlantısını kontrol et
    console.log('Checking Firebase connection...');
    console.log('Firestore instance:', db ? 'Available' : 'Not available');
    
    // Test bildirimi oluştur
    console.log('Creating test notification...');
    const notificationId = await createNotification({
      userId,
      title: 'Test Bildirimi',
      message: 'Bu bir test bildirimidir. Bildirim sistemi çalışıyor mu diye kontrol ediyoruz.',
      type: 'system',
      read: false,
      data: { test: true }
    });

    console.log('Notification created with ID:', notificationId);

    return NextResponse.json({
      success: true,
      message: 'Test notification created successfully',
      notificationId
    });
  } catch (error) {
    console.error('Detailed error creating test notification:', error);
    // Hata detaylarını da döndür
    return NextResponse.json(
      { 
        error: 'Failed to create test notification', 
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 
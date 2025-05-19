'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Bell, Loader2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'review';
  data?: {
    appointmentId?: string;
    reviewId?: string;
  };
  read: boolean;
  createdAt: Timestamp;
}

export default function EmployeeNotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      setNotifications(notifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!auth.currentUser) return;

    try {
      // Bildirimi okundu olarak işaretle
      if (!notification.read) {
        const notificationRef = doc(db, 'notifications', notification.id);
        await updateDoc(notificationRef, {
          read: true
        });
      }

      // Çalışan için yönlendirme
      if (notification.type === 'appointment') {
        router.push('/employee/appointments');
      }
    } catch (error) {
      console.error('Error handling notification:', error);
      toast.error('Bildirim işlenirken bir hata oluştu');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Bildirimler</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Bildirim bulunmuyor
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt.toDate()).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
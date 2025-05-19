'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Bell, Loader2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

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

        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      }

      // Çalışan için yönlendirme
      if (notification.type === 'appointment') {
        router.push('/employee/appointments');
      }

      setShowNotifications(false);
    } catch (error) {
      console.error('Error handling notification:', error);
      toast.error('Bildirim işlenirken bir hata oluştu');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true
          })
        )
      );

      setNotifications(prevNotifications =>
        prevNotifications.map(n => ({ ...n, read: true }))
      );

      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative z-50">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 rounded-lg border bg-gray-800 p-4 shadow-lg z-50">
          <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-3">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg text-white">Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">
                Henüz bildiriminiz bulunmuyor
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full rounded-lg p-4 text-left transition-all ${
                    notification.read
                      ? 'hover:bg-gray-700'
                      : 'bg-primary/10 hover:bg-primary/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      notification.read ? 'bg-gray-500' : 'bg-primary animate-pulse'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-base leading-tight text-white">
                          {notification.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {formatDistanceToNow(notification.createdAt.toDate(), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.type === 'appointment' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                          <Calendar className="h-3 w-3" />
                          <span>Randevu detaylarını görüntüle</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
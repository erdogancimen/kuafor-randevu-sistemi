import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/firebase/notifications';
import { Notification } from '@/types/notification';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function NotificationList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      console.log('No user found, clearing notifications');
      setNotifications([]);
      setLoading(false);
      return;
    }

    console.log('Setting up notifications listener for user:', user.uid);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        console.log('Received notifications update:', snapshot.docs.length, 'notifications');
        const userNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        setNotifications(userNotifications);
        setLoading(false);
        setError(null);
      }, 
      (error) => {
        console.error('Error loading notifications:', error);
        setError('Bildirimler yüklenirken bir hata oluştu');
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up notifications listener');
      unsubscribe();
    };
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      console.log('Marking notification as read:', notificationId);
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Bildirim okundu olarak işaretlenirken bir hata oluştu');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      console.log('Marking all notifications as read for user:', user.uid);
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Tüm bildirimler okundu olarak işaretlenirken bir hata oluştu');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await handleMarkAsRead(notification.id);
      }

      // Bildirim tipine göre yönlendirme
      switch (notification.type) {
        case 'appointment':
          if (notification.data?.appointmentId) {
            router.push(`/appointments/${notification.data.appointmentId}`);
          } else {
            router.push('/appointments');
          }
          break;
        case 'review':
          if (notification.data?.reviewId) {
            router.push(`/reviews/${notification.data.reviewId}`);
          } else {
            router.push('/reviews');
          }
          break;
        default:
          // Sistem bildirimleri için ana sayfaya yönlendir
          router.push('/');
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast.error('Bildirime tıklanırken bir hata oluştu');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp.toDate()).toLocaleString('tr-TR');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Bildirimler</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="p-4 text-center text-red-500">
                {error}
              </div>
            )}
            {loading ? (
              <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Bildirim bulunmuyor</div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      notification.read
                        ? 'hover:bg-gray-50'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
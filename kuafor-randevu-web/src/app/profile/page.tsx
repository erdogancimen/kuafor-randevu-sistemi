'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Calendar, Star, Bell, Lock, Edit2, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  photoURL?: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  favorites: string[];
  appointments: {
    id: string;
    barberId: string;
    barberName: string;
    service: string;
    date: string;
    status: 'upcoming' | 'completed' | 'cancelled';
  }[];
}

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
  type: 'male' | 'female' | 'mixed';
  photoURL?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favoriteBarbers, setFavoriteBarbers] = useState<Barber[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          // Varsayılan değerleri ayarla
          const defaultProfile: UserProfile = {
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            photoURL: user.photoURL || '',
            notifications: {
              email: true,
              push: true,
              sms: false
            },
            favorites: [],
            appointments: []
          };
          
          // Mevcut verileri varsayılan değerlerle birleştir
          const profileData = {
            ...defaultProfile,
            ...userData,
            displayName: userData.displayName || user.displayName || '',
            email: userData.email || user.email || '',
            photoURL: userData.photoURL || user.photoURL || ''
          };
          
          setProfile(profileData);
          
          // Favori kuaförlerin detaylarını getir
          if (profileData.favorites && profileData.favorites.length > 0) {
            const favoriteBarbersData = await Promise.all(
              profileData.favorites.map(async (barberId) => {
                const barberDoc = await getDoc(doc(db, 'users', barberId));
                if (barberDoc.exists()) {
                  return { id: barberId, ...barberDoc.data() } as Barber;
                }
                return null;
              })
            );
            setFavoriteBarbers(favoriteBarbersData.filter((barber): barber is Barber => barber !== null));
          } else {
            setFavoriteBarbers([]);
          }
        } else {
          // Kullanıcı dokümanı yoksa, yeni bir profil oluştur
          const defaultProfile: UserProfile = {
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
            photoURL: user.photoURL || '',
            notifications: {
              email: true,
              push: true,
              sms: false
            },
            favorites: [],
            appointments: []
          };
          setProfile(defaultProfile);
          setFavoriteBarbers([]);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    try {
      // Firebase Auth profilini güncelle
      await updateProfile(user, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      // Firestore profilini güncelle
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        photoURL: profile.photoURL
      });

      setIsEditing(false);
      toast.success('Profil başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !currentPassword || !newPassword || newPassword !== confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun ve şifrelerin eşleştiğinden emin olun');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      // Kullanıcıyı yeniden doğrula
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      await updatePassword(user, newPassword);

      // Kullanıcıyı yeniden giriş yapmaya zorla
      await auth.signOut();
      router.push('/login');
      toast.success('Şifre başarıyla güncellendi. Lütfen yeni şifrenizle tekrar giriş yapın.');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/invalid-credential') {
        toast.error('Mevcut şifre yanlış');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Şifre değiştirmek için lütfen tekrar giriş yapın');
        router.push('/login');
      } else {
        toast.error('Şifre güncellenirken bir hata oluştu');
      }
    }
  };

  const handleUpdateNotifications = async (type: 'email' | 'push' | 'sms') => {
    if (!user || !profile) return;

    try {
      const updatedNotifications = {
        ...profile.notifications,
        [type]: !profile.notifications[type]
      };

      await updateDoc(doc(db, 'users', user.uid), {
        notifications: updatedNotifications
      });

      setProfile({
        ...profile,
        notifications: updatedNotifications
      });

      toast.success('Bildirim tercihleri güncellendi');
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Bildirim tercihleri güncellenirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* KUAFÖRÜM Logo */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            KUAFÖRÜM
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Profil Başlığı */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-12 h-12 text-indigo-600" />
                  </div>
                )}
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                <p className="text-gray-600">{profile.email}</p>
              </div>
            </div>
          </div>

          {/* Profil Bilgileri */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Profil Bilgileri</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Adınızı ve soyadınızı girin"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{profile.displayName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phoneNumber || ''}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Telefon numaranızı girin"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{profile.phoneNumber || 'Belirtilmemiş'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Adres</label>
                {isEditing ? (
                  <textarea
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    rows={3}
                    placeholder="Adresinizi girin"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{profile.address || 'Belirtilmemiş'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Şifre Değiştirme */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Şifre Değiştir</h2>
              {!isEditingPassword ? (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Lock className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditingPassword(false)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleUpdatePassword}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {isEditingPassword && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Mevcut şifrenizi girin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yeni Şifre</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Yeni şifrenizi girin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Yeni şifrenizi tekrar girin"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bildirim Tercihleri */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bildirim Tercihleri</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">E-posta Bildirimleri</span>
                </div>
                <button
                  onClick={() => handleUpdateNotifications('email')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    profile.notifications.email ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      profile.notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Push Bildirimleri</span>
                </div>
                <button
                  onClick={() => handleUpdateNotifications('push')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    profile.notifications.push ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      profile.notifications.push ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">SMS Bildirimleri</span>
                </div>
                <button
                  onClick={() => handleUpdateNotifications('sms')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    profile.notifications.sms ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      profile.notifications.sms ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Randevu Geçmişi */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Randevu Geçmişi</h2>
            <div className="space-y-4">
              {profile.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{appointment.barberName}</h3>
                      <p className="text-sm text-gray-500">{appointment.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{appointment.date}</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {appointment.status === 'upcoming'
                          ? 'Yaklaşan'
                          : appointment.status === 'completed'
                          ? 'Tamamlandı'
                          : 'İptal Edildi'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favori Kuaförler */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Favori Kuaförler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteBarbers.map((barber) => (
                <div
                  key={barber.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/barber/${barber.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    {barber.photoURL ? (
                      <img
                        src={barber.photoURL}
                        alt={`${barber.firstName} ${barber.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {barber.firstName} {barber.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{barber.address}</p>
                      <div className="flex items-center mt-1">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-600">{barber.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {favoriteBarbers.length === 0 && (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">Henüz favori kuaförünüz bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Çıkış Yap Butonu */}
          <div className="mt-8 text-center">
            <button
              onClick={async () => {
                try {
                  await auth.signOut();
                  router.push('/login');
                  toast.success('Başarıyla çıkış yapıldı');
                } catch (error) {
                  console.error('Error signing out:', error);
                  toast.error('Çıkış yapılırken bir hata oluştu');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
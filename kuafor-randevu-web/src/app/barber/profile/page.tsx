'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Calendar, Bell, Lock, Edit2, X, Check, Menu, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarberProfile {
  displayName: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  type: 'male' | 'female' | 'mixed';
  services: {
    name: string;
    price: number;
  }[];
}

export default function BarberProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      try {
        if (!authUser) {
          router.push('/login');
          return;
        }

        setUser(authUser);
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        
        if (!userDoc.exists()) {
          setError('Kullanıcı bilgileri bulunamadı');
          router.push('/login');
          return;
        }

        const userData = userDoc.data();
        if (userData.role !== 'barber') {
          setError('Bu sayfaya erişim yetkiniz yok');
          router.push('/');
          return;
        }

        setProfile({
          displayName: userData.displayName || authUser.displayName || '',
          email: authUser.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          photoURL: userData.photoURL || authUser.photoURL || '',
          notifications: {
            email: userData.notifications?.email ?? true,
            push: userData.notifications?.push ?? true,
            sms: userData.notifications?.sms ?? true
          },
          type: userData.type || 'mixed',
          services: userData.services || []
        });
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Kullanıcı bilgileri yüklenirken bir hata oluştu');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    try {
      await updateProfile(user, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        phone: profile.phone || '',
        address: profile.address || '',
        photoURL: profile.photoURL || '',
        type: profile.type,
        services: profile.services,
        notifications: profile.notifications
      });

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(prev => ({
          ...prev!,
          phone: userData.phone || '',
          address: userData.address || '',
          type: userData.type || 'mixed',
          services: userData.services || []
        }));
      }

      setIsEditing(false);
      setIsEditingServices(false);
      toast.success('Profil başarıyla güncellendi');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.email) {
      toast.error('Kullanıcı bilgileri eksik');
      return;
    }

    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun ve şifrelerin eşleştiğinden emin olun');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

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

  const handleAddService = () => {
    if (!newService.name || !newService.price) {
      toast.error('Lütfen hizmet adı ve fiyatını girin');
      return;
    }

    const price = parseFloat(newService.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Geçerli bir fiyat girin');
      return;
    }

    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        services: [...prev.services, { name: newService.name, price }]
      };
    });

    setNewService({ name: '', price: '' });
    toast.success('Hizmet başarıyla eklendi');
  };

  const handleUpdateService = (index: number) => {
    if (!profile) return;

    const updatedServices = [...profile.services];
    updatedServices[index] = {
      name: newService.name,
      price: parseFloat(newService.price)
    };

    setProfile({
      ...profile,
      services: updatedServices
    });

    setEditingServiceIndex(null);
    setNewService({ name: '', price: '' });
    toast.success('Hizmet başarıyla güncellendi');
  };

  const handleDeleteService = (index: number) => {
    if (!profile) return;

    const updatedServices = profile.services.filter((_, i) => i !== index);
    setProfile({
      ...profile,
      services: updatedServices
    });

    toast.success('Hizmet başarıyla silindi');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Hata</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-600">KUAFÖRÜM</h1>
          
          {/* Hamburger Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={() => router.push('/barber/appointments')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Randevular
                </button>
                <button
                  onClick={() => router.push('/barber/notifications')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Bildirimler
                </button>
                <button
                  onClick={() => router.push('/barber/staff')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="w-4 h-4 mr-2" />
                  Çalışanlar
                </button>
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
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
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
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Telefon numaranızı girin"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{profile.phone || 'Belirtilmemiş'}</p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Kuaför Tipi</label>
                {isEditing ? (
                  <select
                    value={profile.type}
                    onChange={(e) => setProfile({ ...profile, type: e.target.value as 'male' | 'female' | 'mixed' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                  >
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="mixed">Unisex</option>
                  </select>
                ) : (
                  <p className="mt-1 text-gray-900">
                    {profile.type === 'male' ? 'Erkek' : profile.type === 'female' ? 'Kadın' : 'Unisex'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Hizmetler */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Hizmetler</h2>
              {!isEditingServices ? (
                <button
                  onClick={() => setIsEditingServices(true)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditingServices(false)}
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

            {isEditingServices && (
              <div className="mb-4 space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Hizmet adı"
                  />
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                    placeholder="Fiyat"
                  />
                  {editingServiceIndex === null ? (
                    <button
                      onClick={handleAddService}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Ekle
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateService(editingServiceIndex)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Güncelle
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {profile.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {isEditingServices ? (
                    <>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editingServiceIndex === index ? newService.name : service.name}
                          onChange={(e) => {
                            if (editingServiceIndex === index) {
                              setNewService({ ...newService, name: e.target.value });
                            } else {
                              setNewService({ name: e.target.value, price: service.price.toString() });
                              setEditingServiceIndex(index);
                            }
                          }}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                        />
                      </div>
                      <div className="w-32 mx-4">
                        <input
                          type="number"
                          value={editingServiceIndex === index ? newService.price : service.price}
                          onChange={(e) => {
                            if (editingServiceIndex === index) {
                              setNewService({ ...newService, price: e.target.value });
                            } else {
                              setNewService({ name: service.name, price: e.target.value });
                              setEditingServiceIndex(index);
                            }
                          }}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900 px-3 py-2"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeleteService(index)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-900">{service.name}</span>
                      <span className="text-indigo-600 font-medium">{service.price} TL</span>
                    </>
                  )}
                </div>
              ))}
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
          <div className="bg-white rounded-xl shadow-md p-6">
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
        </div>
      </div>
    </div>
  );
} 
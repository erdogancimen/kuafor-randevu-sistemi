'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged, signOut } from 'firebase/auth';
import { User, Calendar, Bell, Lock, Edit2, X, Check, Menu, LogOut, Loader2, MapPin, Phone, Mail, Clock, Scissors, Users, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import NotificationList from '@/components/notifications/NotificationList';

interface BarberProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  workingHours: {
    [key: string]: { start: string; end: string; isClosed?: boolean };
  };
  services: {
    name: string;
    price: number;
    duration: number;
  }[];
  photoURL: string;
}

interface Service {
  name: string;
  price: number;
  duration: number;
}

export default function BarberProfile() {
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingServices, setEditingServices] = useState(false);
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newService, setNewService] = useState<Service>({
    name: '',
    price: 0,
    duration: 30
  });
  const [editedProfile, setEditedProfile] = useState<Partial<BarberProfile>>({});
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Varsayılan çalışma saatleri
  const defaultWorkingHours = {
    'Pazartesi': { start: '09:00', end: '18:00', isClosed: false },
    'Salı': { start: '09:00', end: '18:00', isClosed: false },
    'Çarşamba': { start: '09:00', end: '18:00', isClosed: false },
    'Perşembe': { start: '09:00', end: '18:00', isClosed: false },
    'Cuma': { start: '09:00', end: '18:00', isClosed: false },
    'Cumartesi': { start: '10:00', end: '16:00', isClosed: false },
    'Pazar': { start: '00:00', end: '00:00', isClosed: true }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
          router.push('/login');
          return;
        }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().role === 'barber') {
          const userData = docSnap.data();
          // Varsayılan değerleri ayarla
          const defaultProfile: BarberProfile = {
            name: userData.name || user.displayName || '',
            email: userData.email || user.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            workingHours: userData.workingHours || {
              'Pazartesi': { start: '09:00', end: '18:00' },
              'Salı': { start: '09:00', end: '18:00' },
              'Çarşamba': { start: '09:00', end: '18:00' },
              'Perşembe': { start: '09:00', end: '18:00' },
              'Cuma': { start: '09:00', end: '18:00' },
              'Cumartesi': { start: '10:00', end: '16:00' },
              'Pazar': { start: '00:00', end: '00:00', isClosed: true }
            },
            services: userData.services || [],
            photoURL: userData.photoURL || user.photoURL || '/images/default-barber.jpg'
          };
          setProfile(defaultProfile);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Profil bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Başarıyla çıkış yapıldı');
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        ...profile,
        updatedAt: new Date().toISOString(),
      });

      toast.success('Profil başarıyla güncellendi');
      setEditingServices(false);
      setEditingWorkingHours(false);
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof BarberProfile, value: string) => {
    if (!profile) return;
      setProfile({
        ...profile,
      [field]: value
      });
  };

  const handleAddService = () => {
    if (!profile) return;

    if (!newService.name || newService.price <= 0 || newService.duration <= 0) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setProfile({
      ...profile,
      services: [...profile.services, newService]
    });

    setNewService({
      name: '',
      price: 0,
      duration: 30
    });
  };

  const handleRemoveService = (index: number) => {
    if (!profile) return;

    const updatedServices = profile.services.filter((_, i) => i !== index);
    setProfile({
      ...profile,
      services: updatedServices
    });
  };

  const handleUpdateWorkingHours = (day: string, field: 'start' | 'end' | 'isClosed', value: any) => {
    if (!profile) return;

    setProfile({
      ...profile,
      workingHours: {
        ...profile.workingHours,
        [day]: {
          ...profile.workingHours[day],
          ...(typeof value === 'object' ? value : { [field]: value })
        }
      }
    });
  };

  const menuItems = [
    {
      label: 'Randevular',
      icon: Calendar,
      href: '/barber/dashboard/appointments'
    },
    {
      label: 'Ayarlar',
      icon: Settings,
      href: '/barber/settings'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Profil bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Berber Profili</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
            
            {/* Notification Button */}
            <NotificationList />
            
            {/* Hamburger Menu Button */}
                <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
                </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-4 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    router.push(item.href);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  role="menuitem"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              ))}
              </div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[300px,1fr]">
          {/* Sol Sidebar - Profil Bilgileri */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-full">
                  <Image
                    src={profile.photoURL}
                    alt={`${profile.name} profil fotoğrafı`}
                    fill
                    sizes="(max-width: 768px) 100vw, 128px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">Kuaför</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {editingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Kuaför Adı</label>
                        <input
                          type="text"
                          value={profile?.name || ''}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Telefon</label>
                        <input
                          type="tel"
                          value={profile?.phone || ''}
                          onChange={(e) => handleProfileChange('phone', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Adres</label>
                        <textarea
                          value={profile?.address || ''}
                          onChange={(e) => handleProfileChange('address', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingProfile(false)}
                        className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.email}</span>
                  </div>
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Profili Düzenle
                  </button>
                  </>
                )}
            </div>
          </div>

            {/* Çalışma Saatleri */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Clock className="mr-2 h-5 w-5" />
                  Çalışma Saatleri
                </h3>
                <button
                  onClick={() => setEditingWorkingHours(!editingWorkingHours)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {editingWorkingHours ? 'İptal' : 'Düzenle'}
                </button>
              </div>
              <div className="space-y-4">
                {Object.entries(defaultWorkingHours).map(([day, defaultHours]) => {
                  const hours = profile?.workingHours?.[day] || defaultHours;
                  return (
                    <div key={day} className="flex items-center justify-between">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center space-x-2">
                        {hours.isClosed ? (
                          <span className="text-sm text-muted-foreground">Kapalı</span>
                        ) : (
                          <>
                            <input
                              type="time"
                              value={hours.start || ''}
                              onChange={(e) => handleUpdateWorkingHours(day, 'start', e.target.value)}
                              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                              disabled={!editingWorkingHours}
                            />
                            <span>-</span>
                  <input
                              type="time"
                              value={hours.end || ''}
                              onChange={(e) => handleUpdateWorkingHours(day, 'end', e.target.value)}
                              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                              disabled={!editingWorkingHours}
                            />
                          </>
                        )}
                        {editingWorkingHours && (
                          <button
                            onClick={() => {
                              const updatedHours = { ...hours };
                              if (hours.isClosed) {
                                updatedHours.isClosed = false;
                                updatedHours.start = '09:00';
                                updatedHours.end = '18:00';
                              } else {
                                updatedHours.isClosed = true;
                                updatedHours.start = '00:00';
                                updatedHours.end = '00:00';
                              }
                              handleUpdateWorkingHours(day, 'isClosed', updatedHours);
                            }}
                            className="ml-2 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/90"
                          >
                            {hours.isClosed ? 'Aç' : 'Kapat'}
                          </button>
                )}
              </div>
              </div>
                  );
                })}
                {editingWorkingHours && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kaydet
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Taraf - Hizmetler */}
          <div className="space-y-8">
          {/* Hizmetler */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Scissors className="mr-2 h-5 w-5" />
                  Hizmetler
                </h3>
                <button
                  onClick={() => setEditingServices(!editingServices)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {editingServices ? 'Düzenlemeyi Bitir' : 'Hizmetleri Düzenle'}
                </button>
              </div>

              {editingServices ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-4">
                    {profile.services.map((service, index) => (
                      <div
                        key={index}
                        className="bg-background p-4 rounded-lg border border-input"
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Hizmet Adı
                            </label>
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => {
                                const updatedServices = [...profile.services];
                                updatedServices[index] = { ...service, name: e.target.value };
                                setProfile({ ...profile, services: updatedServices });
                              }}
                              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                              placeholder="Örn: Saç Kesimi"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Süre (Dakika)
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                  type="number"
                                  value={service.duration}
                                  onChange={(e) => {
                                    const updatedServices = [...profile.services];
                                    updatedServices[index] = { ...service, duration: parseInt(e.target.value) || 0 };
                                    setProfile({ ...profile, services: updatedServices });
                                  }}
                                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                  placeholder="30"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Fiyat (₺)
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-muted-foreground">₺</span>
                                </div>
                                <input
                                  type="number"
                                  value={service.price}
                                  onChange={(e) => {
                                    const updatedServices = [...profile.services];
                                    updatedServices[index] = { ...service, price: parseInt(e.target.value) || 0 };
                                    setProfile({ ...profile, services: updatedServices });
                                  }}
                                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                  placeholder="100"
                                  min="1"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                  <button
                              type="button"
                              onClick={() => handleRemoveService(index)}
                              className="text-destructive hover:text-destructive/90 transition flex items-center gap-1"
                  >
                              <X className="h-4 w-4" />
                              <span>Hizmeti Sil</span>
                  </button>
                </div>
                        </div>
            </div>
                    ))}

                    <div className="mt-6 p-4 bg-background rounded-lg border border-input">
                      <h4 className="text-sm font-medium mb-4">Yeni Hizmet Ekle</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Hizmet Adı
                          </label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            placeholder="Örn: Saç Kesimi"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Süre (Dakika)
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              </div>
                  <input
                    type="number"
                                value={newService.duration}
                                onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) || 0 })}
                                className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                placeholder="30"
                                min="1"
                              />
                </div>
              </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Fiyat (₺)
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-muted-foreground">₺</span>
                      </div>
                        <input
                          type="number"
                                value={newService.price}
                                onChange={(e) => setNewService({ ...newService, price: parseInt(e.target.value) || 0 })}
                                className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                placeholder="100"
                                min="1"
                        />
                      </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddService}
                          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition"
                        >
                          Hizmet Ekle
                        </button>
                      </div>
            </div>
          </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingServices(false)}
                      className="px-4 py-2 bg-background text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition"
                    >
                      İptal
                    </button>
                <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        'Değişiklikleri Kaydet'
                      )}
                </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.services.map((service, index) => (
                    <div
                      key={index}
                      className="bg-background p-4 rounded-lg border border-input"
                  >
                      <h4 className="font-medium">{service.name}</h4>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{service.duration} dk</span>
                        </div>
                        <span className="font-medium">{service.price} ₺</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Randevular */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Calendar className="mr-2 h-5 w-5" />
                  Bugünkü Randevular
                </h3>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Tümünü Gör
                </button>
              </div>

              <div className="space-y-4">
                {/* Örnek randevu kartları */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src="/images/default-avatar.jpg"
                          alt="Müşteri"
                          fill
                          className="object-cover"
                  />
                </div>
                <div>
                        <h4 className="font-medium">Ahmet Yılmaz</h4>
                        <p className="text-sm text-muted-foreground">
                          Saç Kesimi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">14:30</p>
                      <p className="text-sm text-muted-foreground">30 dk</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src="/images/default-avatar.jpg"
                          alt="Müşteri"
                          fill
                          className="object-cover"
                  />
                </div>
                <div>
                        <h4 className="font-medium">Ayşe Demir</h4>
                        <p className="text-sm text-muted-foreground">
                          Saç Boyama
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">16:00</p>
                      <p className="text-sm text-muted-foreground">60 dk</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* İstatistikler */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Toplam Müşteri</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">128</p>
                <p className="text-sm text-muted-foreground">
                  Bu ay +12 yeni müşteri
                </p>
          </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Bugünkü Randevu</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">
                  2 randevu tamamlandı
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Aylık Hizmet</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">
                  Geçen aya göre +15%
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Ortalama Süre</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">45dk</p>
                <p className="text-sm text-muted-foreground">
                  Müşteri başına
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { User, Calendar, Bell, Edit2, X, Menu, LogOut, Loader2, MapPin, Phone, Mail, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import NotificationList from '@/components/notifications/NotificationList';

interface EmployeeProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  workingHours: string;
  photoURL: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar'
];

const DEFAULT_WORKING_HOURS: WorkingHours[] = DAYS.map(day => ({
  day,
  isOpen: day !== 'Pazar',
  openTime: '09:00',
  closeTime: '18:00'
}));

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    duration: 30,
    price: 0
  });
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>(DEFAULT_WORKING_HOURS);
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchServices();
    fetchWorkingHours();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().role === 'employee') {
        const userData = docSnap.data();
        setProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          workingHours: userData.workingHours || '',
          photoURL: userData.photoURL || user.photoURL || '/images/default-avatar.jpg'
        });
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const servicesRef = collection(db, 'services');
      const q = query(servicesRef, where('employeeId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];

      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Hizmetler yüklenirken bir hata oluştu');
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.workingHours && Array.isArray(data.workingHours)) {
          setWorkingHours(data.workingHours);
        }
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
      toast.error('Çalışma saatleri yüklenirken bir hata oluştu');
    }
  };

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

      await updateProfile(user, {
        displayName: `${profile.firstName} ${profile.lastName}`
      });

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        workingHours: profile.workingHours,
        updatedAt: new Date().toISOString()
      });

      toast.success('Profil başarıyla güncellendi');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const servicesRef = collection(db, 'services');
      await addDoc(servicesRef, {
        ...newService,
        employeeId: user.uid,
        createdAt: new Date().toISOString()
      });

      toast.success('Hizmet başarıyla eklendi');
      setIsAddingService(false);
      setNewService({ name: '', duration: 30, price: 0 });
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Hizmet eklenirken bir hata oluştu');
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const serviceRef = doc(db, 'services', editingService.id);
      await updateDoc(serviceRef, {
        name: editingService.name,
        duration: editingService.duration,
        price: editingService.price,
        updatedAt: new Date().toISOString()
      });

      toast.success('Hizmet başarıyla güncellendi');
      setEditingService(null);
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Hizmet güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Bu hizmeti silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, 'services', serviceId));
      toast.success('Hizmet başarıyla silindi');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Hizmet silinirken bir hata oluştu');
    }
  };

  const handleUpdateWorkingHours = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        workingHours,
        updatedAt: new Date().toISOString()
      });

      toast.success('Çalışma saatleri başarıyla güncellendi');
      setEditingWorkingHours(false);
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast.error('Çalışma saatleri güncellenirken bir hata oluştu');
    }
  };

  const menuItems = [
    {
      label: 'Randevular',
      icon: Calendar,
      href: '/employee/appointments'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Profil bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Çalışan Profili</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
            
            {/* Notification Button */}
            <NotificationList userId={auth.currentUser?.uid || ''} />
            
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
            <div className="rounded-lg border bg-gray-800/50 p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-full">
                  <Image
                    src={profile.photoURL}
                    alt={`${profile.firstName} ${profile.lastName} profil fotoğrafı`}
                    fill
                    sizes="(max-width: 768px) 100vw, 128px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-white">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-sm text-gray-400">Çalışan</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {editingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Ad</label>
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) =>
                            setProfile({ ...profile, firstName: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Soyad</label>
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) =>
                            setProfile({ ...profile, lastName: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Telefon</label>
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Çalışma Saatleri</label>
                        <input
                          type="text"
                          value={profile.workingHours}
                          onChange={(e) =>
                            setProfile({ ...profile, workingHours: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                          placeholder="Örn: 09:00-18:00"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingProfile(false)}
                        className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{profile.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{profile.workingHours}</span>
                    </div>
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      Profili Düzenle
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Taraf - Randevular ve Hizmetler */}
          <div className="space-y-8">
            {/* Çalışma Saatleri Bölümü */}
            <div className="rounded-lg border bg-gray-800/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold text-white">
                  <Clock className="mr-2 h-5 w-5" />
                  Çalışma Saatleri
                </h3>
                <button
                  onClick={() => setEditingWorkingHours(!editingWorkingHours)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  {editingWorkingHours ? 'Kaydet' : 'Düzenle'}
                </button>
              </div>

              <div className="space-y-4">
                {workingHours.map((day) => (
                  <div key={day.day} className="flex items-center justify-between rounded-lg border bg-gray-800 p-4">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) => {
                          const newHours = workingHours.map(h => 
                            h.day === day.day ? { ...h, isOpen: e.target.checked } : h
                          );
                          setWorkingHours(newHours);
                        }}
                        disabled={!editingWorkingHours}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
                      />
                      <span className="font-medium text-white">{day.day}</span>
                    </div>
                    {day.isOpen ? (
                      <div className="flex items-center space-x-4">
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(e) => {
                            const newHours = workingHours.map(h => 
                              h.day === day.day ? { ...h, openTime: e.target.value } : h
                            );
                            setWorkingHours(newHours);
                          }}
                          disabled={!editingWorkingHours}
                          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) => {
                            const newHours = workingHours.map(h => 
                              h.day === day.day ? { ...h, closeTime: e.target.value } : h
                            );
                            setWorkingHours(newHours);
                          }}
                          disabled={!editingWorkingHours}
                          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400">Kapalı</span>
                    )}
                  </div>
                ))}
              </div>

              {editingWorkingHours && (
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingWorkingHours(false);
                      fetchWorkingHours(); // Değişiklikleri iptal et
                    }}
                    className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUpdateWorkingHours}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Kaydet
                  </button>
                </div>
              )}
            </div>

            {/* Hizmetler Bölümü */}
            <div className="rounded-lg border bg-gray-800/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold text-white">
                  <User className="mr-2 h-5 w-5" />
                  Hizmetlerim
                </h3>
                <button
                  onClick={() => setIsAddingService(true)}
                  className="flex items-center space-x-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  <span>Hizmet Ekle</span>
                </button>
              </div>

              {/* Hizmet Ekleme/Düzenleme Formu */}
              {(isAddingService || editingService) && (
                <div className="mb-6 rounded-lg border bg-gray-800 p-4">
                  <form onSubmit={isAddingService ? handleAddService : handleUpdateService} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Hizmet Adı</label>
                      <input
                        type="text"
                        value={isAddingService ? newService.name : editingService?.name}
                        onChange={(e) => isAddingService 
                          ? setNewService({ ...newService, name: e.target.value })
                          : setEditingService({ ...editingService!, name: e.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Süre (dakika)</label>
                        <input
                          type="number"
                          value={isAddingService ? newService.duration : editingService?.duration}
                          onChange={(e) => isAddingService
                            ? setNewService({ ...newService, duration: parseInt(e.target.value) })
                            : setEditingService({ ...editingService!, duration: parseInt(e.target.value) })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                          min="15"
                          step="15"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Fiyat (TL)</label>
                        <input
                          type="number"
                          value={isAddingService ? newService.price : editingService?.price}
                          onChange={(e) => isAddingService
                            ? setNewService({ ...newService, price: parseInt(e.target.value) })
                            : setEditingService({ ...editingService!, price: parseInt(e.target.value) })
                          }
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingService(false);
                          setEditingService(null);
                        }}
                        className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        {isAddingService ? 'Ekle' : 'Güncelle'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Hizmet Listesi */}
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className="rounded-lg border bg-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{service.name}</h4>
                        <p className="text-sm text-gray-400">
                          {service.duration} dakika • {service.price} TL
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingService(service)}
                          className="rounded-md bg-gray-700 p-2 text-gray-300 hover:bg-gray-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="rounded-md bg-red-500 p-2 text-white hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-gray-400">Henüz hizmet eklenmemiş</p>
                )}
              </div>
            </div>

            {/* Randevular Bölümü */}
            <div className="rounded-lg border bg-gray-800/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold text-white">
                  <Calendar className="mr-2 h-5 w-5" />
                  Bugünkü Randevular
                </h3>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                  Tümünü Gör
                </button>
              </div>

              <div className="space-y-4">
                {/* Örnek randevu kartları */}
                <div className="rounded-lg border bg-gray-800 p-4">
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
                        <h4 className="font-medium text-white">Ahmet Yılmaz</h4>
                        <p className="text-sm text-gray-400">
                          Saç Kesimi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">14:30</p>
                      <p className="text-sm text-gray-400">30 dk</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
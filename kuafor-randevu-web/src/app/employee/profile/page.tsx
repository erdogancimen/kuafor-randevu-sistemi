'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { updateProfile, signOut, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { User, Calendar, Bell, Edit2, X, Menu, LogOut, Loader2, MapPin, Phone, Mail, Clock, Plus, Trash2, Scissors } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import NotificationList from '../components/NotificationList';
import { EmailAuthProvider } from 'firebase/auth';
import Link from 'next/link';

interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

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

interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  employeeId: string;
  barberName: string;
  employeeName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  createdAt: any;
  customerName?: string;
  customerPhone?: string;
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchServices();
    fetchWorkingHours();
    fetchTodayAppointments();
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

  const fetchTodayAppointments = async () => {
    if (!auth.currentUser) return;

    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('employeeId', '==', auth.currentUser.uid),
        where('date', '==', selectedDate),
        where('status', 'in', ['pending', 'confirmed'])
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const appointments = await Promise.all(
        appointmentsSnapshot.docs.map(async (appointmentDoc) => {
          const appointmentData = appointmentDoc.data() as Appointment;
          
          // Müşteri bilgilerini getir
          const userRef = doc(db, 'users', appointmentData.userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as UserData;

          return {
            ...appointmentData,
            id: appointmentDoc.id,
            customerName: userData?.firstName + ' ' + userData?.lastName,
            customerPhone: userData?.phone
          };
        })
      );

      setTodayAppointments(appointments);
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      toast.error('Randevular yüklenirken bir hata oluştu');
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

  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    setPasswordError(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Şifre güncelleme kontrolü
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordError('Yeni şifreler eşleşmiyor');
          setLoading(false);
          return;
        }

        if (passwordData.newPassword.length < 6) {
          setPasswordError('Şifre en az 6 karakter olmalıdır');
          setLoading(false);
          return;
        }

        // Mevcut şifreyi kontrol et ve yeni şifreyi güncelle
        try {
          const credential = EmailAuthProvider.credential(
            user.email!,
            passwordData.currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, passwordData.newPassword);
        } catch (error) {
          setPasswordError('Mevcut şifre yanlış');
          setLoading(false);
          return;
        }
      }

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
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
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
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Çalışan Profili</h1>
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
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
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
          <div className="absolute right-4 mt-2 w-48 rounded-md shadow-lg bg-card ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    router.push(item.href);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                    alt={`${profile.firstName} ${profile.lastName} profil fotoğrafı`}
                    fill
                    sizes="(max-width: 768px) 100vw, 128px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">Çalışan</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {editingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Ad</label>
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) =>
                            setProfile({ ...profile, firstName: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Soyad</label>
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) =>
                            setProfile({ ...profile, lastName: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Telefon</label>
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Çalışma Saatleri</label>
                        <input
                          type="text"
                          value={profile.workingHours}
                          onChange={(e) =>
                            setProfile({ ...profile, workingHours: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Örn: 09:00-18:00"
                        />
                      </div>

                      {/* Şifre Güncelleme Alanı */}
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-medium mb-4">Şifre Güncelle</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Mevcut Şifre</label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Yeni Şifre</label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          {passwordError && (
                            <p className="text-sm text-destructive">{passwordError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                          setPasswordError(null);
                        }}
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
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.workingHours}</span>
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
          </div>

          {/* Sağ Taraf - Randevular ve Hizmetler */}
          <div className="space-y-8">
            {/* Randevular Bölümü */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="flex items-center text-lg font-semibold">
                  <Calendar className="mr-2 h-5 w-5" />
                  Bugünkü Randevular
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full sm:w-[200px] pl-10 pr-3 py-2.5 bg-background border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition text-base font-medium"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <Link
                    href="/employee/appointments"
                    className="w-full sm:w-auto text-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
                  >
                    Tümünü Gör
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                {todayAppointments.length > 0 ? (
                  todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-lg border bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full">
                            <Image
                              src="/images/default-avatar.jpg"
                              alt={appointment.customerName || 'Müşteri'}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{appointment.service}</h4>
                            <p className="text-sm text-muted-foreground">
                              {appointment.customerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{appointment.time}</p>
                          <p className="text-sm text-muted-foreground">{appointment.duration} dk</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">Seçili tarih için randevu bulunmuyor</p>
                )}
              </div>
            </div>

            {/* Hizmetler Bölümü */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Scissors className="mr-2 h-5 w-5" />
                  Hizmetlerim
                </h3>
                <button
                  onClick={() => setIsAddingService(true)}
                  className="flex items-center space-x-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  <span>Hizmet Ekle</span>
                </button>
              </div>

              {/* Hizmet Ekleme/Düzenleme Formu */}
              {(isAddingService || editingService) && (
                <div className="mb-6 rounded-lg border bg-background p-4">
                  <form onSubmit={isAddingService ? handleAddService : handleUpdateService} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Hizmet Adı
                      </label>
                      <input
                        type="text"
                        value={isAddingService ? newService.name : editingService?.name}
                        onChange={(e) => isAddingService 
                          ? setNewService({ ...newService, name: e.target.value })
                          : setEditingService({ ...editingService!, name: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        placeholder="Örn: Saç Kesimi"
                        required
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
                            value={isAddingService ? newService.duration : editingService?.duration}
                            onChange={(e) => isAddingService
                              ? setNewService({ ...newService, duration: parseInt(e.target.value) })
                              : setEditingService({ ...editingService!, duration: parseInt(e.target.value) })
                            }
                            className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            placeholder="30"
                            min="1"
                            required
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
                            value={isAddingService ? newService.price : editingService?.price}
                            onChange={(e) => isAddingService
                              ? setNewService({ ...newService, price: parseInt(e.target.value) })
                              : setEditingService({ ...editingService!, price: parseInt(e.target.value) })
                            }
                            className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            placeholder="100"
                            min="1"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingService(false);
                          setEditingService(null);
                          setNewService({ name: '', duration: 30, price: 0 });
                        }}
                        className="px-4 py-2 bg-background text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
                      >
                        {isAddingService ? 'Hizmet Ekle' : 'Değişiklikleri Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Hizmet Listesi */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-background p-4 rounded-lg border border-input"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{service.name}</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingService(service)}
                          className="text-muted-foreground hover:text-foreground transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-destructive hover:text-destructive/90 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{service.duration} dk</span>
                      </div>
                      <span className="font-medium">{service.price} ₺</span>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="col-span-full text-center p-8 text-muted-foreground">
                    Henüz hizmet eklenmemiş. Yeni bir hizmet eklemek için "Hizmet Ekle" butonuna tıklayın.
                  </div>
                )}
              </div>
            </div>

            {/* Çalışma Saatleri Bölümü */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-semibold">
                  <Clock className="mr-2 h-5 w-5" />
                  Çalışma Saatleri
                </h3>
                <button
                  onClick={() => setEditingWorkingHours(!editingWorkingHours)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {editingWorkingHours ? 'Kaydet' : 'Düzenle'}
                </button>
              </div>

              <div className="space-y-4">
                {workingHours.map((day) => (
                  <div key={day.day} className="flex items-center justify-between rounded-lg border bg-background p-4">
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
                        className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                      />
                      <span className="font-medium">{day.day}</span>
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
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <span className="text-muted-foreground">-</span>
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
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Kapalı</span>
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
                    className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUpdateWorkingHours}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Kaydet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
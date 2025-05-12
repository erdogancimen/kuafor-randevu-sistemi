'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { updateProfile, onAuthStateChanged } from 'firebase/auth';
import { User, Calendar, Bell, Lock, Edit2, X, Check, Menu, LogOut, Loader2, MapPin, Phone, Mail, Clock, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { Appointment } from '@/types/appointment';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import FavoriteBarbers from '@/components/FavoriteBarbers';

interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoURL: string;
}

export default function CustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().role === 'customer') {
          const userData = docSnap.data();
          const defaultProfile: CustomerProfile = {
            name: userData.name || user.displayName || '',
            email: userData.email || user.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            photoURL: userData.photoURL || user.photoURL || '/images/default-avatar.jpg'
          };
          setProfile(defaultProfile);
          
          // Fetch recent appointments
          const appointmentsRef = collection(db, 'appointments');
          const q = query(
            appointmentsRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(3)
          );

          const querySnapshot = await getDocs(q);
          const appointmentsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Appointment[];

          setRecentAppointments(appointmentsData);
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
      await auth.signOut();
      router.push('/');
      toast.success('Başarıyla çıkış yapıldı');
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
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof CustomerProfile, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

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
          <h1 className="text-2xl font-bold">Müşteri Profili</h1>
          <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/')}
              className="flex items-center space-x-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
            >
              <Home className="h-4 w-4" />
              <span>Anasayfa</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
          </button>
          </div>
        </div>

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
                    sizes="(max-width: 768px) 128px, 128px"
                    className="object-cover"
                    priority
                  />
                  </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">Müşteri</p>
                </div>
            </div>
              <div className="mt-6 space-y-4">
                {editing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-4">
              <div>
                        <label className="text-sm font-medium">Ad Soyad</label>
                  <input
                    type="text"
                          value={profile.name}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
              </div>
              <div>
                        <label className="text-sm font-medium">Telefon</label>
                  <input
                    type="tel"
                          value={profile.phone}
                          onChange={(e) => handleProfileChange('phone', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
              </div>
              <div>
                        <label className="text-sm font-medium">Adres</label>
                  <textarea
                          value={profile.address}
                          onChange={(e) => handleProfileChange('address', e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
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
                      onClick={() => setEditing(true)}
                      className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Profili Düzenle
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Taraf - Randevular ve İstatistikler */}
          <div className="space-y-8">
            {/* Randevular */}
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Son Randevularım</h3>
                <button
                  onClick={() => router.push('/appointments/history')}
                  className="text-sm text-primary hover:underline"
                >
                  Tümünü Gör
                </button>
              </div>
              {recentAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz randevunuz bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {recentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                  >
                      <div className="space-y-1">
                        <p className="font-medium">{appointment.barberName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.date), 'dd MMMM yyyy', { locale: tr })} - {appointment.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{appointment.serviceName}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* İstatistikler */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Toplam Randevu</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">
                  Bu ay 3 randevu
                </p>
          </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Son Randevu</h3>
                </div>
                <p className="mt-2 text-3xl font-bold">2 gün önce</p>
                <p className="text-sm text-muted-foreground">
                  Saç Kesimi
                </p>
            </div>
          </div>

          {/* Favori Kuaförler */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Favori Kuaförlerim</h3>
              <FavoriteBarbers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
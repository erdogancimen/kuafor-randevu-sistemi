'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, DocumentReference, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import Image from 'next/image';
import { MapPin, Star, Clock, Scissors, Phone, Mail, Calendar, Loader2, Home, Check, X, Users, Navigation } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReviewList from '@/components/forms/ReviewList';
import FavoriteButton from '@/components/common/FavoriteButton';
import { createNotification } from '@/lib/firebase/notifications';
import ReviewForm from '@/components/forms/ReviewForm';

interface Barber {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  imageUrl?: string;
  services?: {
    name: string;
    price: number;
    duration: number;
  }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  };
  latitude?: number;
  longitude?: number;
}

interface BarberStats {
  averageRating: number;
  totalReviews: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  services?: {
    name: string;
    price: number;
    duration: number;
  }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  };
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  createdAt: any;
}

export default function BarberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [barberStats, setBarberStats] = useState<BarberStats>({ averageRating: 0, totalReviews: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      // Randevuyu tamamlandı olarak işaretle
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'completed',
        completedAt: new Date()
      });

      // Randevu bilgilerini getir
      const appointmentDoc = await getDoc(appointmentRef);
      const appointment = appointmentDoc.data();

      if (appointment) {
        // Değerlendirme bildirimi gönder
        await createNotification({
          userId: appointment.userId,
          title: 'Değerlendirme Yapın',
          message: `${barber?.firstName} ${barber?.lastName} kuaföründeki randevunuz tamamlandı. Deneyiminizi değerlendirmek ister misiniz?`,
          type: 'review_request',
          read: false,
          data: {
            appointmentId,
            barberId: barber?.id,
            url: `/barber/${barber?.id}?review=true&appointmentId=${appointmentId}`
          }
        });
      }

      toast.success('Randevu tamamlandı ve müşteriye bildirim gönderildi');
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Randevu tamamlanırken bir hata oluştu');
    }
  };

  const handleShowOnMap = () => {
    if (barber?.latitude && barber?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${barber.latitude},${barber.longitude}`;
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const fetchBarberAndEmployees = async () => {
      if (!params?.id) {
        toast.error('Kuaför ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        // Kuaför bilgilerini getir
        const barberRef = doc(db, 'users', params.id) as DocumentReference;
        const barberDoc = await getDoc(barberRef);
        
        if (barberDoc.exists()) {
          const barberData = { id: barberDoc.id, ...barberDoc.data() } as Barber;
          console.log('Barber Data:', barberData);
          setBarber(barberData);

          // Değerlendirme istatistiklerini getir
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('barberId', '==', params.id)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          
          const reviews = reviewsSnapshot.docs.map(doc => doc.data());
          const totalReviews = reviews.length;
          const averageRating = totalReviews > 0
            ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / totalReviews
            : 0;

          setBarberStats({
            averageRating,
            totalReviews
          });

          // Çalışanları getir
          const employeesQuery = query(
            collection(db, 'users'),
            where('barberId', '==', params.id),
            where('role', '==', 'employee')
          );
          const employeesSnapshot = await getDocs(employeesQuery);
          
          // Her çalışanın hizmetlerini getir
          const employeesData = await Promise.all(
            employeesSnapshot.docs.map(async (doc) => {
              const employeeData = doc.data();
              console.log('Employee Raw Data:', employeeData);
              
              // Çalışanın hizmetlerini getir
              const servicesQuery = query(
                collection(db, 'services'),
                where('employeeId', '==', doc.id)
              );
              const servicesSnapshot = await getDocs(servicesQuery);
              const services = servicesSnapshot.docs.map(serviceDoc => ({
                ...serviceDoc.data()
              }));

              // Çalışma saatlerini doğru formata dönüştür
              let workingHours = {};
              if (typeof employeeData.workingHours === 'string') {
                const [start, end] = employeeData.workingHours.split('-');
                workingHours = {
                  'Pazartesi': { start, end, isClosed: false },
                  'Salı': { start, end, isClosed: false },
                  'Çarşamba': { start, end, isClosed: false },
                  'Perşembe': { start, end, isClosed: false },
                  'Cuma': { start, end, isClosed: false },
                  'Cumartesi': { start, end, isClosed: false },
                  'Pazar': { start: '00:00', end: '00:00', isClosed: true }
                };
              } else {
                workingHours = employeeData.workingHours || {};
              }

              const employee = {
                id: doc.id,
                ...employeeData,
                services: services,
                workingHours: workingHours
              } as Employee;

              console.log('Processed Employee Data:', employee);
              return employee;
            })
          );

          // Kuaför sahibini de çalışanlar listesine ekle
          const allEmployees = [
            {
              id: barberData.id,
              firstName: barberData.firstName,
              lastName: barberData.lastName,
              services: barberData.services,
              workingHours: barberData.workingHours || {}
            },
            ...employeesData
          ];

          console.log('All Employees:', allEmployees);
          setEmployees(allEmployees);
          
          // İlk çalışanı (kuaför sahibini) seç
          if (allEmployees.length > 0) {
            setSelectedEmployee(allEmployees[0]);
          }
        } else {
          toast.error('Kuaför bulunamadı');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Bilgiler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchBarberAndEmployees();
  }, [params?.id]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!barber?.id || !selectedDate) return;

      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('barberId', '==', barber.id),
          where('date', '==', selectedDate),
          where('status', 'in', ['pending', 'confirmed'])
        );

        const querySnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];

        setExistingAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Randevular yüklenirken bir hata oluştu');
      }
    };

    fetchAppointments();
  }, [barber?.id, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !selectedEmployee || !selectedService) return;

    const selectedServiceData = selectedEmployee.services?.find(s => s.name === selectedService);
    if (!selectedServiceData || !selectedServiceData.duration) return;

    const dayOfWeek = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
    const workingHours = selectedEmployee.workingHours?.[dayOfWeek];

    if (!workingHours || workingHours.isClosed) {
      setAvailableSlots([]);
      return;
    }

    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const duration = selectedServiceData.duration;

    const slots: string[] = [];
    for (let time = startTime; time + duration <= endTime; time += 30) {
      const hour = Math.floor(time / 60);
      const minute = time % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Sadece onaylanmış ve bekleyen randevuları kontrol et
      const isAvailable = !existingAppointments.some(appointment => {
        // Sadece seçili çalışanın randevularını kontrol et
        if (appointment.employeeId !== selectedEmployee.id) return false;

        const [appHour, appMinute] = appointment.time.split(':').map(Number);
        const appStartTime = appHour * 60 + appMinute;
        const appEndTime = appStartTime + appointment.duration;
        const slotEndTime = time + duration;

        return (time >= appStartTime && time < appEndTime) ||
               (slotEndTime > appStartTime && slotEndTime <= appEndTime) ||
               (time <= appStartTime && slotEndTime >= appEndTime);
      });

      if (isAvailable) {
        slots.push(timeString);
      }
    }

    setAvailableSlots(slots);
  }, [selectedDate, selectedService, selectedEmployee, existingAppointments]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      toast.error('Lütfen önce giriş yapın');
      router.push('/login');
      return;
    }

    if (!selectedEmployee?.id) {
      toast.error('Lütfen bir çalışan seçin');
      return;
    }

    try {
      setBookingLoading(true);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error('Kullanıcı bilgileri bulunamadı');
        return;
      }

      const userData = userDoc.data();
      
      if (userData?.role === 'barber' || userData?.role === 'employee') {
        toast.error('Kuaförler ve çalışanlar randevu oluşturamaz');
        return;
      }

      const selectedServiceData = selectedEmployee.services?.find(s => s.name === selectedService);
      if (!selectedServiceData) {
        toast.error('Hizmet bilgileri bulunamadı');
        return;
      }
      
      const appointmentsRef = collection(db, 'appointments');
      const appointmentRef = await addDoc(appointmentsRef, {
        userId: auth.currentUser.uid,
        barberId: barber?.id,
        employeeId: selectedEmployee.id,
        barberName: `${barber?.firstName} ${barber?.lastName}`,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        price: selectedServiceData.price,
        duration: selectedServiceData.duration,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Randevu talebiniz başarıyla oluşturuldu');
      router.push('/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Randevu oluşturulurken bir hata oluştu');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Kuaför bulunamadı</h1>
          <p className="text-gray-600 mt-2">Aradığınız kuaför bulunamadı veya artık mevcut değil.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 flex items-center space-x-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            <span>Anasayfaya Dön</span>
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gray-900">
        <div className="absolute inset-0">
          <Image
            src="/images/default-barber.jpg"
            alt={`${barber.firstName} ${barber.lastName}`}
            fill
            sizes="100vw"
            className="object-cover opacity-10"
            priority
          />
        </div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full overflow-hidden bg-white/5 border-4 border-white/10">
              <Image
                src="/images/default-barber.jpg"
                alt={`${barber.firstName} ${barber.lastName}`}
                fill
                sizes="(max-width: 768px) 128px, 160px"
                className="object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {barber.firstName} {barber.lastName}
                </h1>
                <FavoriteButton
                  barberId={barber.id}
                  barberName={`${barber.firstName} ${barber.lastName}`}
                  barberImage={barber.imageUrl}
                />
              </div>
              <div className="flex items-center justify-center md:justify-start mt-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="ml-1 text-lg font-medium text-white">
                  {barberStats.averageRating.toFixed(1)}
                </span>
                <span className="ml-2 text-sm text-gray-400">
                  ({barberStats.totalReviews} değerlendirme)
                </span>
                {barber.latitude && barber.longitude && (
                  <button
                    onClick={handleShowOnMap}
                    className="ml-4 flex items-center space-x-1 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Haritada Göster</span>
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center text-white/70">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{barber.address}</span>
                </div>
                <div className="flex items-center text-white/70">
                  <Phone className="w-5 h-5 mr-2" />
                  <span>{barber.phone}</span>
                </div>
                <div className="flex items-center text-white/70">
                  <Mail className="w-5 h-5 mr-2" />
                  <span>{barber.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services */}
          <div className="lg:col-span-2 space-y-8">
            {/* Çalışan Seçimi */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">Çalışan Seçimi</h2>
              <div className="relative">
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const employee = employees.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(employee || null);
                    setSelectedService('');
                    setSelectedTime('');
                  }}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} {employee.id === barber?.id ? '(Kuaför Sahibi)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Services */}
            {selectedEmployee && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">Hizmetler</h2>
                <div className="space-y-4">
                  {selectedEmployee.services && selectedEmployee.services.length > 0 ? (
                    selectedEmployee.services.map((service, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition ${
                          selectedService === service.name
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-gray-800/50 border border-white/10 hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedService(service.name)}
                      >
                        <div>
                          <h3 className="font-medium text-white">{service.name}</h3>
                          <div className="flex items-center text-sm text-gray-400 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{service.duration} dakika</span>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {service.price} TL
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400">Bu çalışan için henüz hizmet eklenmemiş</p>
                  )}
                </div>
              </div>
            )}

            {/* Çalışma Saatleri */}
            {selectedEmployee && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">Çalışma Saatleri</h2>
                <div className="space-y-4">
                  {Object.entries(defaultWorkingHours).map(([day, defaultHours]) => {
                    const hours = selectedEmployee.workingHours?.[day] || defaultHours;
                    return (
                      <div key={day} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-white/10">
                        <span className="font-medium text-white">{day}</span>
                        <span className="text-gray-400">
                          {hours.isClosed ? 'Kapalı' : `${hours.start} - ${hours.end}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 h-fit border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Randevu Al</h2>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tarih
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition text-white"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {selectedDate && selectedService && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Müsait Saatler
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`p-2 rounded-lg text-sm font-medium transition ${
                            selectedTime === slot
                              ? 'bg-primary text-white'
                              : 'bg-gray-800/50 text-white border border-white/10 hover:border-primary/50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-4 text-gray-400">
                        {(() => {
                          const dayOfWeek = new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' });
                          const isClosed = selectedEmployee?.workingHours?.[dayOfWeek]?.isClosed ?? true;
                          return isClosed ? 'Bu gün kapalıdır' : 'Bu tarihte müsait saat bulunmamaktadır';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedEmployee || !selectedService || !selectedDate || !selectedTime || bookingLoading}
                className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Randevu oluşturuluyor...</span>
                  </>
                ) : (
                  <span>Randevu Oluştur</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Değerlendirmeler */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Değerlendirmeler</h2>
          {searchParams?.get('review') === 'true' && searchParams?.get('appointmentId') ? (
            <div className="mb-8">
              <ReviewForm
                barberId={barber?.id || ''}
                appointmentId={searchParams.get('appointmentId') || ''}
                onReviewSubmitted={() => {
                  // URL'den review parametresini kaldır
                  const newUrl = window.location.pathname;
                  window.history.replaceState({}, '', newUrl);
                  toast.success('Değerlendirmeniz için teşekkür ederiz!');
                }}
              />
            </div>
          ) : null}
          <ReviewList barberId={barber?.id || ''} />
        </div>
      </div>
    </div>
  );
} 
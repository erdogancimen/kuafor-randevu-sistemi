'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import Image from 'next/image';
import { MapPin, Star, Clock, Scissors, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

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
    day: string;
    start: string;
    end: string;
  }[];
}

export default function BarberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchBarber = async () => {
      try {
        const barberDoc = await getDoc(doc(db, 'users', params.id as string));
        if (barberDoc.exists()) {
          setBarber({ id: barberDoc.id, ...barberDoc.data() } as Barber);
        }
      } catch (error) {
        console.error('Error fetching barber:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarber();
  }, [params.id]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Lütfen önce giriş yapın');
      router.push('/login');
      return;
    }

    try {
      setBookingLoading(true);
      const selectedServiceData = barber?.services?.find(s => s.name === selectedService);
      
      await addDoc(collection(db, 'appointments'), {
        userId: auth.currentUser.uid,
        barberId: barber?.id,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        price: selectedServiceData?.price,
        duration: selectedServiceData?.duration,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Randevunuz başarıyla oluşturuldu!');
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Kuaför bulunamadı</h1>
          <p className="text-gray-600 mt-2">Aradığınız kuaför bulunamadı veya artık mevcut değil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Barber Image */}
            <div className="w-full md:w-1/3">
              <div className="relative h-64 md:h-80 rounded-xl overflow-hidden bg-gray-200">
                {barber.imageUrl ? (
                  <Image
                    src={barber.imageUrl}
                    alt={`${barber.firstName} ${barber.lastName}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-4xl">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barber Info */}
            <div className="w-full md:w-2/3">
              <h1 className="text-3xl font-bold text-gray-900">
                {barber.firstName} {barber.lastName}
              </h1>
              <div className="flex items-center mt-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="ml-1 text-lg font-medium">{barber.rating?.toFixed(1) || '0.0'}</span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{barber.address}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="w-5 h-5 mr-2" />
                  <span>{barber.phone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Mail className="w-5 h-5 mr-2" />
                  <span>{barber.email}</span>
                </div>
              </div>

              {/* Working Hours */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Çalışma Saatleri</h2>
                <div className="grid grid-cols-2 gap-4">
                  {barber.workingHours?.map((hour, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">{hour.day}</span>
                      <span className="text-gray-600">
                        {hour.start} - {hour.end}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services and Booking */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Hizmetler</h2>
            <div className="space-y-4">
              {barber.services?.map((service, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition ${
                    selectedService === service.name
                      ? 'bg-indigo-50 border-2 border-indigo-500'
                      : 'bg-white border border-gray-200 hover:border-indigo-300'
                  }`}
                  onClick={() => setSelectedService(service.name)}
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{service.duration} dakika</span>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {service.price} TL
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Randevu Al</h2>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saat
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!selectedService || !selectedDate || !selectedTime || bookingLoading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {bookingLoading ? 'Randevu oluşturuluyor...' : 'Randevu Oluştur'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 
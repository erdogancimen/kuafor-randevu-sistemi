'use client';

import { useState, useEffect } from 'react';
import { Salon, Appointment } from '@/types/firebase';
import { createAppointment, getAppointmentsForDay } from '@/lib/firebase/db';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

interface AppointmentFormProps {
  salon: Salon;
  userId: string;
}


const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Çalışma saatleri
const HOURS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];


type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

interface LocalAppointment {
  id: string;
  salonId: string;
  userId: string;
  barberId: string;
  serviceId: string;
  date: Timestamp;
  status: AppointmentStatus;
  createdAt: Timestamp;
}

export default function AppointmentForm({ salon, userId }: AppointmentFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [weeks, setWeeks] = useState<Date[][]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Haftalık tarihleri oluştur
  useEffect(() => {
    const generateWeeks = () => {
      const today = new Date();
      const weeks: Date[][] = [];
      let currentDate = new Date(today);

      const day = currentDate.getDay();
      const diff = day === 0 ? 1 : (1 - day);
      currentDate.setDate(currentDate.getDate() + diff);

      // 8 haftalık takvim oluştur
      for (let week = 0; week < 8; week++) {
        const weekDays: Date[] = [];
        for (let i = 0; i < 6; i++) { // Pazartesi-Cumartesi
          const date = new Date(currentDate);
          weekDays.push(date);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        if (week < 7) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(weekDays);
      }
      return weeks;
    };

    setWeeks(generateWeeks());
  }, []);

  // Seçili gün için randevuları getir
  useEffect(() => {
    const fetchAppointments = async () => {
      if (selectedDate && selectedBarber) {
        try {
          const dayAppointments = await getAppointmentsForDay(salon.id, selectedBarber, selectedDate);
          setAppointments(dayAppointments);
        } catch (error) {
          console.error('Randevular getirilirken hata:', error);
          
          setAppointments([]);
        }
      }
    };
    fetchAppointments();
  }, [selectedDate, selectedBarber, salon.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !selectedBarber || !selectedService) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const appointmentData: Omit<Appointment, 'id'> = {
        salonId: salon.id,
        userId,
        barberId: selectedBarber,
        serviceId: selectedService,
        date: Timestamp.fromDate(appointmentDate),
        status: 'PENDING',
        createdAt: Timestamp.fromDate(new Date())
      };

      await createAppointment(appointmentData);
      toast.success('Randevunuz başarıyla oluşturuldu!');
      
      // Form'u sıfırla
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedBarber('');
      setSelectedService('');
    } catch (error) {
      console.error('Randevu oluşturulurken hata:', error);
      toast.error('Randevu oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const isDateSelectable = (date: Date) => {
    return date >= new Date();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isTimeSlotAvailable = (time: string, date: Date) => {
    // Geçmiş tarih ve saatler için false döndür
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const slotDate = new Date(date);
    slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (slotDate < now) {
      return false;
    }

    // Mevcut randevuları kontrol et
    return !appointments.some(apt => {
      const aptDate = new Date(apt.date.seconds * 1000);
     
      return (aptDate.getTime() === slotDate.getTime() && 
             (apt.status === 'PENDING' || apt.status === 'CONFIRMED'));
    });
  };


  if (!salon || !salon.barbers || !salon.services) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Berber Seçimi */}
      <select
        value={selectedBarber}
        onChange={(e) => setSelectedBarber(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option key="select-barber" value="">Berber Seçin</option>
        {salon?.barbers?.filter(Boolean).map((barber) => (
          <option key={`barber-${barber.id || Math.random()}`} value={barber.id}>
            {barber.firstName} {barber.lastName}
          </option>
        ))}
      </select>

      {/* Hizmet Seçimi */}
      <select
        value={selectedService}
        onChange={(e) => setSelectedService(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option key="select-service" value="">Hizmet Seçin</option>
        {salon?.services?.filter(Boolean).map((service) => (
          <option key={`service-${service.id || Math.random()}`} value={service.id}>
            {service.name} - {service.price} ₺
          </option>
        ))}
      </select>

      {/* Hafta Navigasyonu */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
          disabled={currentWeekIndex === 0}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Önceki Hafta
        </button>
        <button
          onClick={() => setCurrentWeekIndex(prev => Math.min(7, prev + 1))}
          disabled={currentWeekIndex === 7}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Sonraki Hafta
        </button>
      </div>

      {/* Takvim */}
      {weeks[currentWeekIndex]?.map((date, dayIndex) => {
        const dateStr = date.toISOString();
        return (
          <div key={`day-${dateStr}`} className="border-b py-2">
            <div className="font-bold">{DAYS[dayIndex]} - {formatDate(date)}</div>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {HOURS.map((time) => {
                const isAvailable = isTimeSlotAvailable(time, date);
                const isSelected = selectedDate?.toDateString() === date.toDateString() && selectedTime === time;
                
                return (
                  <button
                    key={`slot-${dateStr}-${time}`}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTime(time);
                    }}
                    disabled={!isAvailable}
                    className={`p-2 text-sm rounded ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : isAvailable
                        ? 'bg-gray-100 hover:bg-gray-200'
                        : 'bg-red-100 cursor-not-allowed'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Randevu Oluştur Butonu */}
      <button
        onClick={handleSubmit}
        disabled={loading || !selectedDate || !selectedTime || !selectedBarber || !selectedService}
        className="w-full py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'İşleniyor...' : 'Randevu Oluştur'}
      </button>

      {/* Randevu durumunu gösteren bir bilgi mesajı ekleyelim */}
      {selectedDate && selectedTime && (
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <p className="text-sm text-yellow-800">
            Not: Randevunuz berber tarafından onaylandıktan sonra kesinleşecektir.
          </p>
        </div>
      )}
    </div>
  );
} 

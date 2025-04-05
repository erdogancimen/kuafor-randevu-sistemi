'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSalon } from '@/lib/firebase/db';
import { Salon } from '@/types/firebase';
import { toast } from 'react-hot-toast';
import AppointmentForm from '@/components/appointment/AppointmentForm';

export default function SalonDetail() {
  const { id } = useParams();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSalon = async () => {
      try {
        if (typeof id !== 'string') {
          throw new Error('Geçersiz salon ID');
        }

        const salonData = await getSalon(id);
        if (!salonData) {
          toast.error('Kuaför bulunamadı');
          return;
        }

        setSalon(salonData);
      } catch (error) {
        console.error('Kuaför bilgileri yüklenirken hata:', error);
        toast.error('Kuaför bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadSalon();
  }, [id]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!salon) {
    return <div>Kuaför bulunamadı</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{salon.salonName}</h1>
      <div className="mb-6">
        <p>Adres: {salon.address}</p>
        <p>Telefon: {salon.phone}</p>
        <p>E-posta: {salon.email}</p>
      </div>

      <AppointmentForm salon={salon} />
    </div>
  );
} 
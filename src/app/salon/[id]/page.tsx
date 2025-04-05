'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSalon } from '@/lib/firebase/db';
import { Salon } from '@/types/firebase';
import { FaMapMarkerAlt, FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import AppointmentForm from '@/components/appointment/AppointmentForm';

export default function SalonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSalon = async () => {
      try {
        if (typeof id === 'string') {
          const salonData = await getSalon(id);
          setSalon(salonData);
        }
      } catch (error) {
        console.error('Kuaför bilgileri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSalon();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  if (!salon) {
    return <div className="text-center py-8">Kuaför bulunamadı.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Kuaför Bilgileri */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {salon.salonName}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center text-gray-600 mb-2">
                  <FaMapMarkerAlt className="mr-2" />
                  {salon.address}
                </div>
                <div className="flex items-center text-gray-600 mb-2">
                  <FaPhone className="mr-2" />
                  {salon.phone}
                </div>
                <div className="flex items-center text-gray-600 mb-4">
                  <FaEnvelope className="mr-2" />
                  {salon.email}
                </div>
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400" />
                    <span className="ml-1 font-medium">
                      {salon.rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-600">
                    {salon.totalReviews || 0} değerlendirme
                  </span>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {salon.salonType === 'MEN' ? 'Erkek Kuaförü' :
                   salon.salonType === 'WOMEN' ? 'Kadın Kuaförü' : 'Karma Kuaför'}
                </span>
              </div>

              {/* Hizmetler Listesi */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Hizmetler</h3>
                <div className="space-y-2">
                  {salon.services?.map((service, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <span>{service.name}</span>
                      <span className="font-medium">{service.price} ₺</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Randevu Formu */}
        {user ? (
          <div className="mt-8">
            <AppointmentForm salon={salon} userId={user.uid} />
          </div>
        ) : (
          <div className="mt-8 text-center p-6 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              Randevu alabilmek için giriş yapmanız gerekmektedir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
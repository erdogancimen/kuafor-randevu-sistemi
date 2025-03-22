'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { createSalon } from '@/lib/firebase/db';
import { SalonRegistrationData } from '@/types/firebase';
import { UserCredential } from 'firebase/auth';

interface ServiceType {
  name: string;
  price: string;
}

type SalonType = 'MEN' | 'WOMEN' | 'BOTH';

interface BarberServiceType {
  name: string;
  price: string;
}

interface BarberType {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  services: BarberServiceType[];
}

export default function SalonRegisterForm() {
  const [formData, setFormData] = useState({
    salonName: '',
    ownerFirstName: '',
    ownerLastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    salonType: 'BOTH' as SalonType,
  });
  
  // Kuaförün genel hizmetleri
  const [services, setServices] = useState<ServiceType[]>([
    { name: '', price: '' }
  ]);
  
  // Çalışanlar
  const [barbers, setBarbers] = useState<BarberType[]>([
    {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      services: [{ name: '', price: '' }]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter uzunluğunda olmalıdır.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor!');
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signUp(formData.email, formData.password, formData.salonName);
      
      if (!userCredential?.user) {
        throw new Error('Kullanıcı oluşturulamadı');
      }

      // Kuaför verilerini hazırla
      const salonData: SalonRegistrationData = {
        salonName: formData.salonName,
        salonType: formData.salonType,
        ownerFirstName: formData.ownerFirstName,
        ownerLastName: formData.ownerLastName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        services: services.map(service => ({
          name: service.name,
          price: parseFloat(service.price) || 0
        })),
        barbers: barbers.map(barber => ({
          firstName: barber.firstName,
          lastName: barber.lastName,
          phone: barber.phone,
          email: barber.email,
          address: barber.address,
          services: barber.services.map(service => ({
            name: service.name,
            price: parseFloat(service.price) || 0
          }))
        }))
      };

      // Firestore'a kuaför verilerini kaydet
      await createSalon(userCredential.user.uid, salonData);
      
      toast.success('Kuaför hesabınız başarıyla oluşturuldu!');
      // Başarılı kayıttan sonra ana sayfaya yönlendir
      window.location.href = '/'; // Sayfayı yeniden yükleyerek yönlendir
    } catch (error: any) {
      console.error('Kayıt hatası:', error);
      if (error.code === 'auth/weak-password') {
        toast.error('Şifre en az 6 karakter uzunluğunda olmalıdır.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Bu e-posta adresi zaten kullanımda.');
      } else {
        toast.error('Kayıt olurken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Kuaför hizmetleri için fonksiyonlar
  const addService = () => {
    setServices([...services, { name: '', price: '' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: keyof ServiceType, value: string) => {
    const newServices = [...services];
    newServices[index][field] = value;
    setServices(newServices);
  };

  // Çalışanlar için fonksiyonlar
  const addBarber = () => {
    setBarbers([...barbers, {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      services: [{ name: '', price: '' }]
    }]);
  };

  const removeBarber = (index: number) => {
    setBarbers(barbers.filter((_, i) => i !== index));
  };

  const handleBarberChange = (barberIndex: number, field: keyof Omit<BarberType, 'services'>, value: string) => {
    const newBarbers = [...barbers];
    newBarbers[barberIndex][field] = value;
    setBarbers(newBarbers);
  };

  // Çalışan hizmetleri için fonksiyonlar
  const addBarberService = (barberIndex: number) => {
    const newBarbers = [...barbers];
    newBarbers[barberIndex].services.push({ name: '', price: '' });
    setBarbers(newBarbers);
  };

  const removeBarberService = (barberIndex: number, serviceIndex: number) => {
    const newBarbers = [...barbers];
    newBarbers[barberIndex].services = newBarbers[barberIndex].services.filter((_, i) => i !== serviceIndex);
    setBarbers(newBarbers);
  };

  const handleBarberServiceChange = (
    barberIndex: number,
    serviceIndex: number,
    field: keyof BarberServiceType,
    value: string
  ) => {
    const newBarbers = [...barbers];
    newBarbers[barberIndex].services[serviceIndex][field] = value;
    setBarbers(newBarbers);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Yeni Kuaför Kaydı
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Kuaför Bilgileri */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Kuaför Bilgileri</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="salonName" className="block text-sm font-medium text-gray-700">
                  Kuaför Adı
                </label>
                <input
                  id="salonName"
                  name="salonName"
                  type="text"
                  required
                  className="input mt-1"
                  value={formData.salonName}
                  onChange={handleChange}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kuaför Türü
                </label>
                <div className="flex gap-6">
                  <div className="flex items-center">
                    <input
                      id="salonType-men"
                      name="salonType"
                      type="radio"
                      value="MEN"
                      checked={formData.salonType === 'MEN'}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <label htmlFor="salonType-men" className="ml-2 block text-sm text-gray-700">
                      Erkek Kuaförü
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="salonType-women"
                      name="salonType"
                      type="radio"
                      value="WOMEN"
                      checked={formData.salonType === 'WOMEN'}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <label htmlFor="salonType-women" className="ml-2 block text-sm text-gray-700">
                      Kadın Kuaförü
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="salonType-both"
                      name="salonType"
                      type="radio"
                      value="BOTH"
                      checked={formData.salonType === 'BOTH'}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <label htmlFor="salonType-both" className="ml-2 block text-sm text-gray-700">
                      Karma Kuaför
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="ownerFirstName" className="block text-sm font-medium text-gray-700">
                  İşletme Sahibi Adı
                </label>
                <input
                  id="ownerFirstName"
                  name="ownerFirstName"
                  type="text"
                  required
                  className="input mt-1"
                  value={formData.ownerFirstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="ownerLastName" className="block text-sm font-medium text-gray-700">
                  İşletme Sahibi Soyadı
                </label>
                <input
                  id="ownerLastName"
                  name="ownerLastName"
                  type="text"
                  required
                  className="input mt-1"
                  value={formData.ownerLastName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="input mt-1"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input mt-1"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Adres
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  className="input mt-1"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Kuaför Genel Hizmetleri */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Kuaför Hizmetleri</h3>
              <button
                type="button"
                onClick={addService}
                className="btn btn-secondary"
              >
                Hizmet Ekle
              </button>
            </div>
            {services.map((service, index) => (
              <div key={index} className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                <div>
                  <input
                    type="text"
                    placeholder="Hizmet Adı"
                    className="input"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Fiyat"
                    className="input"
                    value={service.price}
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeService(index)}
                    className="btn btn-secondary"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Çalışanlar */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Çalışanlar</h3>
              <button
                type="button"
                onClick={addBarber}
                className="btn btn-secondary"
              >
                Çalışan Ekle
              </button>
            </div>
            {barbers.map((barber, barberIndex) => (
              <div key={barberIndex} className="mb-8 border-b pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium">Çalışan #{barberIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeBarber(barberIndex)}
                    className="btn btn-secondary"
                  >
                    Çalışanı Sil
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ad</label>
                    <input
                      type="text"
                      className="input mt-1"
                      value={barber.firstName}
                      onChange={(e) => handleBarberChange(barberIndex, 'firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Soyad</label>
                    <input
                      type="text"
                      className="input mt-1"
                      value={barber.lastName}
                      onChange={(e) => handleBarberChange(barberIndex, 'lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefon</label>
                    <input
                      type="tel"
                      className="input mt-1"
                      value={barber.phone}
                      onChange={(e) => handleBarberChange(barberIndex, 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="input mt-1"
                      value={barber.email}
                      onChange={(e) => handleBarberChange(barberIndex, 'email', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Adres</label>
                    <textarea
                      className="input mt-1"
                      rows={3}
                      value={barber.address}
                      onChange={(e) => handleBarberChange(barberIndex, 'address', e.target.value)}
                    />
                  </div>
                </div>

                {/* Çalışan Hizmetleri */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-sm font-medium">Çalışan Hizmetleri</h5>
                    <button
                      type="button"
                      onClick={() => addBarberService(barberIndex)}
                      className="btn btn-secondary text-sm"
                    >
                      Hizmet Ekle
                    </button>
                  </div>
                  {barber.services.map((service, serviceIndex) => (
                    <div key={serviceIndex} className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Hizmet Adı"
                          className="input"
                          value={service.name}
                          onChange={(e) => handleBarberServiceChange(barberIndex, serviceIndex, 'name', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Fiyat"
                          className="input"
                          value={service.price}
                          onChange={(e) => handleBarberServiceChange(barberIndex, serviceIndex, 'price', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeBarberService(barberIndex, serviceIndex)}
                          className="btn btn-secondary"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Şifre */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Güvenlik</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input mt-1"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Şifre Tekrar
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="input mt-1"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Service {
  name: string;
  price: number;
}

export default function BarberRegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [barberType, setBarberType] = useState('male');
  const [workingHours, setWorkingHours] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddService = () => {
    if (!newService.name.trim() || !newService.price.trim()) {
      setError('Lütfen hizmet adı ve ücretini girin');
      return;
    }

    const price = parseFloat(newService.price);
    if (isNaN(price) || price <= 0) {
      setError('Geçerli bir ücret girin');
      return;
    }

    setServices([...services, { name: newService.name, price }]);
    setNewService({ name: '', price: '' });
    setError('');
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (services.length === 0) {
      setError('En az bir hizmet eklemelisiniz');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        phone,
        email,
        address,
        barberType,
        role: 'barber',
        workingHours,
        services,
        latitude,
        longitude,
        imageUrl,
        rating: 0,
        createdAt: new Date().toISOString()
      });

      toast.success('Kayıt başarılı!');
      router.push('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          toast.success('Konum başarıyla alındı');
        },
        (error) => {
          toast.error('Konum alınamadı: ' + error.message);
        }
      );
    } else {
      toast.error('Tarayıcınız konum özelliğini desteklemiyor');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Kuaför Kayıt</h1>
            <p className="text-gray-600">İşletmenizi kaydedin ve müşterilerinizi yönetin</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Ad
                  </label>
                  <input
                    id="first-name"
                    name="firstName"
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                    placeholder="Adınız"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Soyad
                  </label>
                  <input
                    id="last-name"
                    name="lastName"
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                    placeholder="Soyadınız"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="Telefon numaranız"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="E-posta adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="İşletme adresiniz"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="working-hours" className="block text-sm font-medium text-gray-700 mb-1">
                  Çalışma Saatleri
                </label>
                <input
                  id="working-hours"
                  name="workingHours"
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="Örn: 09:00-18:00"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hizmetler
                </label>
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{service.name}</span>
                        <span className="ml-2 text-indigo-600">{service.price} TL</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Hizmet adı"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Ücret (TL)"
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="barber-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Kuaför Türü
                </label>
                <select
                  id="barber-type"
                  name="barberType"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black"
                  value={barberType}
                  onChange={(e) => setBarberType(e.target.value)}
                >
                  <option value="male">Erkek Kuaförü</option>
                  <option value="female">Kadın Kuaförü</option>
                  <option value="mixed">Karma Kuaför</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="Şifreniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre Tekrarı
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black placeholder-gray-500"
                  placeholder="Şifrenizi tekrarınız"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konum
                </label>
                <button
                  type="button"
                  onClick={handleLocation}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-black bg-gray-50 hover:bg-gray-100"
                >
                  Konumumu Al
                </button>
                {latitude !== 0 && longitude !== 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Konum: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
              </button>

              <div className="text-center space-y-3">
                <Link
                  href="/login"
                  className="block text-sm text-indigo-600 hover:text-indigo-500 transition"
                >
                  Zaten hesabınız var mı? Giriş yapın
                </Link>
                <Link
                  href="/register/customer"
                  className="block text-sm text-indigo-600 hover:text-indigo-500 transition"
                >
                  Müşteri olarak kayıt olmak için tıklayın
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 
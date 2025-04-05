'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import UserRegisterForm from '@/components/auth/UserRegisterForm';
import SalonRegisterForm from '@/components/auth/SalonRegisterForm';
import { Salon } from '@/types/firebase';
import { searchSalons } from '@/lib/firebase/db';
import { FaHome, FaSearch, FaMapMarkerAlt, FaStar } from 'react-icons/fa';

export default function Home() {
  const { user, signOut } = useAuth();
  const [activeForm, setActiveForm] = useState<'login' | 'userRegister' | 'salonRegister' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'MEN' | 'WOMEN' | 'BOTH'>('ALL');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSalons();
  }, [selectedType]); // selectedType değiştiğinde kuaförleri yeniden yükle

  const loadSalons = async () => {
    try {
      setLoading(true);
      const salonType = selectedType === 'ALL' ? undefined : selectedType;
      const results = await searchSalons(salonType, searchTerm);
      setSalons(results);
    } catch (error) {
      console.error('Kuaförler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSalons();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setActiveForm(null);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  // Form sayfalarını göster
  if (activeForm) {
    return (
      <main className="auth-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-4 py-6">
            <button
              onClick={() => setActiveForm(null)}
              className="flex items-center px-4 py-2 rounded-md bg-white text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <FaHome className="mr-2" />
              Ana Sayfa
            </button>
            <button
              onClick={() => setActiveForm('login')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeForm === 'login'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setActiveForm('userRegister')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeForm === 'userRegister'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Müşteri Kaydı
            </button>
            <button
              onClick={() => setActiveForm('salonRegister')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeForm === 'salonRegister'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Kuaför Kaydı
            </button>
          </div>
          <div className="form-container">
            {activeForm === 'login' && <LoginForm />}
            {activeForm === 'userRegister' && <UserRegisterForm />}
            {activeForm === 'salonRegister' && <SalonRegisterForm />}
          </div>
        </div>
      </main>
    );
  }

  // Ana sayfayı göster
  return (
    <div className="home-background">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">KuaförRandevu</h1>
            <div className="flex gap-4">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                >
                  Çıkış Yap
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setActiveForm('login')}
                    className="btn btn-primary"
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => setActiveForm('userRegister')}
                    className="btn btn-secondary"
                  >
                    Müşteri Kaydı
                  </button>
                  <button
                    onClick={() => setActiveForm('salonRegister')}
                    className="btn btn-secondary"
                  >
                    Kuaför Kaydı
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Kuaför adı ara..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="input"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
              >
                <option value="ALL">Tüm Kuaförler</option>
                <option value="MEN">Erkek Kuaförü</option>
                <option value="WOMEN">Kadın Kuaförü</option>
                <option value="BOTH">Karma Kuaför</option>
              </select>
              <button
                onClick={handleSearch}
                className="btn btn-primary"
              >
                Ara
              </button>
            </div>
          </div>
        </div>

        {/* Salon List */}
        {loading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <div key={salon.id} className="bg-white/10 backdrop-blur-sm rounded-lg shadow overflow-hidden hover:bg-white/20 transition-all">
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">{salon.salonName}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <FaMapMarkerAlt className="mr-1" />
                    {salon.address}
                  </div>
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      <FaStar className="text-yellow-400" />
                      <span className="ml-1 text-sm font-medium">
                        {salon.rating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-sm text-gray-600">
                      {salon.totalReviews || 0} değerlendirme
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {salon.salonType === 'MEN' ? 'Erkek Kuaförü' :
                       salon.salonType === 'WOMEN' ? 'Kadın Kuaförü' : 'Karma Kuaför'}
                    </span>
                    <button
                      onClick={() => window.location.href = `/salon/${salon.id}`}
                      className="btn btn-primary"
                    >
                      Randevu Al
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && salons.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            Arama kriterlerinize uygun kuaför bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
} 
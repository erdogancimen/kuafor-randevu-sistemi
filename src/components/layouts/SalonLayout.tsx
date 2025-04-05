'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'SALON') {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Kuaför Paneli</h1>
        </div>
        <nav className="mt-8">
          <Link 
            href="/salon/dashboard" 
            className="block px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/salon/appointments" 
            className="block px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Randevular
          </Link>
          <Link 
            href="/salon/services" 
            className="block px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Hizmetler
          </Link>
          <Link 
            href="/salon/barbers" 
            className="block px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Çalışanlar
          </Link>
          <Link 
            href="/salon/profile" 
            className="block px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Profil
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-100">
        <header className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Kuaför Yönetim Paneli
              </h2>
              <button 
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 
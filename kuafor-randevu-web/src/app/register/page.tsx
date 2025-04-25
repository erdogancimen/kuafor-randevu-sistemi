'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'customer' | 'barber'>('customer');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hesap Oluştur
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Giriş yapın
            </Link>
          </p>
        </div>

        <div className="mt-8">
          <div className="flex rounded-lg shadow-sm mb-6">
            <button
              type="button"
              onClick={() => setUserType('customer')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                userType === 'customer'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setUserType('barber')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                userType === 'barber'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Kuaför
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => router.push(`/register/${userType}`)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {userType === 'customer' ? 'Müşteri Kaydı Oluştur' : 'Kuaför Kaydı Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
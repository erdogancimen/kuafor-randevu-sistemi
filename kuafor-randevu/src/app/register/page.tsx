'use client';

import { useState } from 'react';
import Link from 'next/link';
import CustomerRegisterForm from '@/app/register/customer-form';
import BarberRegisterForm from '@/app/register/barber-form';

type UserType = 'customer' | 'barber';

export default function RegisterPage() {
  const [userType, setUserType] = useState<UserType>('customer');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hesap Oluştur
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Giriş Yap
            </Link>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setUserType('customer')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                userType === 'customer'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Müşteri Kaydı
            </button>
            <button
              onClick={() => setUserType('barber')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                userType === 'barber'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kuaför Kaydı
            </button>
          </div>

          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {userType === 'customer' ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Müşteri Kayıt Formu</h3>
                <CustomerRegisterForm />
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Kuaför Kayıt Formu</h3>
                <BarberRegisterForm />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
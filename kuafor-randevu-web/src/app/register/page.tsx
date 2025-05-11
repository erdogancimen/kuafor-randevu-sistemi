'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Scissors } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<'customer' | 'barber'>('customer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-primary" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Kuaför Randevu Sistemi
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                "En iyi kuaförleri keşfedin, kolayca randevu alın ve güzelliğinizi ön plana çıkarın."
              </p>
              <footer className="text-sm">Kuaför Randevu Sistemi</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Hesap Oluştur
              </h1>
              <p className="text-sm text-muted-foreground">
                Hesap türünü seçin ve kayıt olun
              </p>
            </div>
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserType('customer')}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${
                      userType === 'customer'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : ''
                    }`}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Müşteri
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('barber')}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${
                      userType === 'barber'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : ''
                    }`}
                  >
                    <Scissors className="mr-2 h-4 w-4" />
                    Kuaför
                  </button>
                </div>
                <button
                  onClick={() => router.push(`/register/${userType}`)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {userType === 'customer' ? 'Müşteri Kaydı Oluştur' : 'Kuaför Kaydı Oluştur'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    veya
                  </span>
                </div>
              </div>
              <p className="px-8 text-center text-sm text-muted-foreground">
                Zaten hesabınız var mı?{' '}
                <Link
                  href="/login"
                  className="hover:text-brand underline underline-offset-4"
                >
                  Giriş yapın
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
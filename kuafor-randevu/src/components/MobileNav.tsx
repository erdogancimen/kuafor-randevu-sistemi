'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="lg:hidden">
      {/* Mobil Menü Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-4 bg-primary-600 text-white rounded-full shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobil Menü İçeriği */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-white">
          <div className="flex flex-col h-full p-4">
            <div className="flex-1 space-y-4">
              <Link
                href="/"
                className="block px-4 py-2 text-lg font-medium text-gray-900"
                onClick={() => setIsOpen(false)}
              >
                Ana Sayfa
              </Link>
              
              {userData?.userType === 'barber' ? (
                <Link
                  href="/barber-dashboard"
                  className="block px-4 py-2 text-lg font-medium text-gray-900"
                  onClick={() => setIsOpen(false)}
                >
                  Randevularım
                </Link>
              ) : (
                <Link
                  href="/appointments"
                  className="block px-4 py-2 text-lg font-medium text-gray-900"
                  onClick={() => setIsOpen(false)}
                >
                  Randevularım
                </Link>
              )}

              {currentUser ? (
                <>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-lg font-medium text-gray-900"
                    onClick={() => setIsOpen(false)}
                  >
                    Profilim
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-lg font-medium text-red-600"
                  >
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-lg font-medium text-gray-900"
                    onClick={() => setIsOpen(false)}
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/register"
                    className="block px-4 py-2 text-lg font-medium text-gray-900"
                    onClick={() => setIsOpen(false)}
                  >
                    Kayıt Ol
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { createUserWithRole, getUserRole } from '@/lib/firebase/db';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function SetupRole() {
  const router = useRouter();
  const [status, setStatus] = useState('Kontrol ediliyor...');

  useEffect(() => {
    const setupUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Önce mevcut rolü kontrol et
          const existingRole = await getUserRole(currentUser.uid);
          
          if (existingRole) {
            setStatus('Rol zaten atanmış, yönlendiriliyor...');
            toast.success('Rol zaten atanmış');
            router.push('/salon/dashboard');
            return;
          }

          // Rol yoksa yeni rol ata
          await createUserWithRole(currentUser.uid, currentUser.email || '', 'SALON');
          setStatus('Rol başarıyla atandı, yönlendiriliyor...');
          toast.success('Rol başarıyla atandı');
          router.push('/salon/dashboard');
        } catch (error) {
          console.error('Rol atama hatası:', error);
          setStatus('Rol atama hatası!');
          toast.error('Rol atama sırasında bir hata oluştu');
        }
      } else {
        setStatus('Kullanıcı girişi bulunamadı!');
        toast.error('Lütfen önce giriş yapın');
        router.push('/login');
      }
    };

    setupUserRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-xl font-semibold mb-4">Rol Ayarlanıyor</h1>
        <p className="text-gray-600">{status}</p>
        <div className="mt-4 animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Kullanıcı rolünü kontrol et
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData) {
        if (userData.role === 'barber') {
          router.push('/barber/profile');
        } else if (userData.role === 'employee') {
          router.push('/employee/profile');
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }

      toast.success('Giriş başarılı!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Giriş Yap</h1>
          <p className="text-gray-400">Hesabınıza giriş yapın</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-8 border border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                E-posta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition text-white placeholder-gray-500"
                  placeholder="E-posta adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition text-white placeholder-gray-500"
                  placeholder="Şifreniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>

            <div className="text-center space-y-3">
              <Link
                href="/register/customer"
                className="block text-sm text-gray-400 hover:text-gray-300 transition"
              >
                Hesabınız yok mu? Kayıt olun
              </Link>
              <Link
                href="/register/barber"
                className="block text-sm text-gray-400 hover:text-gray-300 transition"
              >
                Kuaför olarak kayıt olmak için tıklayın
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
import { signInWithRole } from '@/lib/firebase/auth';

export default function Login() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithRole(email, password);
      // Yönlendirme AuthContext tarafından yapılacak
    } catch (error) {
      console.error('Giriş yapılırken hata:', error);
      toast.error('Giriş yapılamadı');
    }
  };

  // ... diğer kodlar
} 
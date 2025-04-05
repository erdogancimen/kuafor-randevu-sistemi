import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export async function signInWithRole(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore'dan kullanıcı rolünü kontrol et
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    if (!userData || !userData.role) {
      throw new Error('Kullanıcı rolü bulunamadı');
    }

    return userCredential;
  } catch (error) {
    throw error;
  }
} 
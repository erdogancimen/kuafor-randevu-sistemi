import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase-config';
import { 
  User, 
  Salon, 
  SalonRegistrationData, 
  UserRegistrationData,
  Service,
  Barber
} from '@/types/firebase';

// Kullanıcı işlemleri
export const createUser = async (userId: string, userData: UserRegistrationData, role: 'USER' | 'SALON') => {
  const user: Omit<User, 'id'> = {
    email: userData.email,
    role: role,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  await setDoc(doc(db, 'users', userId), user);
  return { id: userId, ...user };
};

export const getUser = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() } as User;
};

// Kuaför işlemleri
export const createSalon = async (userId: string, salonData: SalonRegistrationData) => {
  const salon: Omit<Salon, 'id'> = {
    ownerId: userId,
    salonName: salonData.salonName,
    salonType: salonData.salonType,
    ownerFirstName: salonData.ownerFirstName,
    ownerLastName: salonData.ownerLastName,
    phone: salonData.phone,
    email: salonData.email,
    address: salonData.address,
    services: salonData.services,
    barbers: salonData.barbers,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    rating: 0,
    totalReviews: 0
  };

  const salonRef = doc(collection(db, 'salons'));
  await setDoc(salonRef, salon);
  return { id: salonRef.id, ...salon };
};

export const getSalon = async (salonId: string) => {
  const salonDoc = await getDoc(doc(db, 'salons', salonId));
  if (!salonDoc.exists()) return null;
  return { id: salonDoc.id, ...salonDoc.data() } as Salon;
};

export const updateSalon = async (salonId: string, updateData: Partial<Salon>) => {
  const updateObject = {
    ...updateData,
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(doc(db, 'salons', salonId), updateObject);
};

// Kuaför arama işlemleri
export const searchSalons = async (salonType?: string, searchTerm?: string) => {
  try {
    let q = collection(db, 'salons');
    
    if (salonType && salonType !== 'ALL') {
      q = query(q, where('salonType', '==', salonType));
    }

    const querySnapshot = await getDocs(q);
    const salons: Salon[] = [];

    querySnapshot.forEach((doc) => {
      const salonData = doc.data();
      if (!searchTerm || 
          salonData.salonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          salonData.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        salons.push({ id: doc.id, ...salonData } as Salon);
      }
    });

    return salons;
  } catch (error) {
    console.error('Kuaförler yüklenirken hata:', error);
    return [];
  }
}; 
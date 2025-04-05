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
  serverTimestamp,
  addDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  User, 
  Salon, 
  SalonRegistrationData, 
  UserRegistrationData,
  Service,
  Barber,
  Appointment,
  AppointmentStatus,
  UserRole
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
  if (!salonId) {
    throw new Error('Salon ID gerekli');
  }

  try {
    const salonRef = doc(db, 'salons', salonId);
    const salonDoc = await getDoc(salonRef);

    if (!salonDoc.exists()) {
      return null;
    }

    return {
      id: salonDoc.id,
      ...salonDoc.data()
    } as Salon;
  } catch (error) {
    console.error('Salon bilgileri getirilirken hata:', error);
    throw error;
  }
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
    const collectionRef = collection(db, 'salons');
    
    // Base query oluştur
    let queryRef = salonType && salonType !== 'ALL' 
      ? query(collectionRef, where('salonType', '==', salonType))
      : query(collectionRef);

    const querySnapshot = await getDocs(queryRef);
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

// Randevu oluştur
export const createAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
  try {
    // Önce kuaför bilgilerini kontrol et
    const salon = await getSalon(appointmentData.salonId);
    if (!salon) {
      throw new Error('Kuaför bulunamadı');
    }

    // Randevu çakışması kontrolü
    const existingAppointment = await checkExistingAppointment(
      appointmentData.salonId,
      appointmentData.barberId,
      appointmentData.date
    );

    if (existingAppointment) {
      throw new Error('Bu saatte başka bir randevu bulunmaktadır');
    }

    const appointmentRef = collection(db, 'appointments');
    const newAppointment = {
      ...appointmentData,
      createdAt: serverTimestamp(),
      status: 'PENDING' as AppointmentStatus
    };

    const docRef = await addDoc(appointmentRef, newAppointment);
    return {
      id: docRef.id,
      ...newAppointment
    };
  } catch (error) {
    console.error('Randevu oluşturulurken hata:', error);
    throw error;
  }
};

// Randevu çakışması kontrolü
const checkExistingAppointment = async (
  salonId: string,
  barberId: string,
  date: Timestamp
) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('salonId', '==', salonId),
      where('barberId', '==', barberId),
      where('date', '==', date),
      where('status', 'in', ['PENDING', 'CONFIRMED'])
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Randevu kontrolü yapılırken hata:', error);
    throw error;
  }
};

// Belirli bir gün için randevuları getiren fonksiyon
export const getAppointmentsForDay = async (
  salonId: string,
  barberId: string,
  date: Date
): Promise<Appointment[]> => {
  try {
    // Seçilen günün başlangıç ve bitiş zamanlarını ayarla
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Firestore sorgusu
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('salonId', '==', salonId),
      where('barberId', '==', barberId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[];
  } catch (error) {
    console.error('Randevular getirilirken hata:', error);
    throw error;
  }
};

// Berber randevularını getir
export const getBarberAppointments = async (salonId: string | undefined) => {
  if (!salonId) {
    throw new Error('Salon ID\'si gerekli');
  }

  try {
    const appointmentsRef = collection(db, 'appointments');
    const today = Timestamp.fromDate(new Date());

    // Sorguyu basitleştirelim
    const q = query(
      appointmentsRef,
      where('salonId', '==', salonId),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[];
  } catch (error) {
    console.error('Berber randevuları getirilirken hata:', error);
    throw error;
  }
};

export async function updateAppointmentStatus(
  appointmentId: string, 
  status: AppointmentStatus
) {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, { status });
  } catch (error) {
    console.error('Randevu durumu güncellenirken hata:', error);
    throw error;
  }
}

// Users koleksiyonu için tip tanımı
interface UserData {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createUserWithRole(uid: string, email: string, role: UserRole) {
  try {
    // Users koleksiyonunda yeni bir döküman oluştur
    const userRef = doc(db, 'users', uid);
    
    const userData: UserData = {
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Dökümanı oluştur veya güncelle
    await setDoc(userRef, userData);
    
    console.log('Kullanıcı başarıyla oluşturuldu:', uid);
    return userData;
  } catch (error) {
    console.error('Kullanıcı oluşturulurken hata:', error);
    throw error;
  }
}

// Kullanıcı rolünü kontrol etmek için fonksiyon
export async function getUserRole(uid: string): Promise<UserRole | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserData;
      return userData.role;
    }
    
    return null;
  } catch (error) {
    console.error('Kullanıcı rolü kontrol edilirken hata:', error);
    throw error;
  }
} 
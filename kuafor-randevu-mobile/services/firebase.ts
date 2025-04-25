import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { Barber, Review, Service, WorkingHours } from '../types';

// Auth Functions
export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Barber Functions
export const getBarbers = async () => {
  try {
    const barbersRef = collection(db, 'barbers');
    const q = query(barbersRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barber));
  } catch (error) {
    throw error;
  }
};

export const getBarberById = async (id: string) => {
  try {
    const barberRef = doc(db, 'barbers', id);
    const barberDoc = await getDoc(barberRef);
    if (barberDoc.exists()) {
      return { id: barberDoc.id, ...barberDoc.data() } as Barber;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getTopRatedBarbers = async (limitCount: number = 5) => {
  try {
    const barbersRef = collection(db, 'barbers');
    const q = query(barbersRef, orderBy('rating', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barber));
  } catch (error) {
    throw error;
  }
};

// Review Functions
export const getReviewsByBarberId = async (barberId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('barberId', '==', barberId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: new Date(doc.data().createdAt)
    })) as Review[];
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw error;
  }
};

export const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const newReview = {
      ...review,
      createdAt: new Date()
    };
    const docRef = await addDoc(reviewsRef, newReview);
    return { id: docRef.id, ...newReview } as Review;
  } catch (error) {
    throw error;
  }
};

export const getReviews = async (barberId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('barberId', '==', barberId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: new Date(doc.data().createdAt)
    })) as Review[];
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw error;
  }
};

// Service Functions
export const getServicesByBarberId = async (barberId: string) => {
  try {
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef, where('barberId', '==', barberId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
  } catch (error) {
    throw error;
  }
};

// Working Hours Functions
export const getWorkingHoursByBarberId = async (barberId: string): Promise<WorkingHours[]> => {
  try {
    const workingHoursRef = collection(db, 'workingHours');
    const q = query(workingHoursRef, where('barberId', '==', barberId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as WorkingHours[];
  } catch (error) {
    console.error('Error getting working hours:', error);
    throw error;
  }
};

interface BaseUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'customer' | 'barber';
}

interface CustomerUser extends BaseUser {
  role: 'customer';
}

interface BarberUser extends BaseUser {
  role: 'barber';
  barberType: 'male' | 'female' | 'mixed';
}

type User = CustomerUser | BarberUser;

export const createUser = async (userData: User, uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}; 
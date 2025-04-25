import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Query } from 'firebase/firestore';
import { User, Barber, Service, Appointment, Review, Message } from '../types';

// User Services
export const createUser = async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'users'), {
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const getUsers = async () => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Barber Services
export const createBarber = async (barber: Omit<Barber, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'barbers'), {
    ...barber,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const getBarbers = async () => {
  const querySnapshot = await getDocs(collection(db, 'barbers'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barber));
};

// Service Services
export const createService = async (service: Omit<Service, 'id'>) => {
  const docRef = await addDoc(collection(db, 'services'), service);
  return docRef.id;
};

export const getServices = async (barberId?: string) => {
  let q: Query = collection(db, 'services');
  if (barberId) {
    q = query(q, where('barberId', '==', barberId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
};

// Appointment Services
export const createAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'appointments'), {
    ...appointment,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const getAppointments = async (userId?: string, barberId?: string) => {
  let q: Query = collection(db, 'appointments');
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  if (barberId) {
    q = query(q, where('barberId', '==', barberId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
};

// Review Services
export const createReview = async (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'reviews'), {
    ...review,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const getReviews = async (barberId: string) => {
  const q = query(collection(db, 'reviews'), where('barberId', '==', barberId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
};

// Message Services
export const createMessage = async (message: Omit<Message, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...message,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const getMessages = async (userId: string, otherUserId: string) => {
  const q = query(
    collection(db, 'messages'),
    where('senderId', 'in', [userId, otherUserId]),
    where('receiverId', 'in', [userId, otherUserId])
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}; 
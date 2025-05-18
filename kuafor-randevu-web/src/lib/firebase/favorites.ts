import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';

export interface Favorite {
  id: string;
  barberId: string;
  barberName: string;
  barberImage?: string;
  addedAt: Date;
}

export const addToFavorites = async (userId: string, barberId: string, barberName: string, barberImage?: string) => {
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', barberId);
    await setDoc(favoriteRef, {
      barberId,
      barberName,
      barberImage,
      addedAt: new Date()
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

export const removeFromFavorites = async (userId: string, barberId: string) => {
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', barberId);
    await deleteDoc(favoriteRef);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

export const getFavorites = async (userId: string): Promise<Favorite[]> => {
  try {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const querySnapshot = await getDocs(favoritesRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Favorite[];
  } catch (error) {
    console.error('Error getting favorites:', error);
    throw error;
  }
};

export const isFavorite = async (userId: string, barberId: string): Promise<boolean> => {
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', barberId);
    const favoriteDoc = await getDoc(favoriteRef);
    return favoriteDoc.exists();
  } catch (error) {
    console.error('Error checking favorite status:', error);
    throw error;
  }
}; 
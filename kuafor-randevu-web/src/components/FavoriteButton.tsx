'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Favorite } from '@/types/favorite';

interface FavoriteButtonProps {
  barberId: string;
  barberName: string;
  barberImage?: string;
}

export default function FavoriteButton({ barberId, barberName, barberImage }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(
          favoritesRef,
          where('userId', '==', auth.currentUser.uid),
          where('barberId', '==', barberId)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setIsFavorite(true);
          setFavoriteId(querySnapshot.docs[0].id);
        }
      } catch (error) {
        console.error('Error checking favorite:', error);
        toast.error('Favori durumu kontrol edilirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    checkFavorite();
  }, [barberId]);

  const toggleFavorite = async () => {
    if (!auth.currentUser) {
      toast.error('Lütfen önce giriş yapın');
      return;
    }

    try {
      if (isFavorite && favoriteId) {
        // Favorilerden çıkar
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
        toast.success('Kuaför favorilerden çıkarıldı');
      } else {
        // Favorilere ekle
        const favoriteData: Omit<Favorite, 'id'> = {
          userId: auth.currentUser.uid,
          barberId,
          barberName,
          ...(barberImage && { barberImage }), // Sadece barberImage varsa ekle
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'favorites'), favoriteData);
        setIsFavorite(true);
        setFavoriteId(docRef.id);
        toast.success('Kuaför favorilere eklendi');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return <div className="w-8 h-8" />;
  }

  return (
    <button
      onClick={toggleFavorite}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
    >
      <Heart
        className={`w-6 h-6 ${
          isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
        }`}
      />
    </button>
  );
} 
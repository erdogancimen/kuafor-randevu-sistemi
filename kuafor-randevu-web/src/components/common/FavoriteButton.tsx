'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { toast } from 'react-hot-toast';

interface FavoriteButtonProps {
  barberId: string;
  barberName: string;
  barberImage?: string;
}

export default function FavoriteButton({ barberId, barberName, barberImage }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const favoriteRef = doc(db, 'users', auth.currentUser.uid, 'favorites', barberId);
        const favoriteDoc = await getDoc(favoriteRef);
        setIsFavorite(favoriteDoc.exists());
      } catch (error) {
        console.error('Error checking favorite status:', error);
        toast.error('Favori durumu kontrol edilirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    checkFavoriteStatus();
  }, [barberId]);

  const toggleFavorite = async () => {
    if (!auth.currentUser) {
      toast.error('Lütfen önce giriş yapın');
      return;
    }

    try {
      setLoading(true);
      const favoriteRef = doc(db, 'users', auth.currentUser.uid, 'favorites', barberId);

      if (isFavorite) {
        await deleteDoc(favoriteRef);
        setIsFavorite(false);
        toast.success(`${barberName} favorilerden çıkarıldı`);
      } else {
        await setDoc(favoriteRef, {
          barberId,
          barberName,
          barberImage,
          addedAt: new Date()
        });
        setIsFavorite(true);
        toast.success(`${barberName} favorilere eklendi`);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Favori işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="p-2 rounded-full bg-gray-800/50 text-gray-400 cursor-not-allowed"
      >
        <Heart className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`p-2 rounded-full transition ${
        isFavorite
          ? 'bg-primary/20 text-primary hover:bg-primary/30'
          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
} 
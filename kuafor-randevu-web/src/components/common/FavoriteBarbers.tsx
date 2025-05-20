'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { MapPin, Star, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FavoriteBarber {
  id: string;
  name: string;
  address: string;
  rating: number;
  photoURL?: string;
}

interface BarberData extends DocumentData {
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  rating?: number;
  photoURL?: string;
}

export default function FavoriteBarbers() {
  const [favorites, setFavorites] = useState<FavoriteBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      const favoritesSnapshot = await getDocs(favoritesRef);
      
      const favoriteBarbers: FavoriteBarber[] = [];
      
      for (const docSnapshot of favoritesSnapshot.docs) {
        const barberData = docSnapshot.data();
        const barberDoc = await getDoc(doc(db, 'users', barberData.barberId));
        
        if (barberDoc.exists()) {
          const barber = barberDoc.data() as BarberData;
          favoriteBarbers.push({
            id: barberDoc.id,
            name: barber.name || `${barber.firstName || ''} ${barber.lastName || ''}`.trim(),
            address: barber.address || '',
            rating: barber.rating || 0,
            photoURL: barber.photoURL
          });
        }
      }
      
      setFavorites(favoriteBarbers);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Favori kuaförler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Henüz favori kuaförünüz bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((barber) => (
        <div
          key={barber.id}
          onClick={() => router.push(`/barber/${barber.id}`)}
          className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
        >
          <div className="relative h-12 w-12 overflow-hidden rounded-full">
            <Image
              src={barber.photoURL || '/images/default-barber.jpg'}
              alt={barber.name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized={!barber.photoURL}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{barber.name}</h4>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{barber.address}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{barber.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
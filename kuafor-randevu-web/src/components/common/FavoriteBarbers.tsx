'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';

interface FavoriteBarber {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  rating: number;
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
    try {
      const favoritesRef = collection(db, 'users', user!.uid, 'favorites');
      const favoritesSnapshot = await getDocs(favoritesRef);
      
      const favoriteBarbers: FavoriteBarber[] = [];
      
      for (const doc of favoritesSnapshot.docs) {
        const barberData = doc.data();
        const barberDoc = await getDocs(
          query(collection(db, 'users'), where('id', '==', barberData.barberId))
        );
        
        if (!barberDoc.empty) {
          const barber = barberDoc.docs[0].data();
          favoriteBarbers.push({
            id: barberDoc.docs[0].id,
            firstName: barber.firstName,
            lastName: barber.lastName,
            address: barber.address,
            rating: barber.rating || 0,
            photoURL: barber.photoURL
          });
        }
      }
      
      setFavorites(favoriteBarbers);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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
              alt={`${barber.firstName} ${barber.lastName}`}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized={!barber.photoURL}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">
              {barber.firstName} {barber.lastName}
            </h4>
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
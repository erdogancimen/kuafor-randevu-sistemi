'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import { db, auth } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Favorite } from '@/types/favorite';

export default function FavoriteBarbers() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!auth.currentUser) return;

      try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(
          favoritesRef,
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const favoritesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Favorite[];

        setFavorites(favoritesData);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Yükleniyor...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Henüz favori kuaförünüz bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((favorite) => (
        <div
          key={favorite.id}
          className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(`/barber/${favorite.barberId}`)}
        >
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden">
              <Image
                src={favorite.barberImage || '/images/default-barber.jpg'}
                alt={favorite.barberName}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{favorite.barberName}</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                <span>Kuaför</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
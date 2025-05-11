'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Review } from '@/types/review';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ReviewListProps {
  barberId: string;
}

export default function ReviewList({ barberId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(
          reviewsRef,
          where('barberId', '==', barberId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const reviewsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];

        setReviews(reviewsData);

        // Ortalama puanı hesapla
        if (reviewsData.length > 0) {
          const total = reviewsData.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(total / reviewsData.length);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [barberId]);

  if (loading) {
    return <div className="text-center py-4">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Ortalama Puan */}
      <div className="flex items-center justify-center space-x-2">
        <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= Math.round(averageRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          ({reviews.length} değerlendirme)
        </div>
      </div>

      {/* Değerlendirme Listesi */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{review.userName}</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(review.createdAt), 'dd MMMM yyyy', { locale: tr })}
              </div>
            </div>
            <div className="mt-2 flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 
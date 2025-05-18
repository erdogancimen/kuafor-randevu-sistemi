'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ReviewListProps {
  barberId: string;
}

export default function ReviewList({ barberId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('barberId', '==', barberId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(reviewsQuery);
        const reviewsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Review[];

        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [barberId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Henüz değerlendirme yapılmamış
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-start space-x-4">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-700">
              <Image
                src={review.userPhoto || '/images/default-avatar.png'}
                alt={review.userName}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">{review.userName}</h3>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="ml-1 text-white">{review.rating}</span>
                </div>
              </div>
              <p className="mt-2 text-gray-300">{review.comment}</p>
              <p className="mt-2 text-sm text-gray-400">
                {review.createdAt?.toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  userId: string;
  barberId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: any;
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
          ...doc.data()
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
    return <div className="text-center text-gray-400">Yükleniyor...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-center text-gray-400">Henüz değerlendirme yapılmamış</div>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-white/10"
        >
          <div className="flex items-center space-x-2 mb-4">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                className={`w-5 h-5 ${
                  index < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-300">{review.comment}</p>
          <p className="text-sm text-gray-400 mt-4">
            {review.createdAt?.toDate().toLocaleDateString('tr-TR')}
          </p>
        </div>
      ))}
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createReview } from '@/lib/firebase/reviews';
import { toast } from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Review } from '@/types/review';

interface ReviewFormProps {
  appointmentId: string;
  userId: string;
  barberId: string;
  barberName: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({ 
  appointmentId, 
  userId, 
  barberId, 
  barberName, 
  onReviewSubmitted 
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Değerlendirme yapmak için giriş yapmalısınız');
      return;
    }

    if (rating === 0) {
      toast.error('Lütfen bir puan verin');
      return;
    }

    if (!comment.trim()) {
      toast.error('Lütfen bir yorum yazın');
      return;
    }

    setSubmitting(true);

    try {
      // Kullanıcı bilgilerini getir
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData) {
        throw new Error('Kullanıcı bilgileri bulunamadı');
      }

      const reviewData: Omit<Review, 'id' | 'createdAt'> = {
        appointmentId,
        barberId,
        barberName,
        userId,
        userName: `${userData.firstName} ${userData.lastName}`,
        rating,
        comment,
        updatedAt: new Date().toISOString()
      };

      await createReview(reviewData);

      toast.success('Değerlendirmeniz kaydedildi');
      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Değerlendirme kaydedilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Puanınız
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Yorumunuz
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          placeholder="Deneyiminizi paylaşın..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Gönderiliyor...' : 'Değerlendirme Yap'}
      </button>
    </form>
  );
} 
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Review } from '@/types/review';

interface ReviewFormProps {
  appointmentId: string;
  userId: string;
  userName: string;
  barberId: string;
  barberName: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  appointmentId,
  userId,
  userName,
  barberId,
  barberName,
  onReviewSubmitted
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Lütfen bir puan seçin');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData: Omit<Review, 'id'> = {
        appointmentId,
        userId,
        userName,
        barberId,
        barberName,
        rating,
        comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      toast.success('Değerlendirmeniz başarıyla kaydedildi');
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Değerlendirme kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Puanınız</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-2">
          Yorumunuz
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={4}
          placeholder="Deneyiminizi paylaşın..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
      </button>
    </form>
  );
} 
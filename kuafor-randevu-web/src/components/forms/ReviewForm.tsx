'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface ReviewFormProps {
  barberId: string;
  appointmentId: string;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({ barberId, appointmentId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Lütfen önce giriş yapın');
      return;
    }

    if (rating === 0) {
      toast.error('Lütfen bir puan seçin');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Değerlendirmeyi kaydet
      const reviewData = {
        userId: user.uid,
        barberId,
        appointmentId,
        rating,
        comment,
        createdAt: serverTimestamp()
      };

      const reviewRef = await addDoc(collection(db, 'reviews'), reviewData);

      // 2. Randevuyu değerlendirildi olarak işaretle
      await updateDoc(doc(db, 'appointments', appointmentId), {
        isReviewed: true
      });

      // 3. Kuaföre bildirim gönder
      const notificationData = {
        userId: barberId,
        type: 'review',
        title: 'Yeni Değerlendirme',
        message: `${rating} yıldızlı yeni bir değerlendirme aldınız`,
        isRead: false,
        createdAt: serverTimestamp(),
        data: {
          reviewId: reviewRef.id,
          appointmentId,
          rating,
          comment
        }
      };

      await addDoc(collection(db, 'notifications'), notificationData);

      toast.success('Değerlendirmeniz başarıyla kaydedildi');
      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Değerlendirme gönderilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Puanınız
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Yorumunuz
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white"
          rows={4}
          placeholder="Deneyiminizi paylaşın..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
      </button>
    </form>
  );
} 
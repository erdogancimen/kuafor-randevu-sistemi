import { Timestamp } from 'firebase/firestore';

export type NotificationType = 'appointment' | 'review' | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data?: {
    appointmentId?: string;
    reviewId?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data?: {
    appointmentId?: string;
    reviewId?: string;
  };
} 
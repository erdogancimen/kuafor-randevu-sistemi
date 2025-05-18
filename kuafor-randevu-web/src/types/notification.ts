import { Timestamp } from 'firebase/firestore';

export type NotificationType = 'appointment' | 'review' | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'review' | 'system';
  read: boolean;
  data?: {
    appointmentId?: string;
    reviewId?: string;
  };
  createdAt: {
    toDate: () => Date;
  };
  updatedAt: {
    toDate: () => Date;
  };
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
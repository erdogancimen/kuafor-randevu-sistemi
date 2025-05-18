import { Timestamp } from 'firebase/firestore';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price?: number;
  duration?: number;
  notes?: string;
  createdAt: {
    toDate: () => Date;
  };
  updatedAt: {
    toDate: () => Date;
  };
}

export interface AppointmentData {
  userId: string;
  barberId: string;
  service: string;
  date: string;
  time: string;
  price?: number;
  duration?: number;
  notes?: string;
  status?: AppointmentStatus;
} 
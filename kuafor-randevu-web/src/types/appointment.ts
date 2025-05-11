export type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  userId: string;
  userName: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  price?: number;
  notes?: string;
} 
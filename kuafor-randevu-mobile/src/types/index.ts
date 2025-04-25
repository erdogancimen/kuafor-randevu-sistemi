export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'barber' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  phone?: string;
  address?: string;
  photoURL?: string;
}

export interface Barber extends User {
  role: 'barber';
  services: Service[];
  workingHours: WorkingHours[];
  rating: number;
  reviews: Review[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  barberId: string;
}

export interface WorkingHours {
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isAvailable: boolean;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  serviceId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  barberId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  read: boolean;
} 
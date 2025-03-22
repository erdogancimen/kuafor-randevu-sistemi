import { Timestamp } from 'firebase/firestore';

export type UserRole = 'USER' | 'SALON' | 'ADMIN';
export type SalonType = 'MEN' | 'WOMEN' | 'BOTH';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Service {
  id?: string;
  name: string;
  price: number;
}

export interface Barber {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Salon {
  id: string;
  ownerId: string;
  salonName: string;
  salonType: SalonType;
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  barbers: Barber[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  rating: number;
  totalReviews: number;
}

export interface Appointment {
  id: string;
  salonId: string;
  userId: string;
  barberId: string;
  serviceId: string;
  date: Timestamp;
  status: AppointmentStatus;
  price: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Review {
  id: string;
  salonId: string;
  userId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form veri tipleri
export interface SalonRegistrationData {
  salonName: string;
  salonType: SalonType;
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  services: Service[];
  barbers: Barber[];
}

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
} 
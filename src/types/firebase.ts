import { Timestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'USER' | 'SALON';
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

export interface CustomUser extends FirebaseUser {
  role?: UserRole;
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
  date: any;
  status: AppointmentStatus;
  createdAt: any;
  customerName?: string;
  serviceName?: string;
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
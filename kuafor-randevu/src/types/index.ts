export type UserType = "customer" | "barber" | "admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export type BarberType = 'male' | 'female' | 'unisex';

export interface Barber {
  id: string;
  userId: string;
  shopName: string;
  address: string;
  workingHours: {
    start: string;
    end: string;
  };
  services: string[];
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BarberEmployee {
  id: string;
  barberId: string;
  userId: string;
  services: string[];
  workingHours: {
    [key: string]: {
      start: string;
      end: string;
      isAvailable: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  barberId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  date: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  customerId: string;
  barberId: string;
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
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
} 
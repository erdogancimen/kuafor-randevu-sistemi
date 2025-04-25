export interface Service {
  id: string;
  barberId: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
}

export interface WorkingHours {
  id: string;
  barberId: string;
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isAvailable: boolean;
}

export interface Barber {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  photoUrl?: string;
  description?: string;
  services?: Service[];
  workingHours?: WorkingHours[];
}

export interface Review {
  id: string;
  barberId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
} 
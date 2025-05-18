export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'barber' | 'admin';
  phone?: string;
  address?: string;
  photoURL?: string;
  rating?: number;
  services?: {
    name: string;
    price: number;
    duration: number;
  }[];
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      isClosed?: boolean;
    };
  };
} 
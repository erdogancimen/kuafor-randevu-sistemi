export interface Review {
  id: string;
  appointmentId: string;
  userId: string;
  userName: string;
  barberId: string;
  barberName: string;
  rating: number; // 1-5 arası
  comment: string;
  createdAt: string;
  updatedAt: string;
} 
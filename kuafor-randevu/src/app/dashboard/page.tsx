'use client';

import { useAuth } from '@/context/AuthContext';
import CustomerDashboard from '@/components/customer/CustomerDashboard';
import BarberDashboard from '@/components/barber/BarberDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {currentUser.role === 'barber' ? (
        <BarberDashboard />
      ) : (
        <CustomerDashboard />
      )}
    </div>
  );
} 
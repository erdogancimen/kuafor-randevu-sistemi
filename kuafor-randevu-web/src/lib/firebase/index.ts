// Firebase configuration
export { db } from './config';

// Authentication
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail
} from './auth';

// Appointments
export {
  createAppointment,
  updateAppointmentStatus,
  getAppointments,
  getAppointmentById,
  getUpcomingAppointments,
  getPastAppointments,
  getAppointmentsByDate
} from './appointments';

// Notifications
export {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from './notifications';

// Users
export {
  createUser,
  updateUser,
  getUserById,
  getBarbers,
  getBarberById,
  updateBarberProfile,
  updateBarberServices,
  updateBarberWorkingHours,
  updateBarberHolidays
} from './users';

// Reviews
export {
  createReview,
  getReviews,
  getReviewsByBarber,
  getReviewsByUser,
  updateReview,
  deleteReview
} from './reviews';

// Services
export {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from './services';

// Working Hours
export {
  getWorkingHours,
  updateWorkingHours,
  getHolidays,
  addHoliday,
  removeHoliday
} from './working-hours'; 
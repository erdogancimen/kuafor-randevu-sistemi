'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { collection, doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Trash2, User } from 'lucide-react';

interface Employee {
  uid: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  workingHours: string;
}

export default function BarberEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    workingHours: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.employees) {
        setEmployees(userData.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Çalışanlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Yeni çalışan hesabı oluştur
      const employeeCredential = await createUserWithEmailAndPassword(
        auth,
        newEmployee.email,
        newEmployee.password
      );

      await updateProfile(employeeCredential.user, {
        displayName: `${newEmployee.firstName} ${newEmployee.lastName}`
      });

      const newEmployeeData = {
        uid: employeeCredential.user.uid,
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        phone: newEmployee.phone,
        email: newEmployee.email,
        workingHours: newEmployee.workingHours,
        role: 'employee',
        barberId: user.uid // Kuaförün ID'sini ekle
      };

      // Çalışanın kendi Firestore dökümanını oluştur
      await setDoc(doc(db, 'users', employeeCredential.user.uid), {
        ...newEmployeeData,
        createdAt: new Date().toISOString()
      });

      // Kuaförün çalışanlar listesine ekle
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const updatedEmployees = [...(userData?.employees || []), newEmployeeData];

      await updateDoc(doc(db, 'users', user.uid), {
        employees: updatedEmployees
      });

      setEmployees(updatedEmployees);
      setShowAddModal(false);
      setNewEmployee({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        workingHours: ''
      });
      toast.success('Çalışan başarıyla eklendi');
    } catch (error: any) {
      console.error('Error adding employee:', error);
      let errorMessage = 'Çalışan eklenirken bir hata oluştu';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const updatedEmployees = userData?.employees.map((emp: Employee) =>
        emp.uid === selectedEmployee.uid ? selectedEmployee : emp
      );

      await updateDoc(doc(db, 'users', user.uid), {
        employees: updatedEmployees
      });

      setEmployees(updatedEmployees);
      setShowEditModal(false);
      setSelectedEmployee(null);
      toast.success('Çalışan bilgileri güncellendi');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const updatedEmployees = userData?.employees.filter(
        (emp: Employee) => emp.uid !== employeeId
      );

      await updateDoc(doc(db, 'users', user.uid), {
        employees: updatedEmployees
      });

      // Çalışanın Firebase hesabını sil
      await deleteDoc(doc(db, 'users', employeeId));

      setEmployees(updatedEmployees);
      toast.success('Çalışan başarıyla silindi');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Çalışanlar</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="h-5 w-5" />
            Yeni Çalışan Ekle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <div
              key={employee.uid}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-400">{employee.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-white transition"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee.uid)}
                    className="p-2 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400">
                  <span className="text-gray-300">Telefon:</span> {employee.phone}
                </p>
                <p className="text-sm text-gray-400">
                  <span className="text-gray-300">Çalışma Saatleri:</span>{' '}
                  {employee.workingHours}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Yeni Çalışan Ekleme Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Yeni Çalışan Ekle</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ad"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.firstName}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, firstName: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Soyad"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.lastName}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, lastName: e.target.value })
                  }
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.phone}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, phone: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="E-posta"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.password}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, password: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Çalışma Saatleri (Örn: 09:00-18:00)"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={newEmployee.workingHours}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, workingHours: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddEmployee}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                  >
                    Ekle
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Çalışan Düzenleme Modal */}
        {showEditModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Çalışan Düzenle</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ad"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={selectedEmployee.firstName}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      firstName: e.target.value
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Soyad"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={selectedEmployee.lastName}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      lastName: e.target.value
                    })
                  }
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={selectedEmployee.phone}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      phone: e.target.value
                    })
                  }
                />
                <input
                  type="email"
                  placeholder="E-posta"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={selectedEmployee.email}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      email: e.target.value
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Çalışma Saatleri (Örn: 09:00-18:00)"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-white/10 rounded-lg text-white"
                  value={selectedEmployee.workingHours}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      workingHours: e.target.value
                    })
                  }
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditEmployee}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
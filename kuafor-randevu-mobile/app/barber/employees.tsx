import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

interface Employee {
  uid: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  workingHours: string;
}

export default function BarberEmployeesScreen() {
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
  const auth = getAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }

      const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData?.employees) {
        setEmployees(userData.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Hata', 'Çalışanlar yüklenirken bir hata oluştu', [
        {
          text: 'Tamam',
          onPress: () => router.back()
        }
      ]);
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
        barberId: user.uid
      };

      // Çalışanın kendi Firestore dökümanını oluştur
      await setDoc(doc(getFirestore(), 'users', employeeCredential.user.uid), {
        ...newEmployeeData,
        createdAt: new Date().toISOString()
      });

      // Kuaförün çalışanlar listesine ekle
      const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
      const userData = userDoc.data();
      const updatedEmployees = [...(userData?.employees || []), newEmployeeData];

      await updateDoc(doc(getFirestore(), 'users', user.uid), {
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
      Alert.alert('Başarılı', 'Çalışan başarıyla eklendi');
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
      
      Alert.alert('Hata', errorMessage);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
      const userData = userDoc.data();
      const updatedEmployees = userData?.employees.map((emp: Employee) =>
        emp.uid === selectedEmployee.uid ? selectedEmployee : emp
      );

      await updateDoc(doc(getFirestore(), 'users', user.uid), {
        employees: updatedEmployees
      });

      setEmployees(updatedEmployees);
      setShowEditModal(false);
      setSelectedEmployee(null);
      Alert.alert('Başarılı', 'Çalışan bilgileri güncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    Alert.alert(
      'Çalışanı Sil',
      'Bu çalışanı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
              const userData = userDoc.data();
              const updatedEmployees = userData?.employees.filter(
                (emp: Employee) => emp.uid !== employeeId
              );

              await updateDoc(doc(getFirestore(), 'users', user.uid), {
                employees: updatedEmployees
              });

              // Çalışanın Firebase hesabını sil
              await deleteDoc(doc(getFirestore(), 'users', employeeId));

              setEmployees(updatedEmployees);
              Alert.alert('Başarılı', 'Çalışan başarıyla silindi');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çalışanlar</Text>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
          <Text style={styles.addButtonText}>Yeni Çalışan Ekle</Text>
        </TouchableOpacity>

        <View style={styles.employeesList}>
          {employees.map((employee) => (
            <View key={employee.uid} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.employeeInfo}>
                  <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.employeeDetails}>
                    <Text style={styles.employeeName}>
                      {employee.firstName} {employee.lastName}
                    </Text>
                    <Text style={styles.employeeEmail}>{employee.email}</Text>
                  </View>
                </View>
                <View style={styles.employeeActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEmployee(employee);
                      setShowEditModal(true);
                    }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteEmployee(employee.uid)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash" size={20} color={theme.colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.employeeDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>{employee.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>{employee.workingHours}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Yeni Çalışan Ekleme Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Çalışan Ekle</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Ad"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.firstName}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, firstName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Soyad"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.lastName}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, lastName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.phone}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, phone: text })}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.email}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.password}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, password: text })}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Çalışma Saatleri (Örn: 09:00-18:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEmployee.workingHours}
                onChangeText={(text) => setNewEmployee({ ...newEmployee, workingHours: text })}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddEmployee}
              >
                <Text style={[styles.modalButtonText, styles.saveButtonText]}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Çalışan Düzenleme Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Çalışan Düzenle</Text>
            <ScrollView style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Ad"
                placeholderTextColor={theme.colors.textSecondary}
                value={selectedEmployee?.firstName}
                onChangeText={(text) => setSelectedEmployee(prev => prev ? { ...prev, firstName: text } : null)}
              />
              <TextInput
                style={styles.input}
                placeholder="Soyad"
                placeholderTextColor={theme.colors.textSecondary}
                value={selectedEmployee?.lastName}
                onChangeText={(text) => setSelectedEmployee(prev => prev ? { ...prev, lastName: text } : null)}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                placeholderTextColor={theme.colors.textSecondary}
                value={selectedEmployee?.phone}
                onChangeText={(text) => setSelectedEmployee(prev => prev ? { ...prev, phone: text } : null)}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={theme.colors.textSecondary}
                value={selectedEmployee?.email}
                onChangeText={(text) => setSelectedEmployee(prev => prev ? { ...prev, email: text } : null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Çalışma Saatleri (Örn: 09:00-18:00)"
                placeholderTextColor={theme.colors.textSecondary}
                value={selectedEmployee?.workingHours}
                onChangeText={(text) => setSelectedEmployee(prev => prev ? { ...prev, workingHours: text } : null)}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                }}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEditEmployee}
              >
                <Text style={[styles.modalButtonText, styles.saveButtonText]}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  addButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
  },
  employeesList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  employeeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  employeeEmail: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  employeeActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalForm: {
    padding: theme.spacing.lg,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  saveButtonText: {
    color: theme.colors.background,
  },
}); 
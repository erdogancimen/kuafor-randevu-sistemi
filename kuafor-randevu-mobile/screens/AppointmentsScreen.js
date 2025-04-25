import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';

// Örnek veri
const appointments = [
  {
    id: '1',
    barberName: 'Ahmet Yılmaz',
    service: 'Saç Kesimi',
    date: '2024-04-26',
    time: '14:00',
    status: 'Onaylandı',
  },
  {
    id: '2',
    barberName: 'Mehmet Demir',
    service: 'Sakal Tıraşı',
    date: '2024-04-27',
    time: '15:30',
    status: 'Beklemede',
  },
];

export default function AppointmentsScreen() {
  const renderAppointmentItem = ({ item }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.barberName}>{item.barberName}</Text>
        <Text style={[
          styles.status,
          { color: item.status === 'Onaylandı' ? '#10b981' : '#f59e0b' }
        ]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.service}>{item.service}</Text>
      <View style={styles.timeContainer}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <TouchableOpacity style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>İptal Et</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Randevularım</Text>
      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4f46e5',
  },
  listContainer: {
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  service: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 
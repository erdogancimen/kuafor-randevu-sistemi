const handleSalonRegistration = async (data: SalonRegistrationData) => {
  try {
    // Önce Firebase Auth'da kullanıcı oluştur
    const userCredential = await signUp(data.email, data.password);
    
    // Sonra Firestore'a rol bilgisini kaydet
    await createUserWithRole(userCredential.user.uid, data.email, 'SALON');
    
    // ... diğer salon kayıt işlemleri
  } catch (error) {
    console.error('Kayıt sırasında hata:', error);
    throw error;
  }
}; 
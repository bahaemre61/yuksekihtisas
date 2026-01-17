import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });


import Location from '../src/lib/Location';
import User from '../src/lib/models/User'; 


const MONGO_URI = process.env.MONGO_URI;


const ADMIN_USER = {
  name: process.env.SEED_ADMIN_NAME || 'Yüksek İhtisas Bilgi İşlem',
  email: process.env.SEED_ADMIN_EMAIL || 'bilgiislem@yuksekihtisas.edu.tr',
  password: process.env.SEED_ADMIN_PASSWORD || 'admin123', 
  role: 'admin',  
  title: 'Bilgi İşlem Daire Başkanı'
};

// Eklenecek Yerleşkeler
const INITIAL_LOCATIONS = [
  'Yüksek İhtisas Tıp Fakültesi (100.Yıl Yerleşkesi)',
  'Yüksek İhtisas Sağlık Bilimler Fakültesi (Bağlıca Yerleşkesi)',
  'Yüksek İhtisas Sağlık Meslek Yüksekokulu (Bağlum Yerleşkesi)',
  'Yüksek İhtisas  Meslek Yüksekokulu (Balgat Yerleşkesi)',
];

async function seed() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI .env dosyasında bulunamadı!');
    }

    // 1. Veritabanına Bağlan
    console.log('🌱 Veritabanına bağlanılıyor...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Bağlantı başarılı.');

    console.log('📍 Yerleşkeler kontrol ediliyor...');
    for (const locName of INITIAL_LOCATIONS) {
      await Location.findOneAndUpdate(
        { name: locName }, 
        { name: locName },
        { upsert: true, new: true } 
      );
    }
    console.log(`✅ ${INITIAL_LOCATIONS.length} adet yerleşke doğrulandı/eklendi.`);

    console.log('👤 Admin hesabı kontrol ediliyor...');
    const existingAdmin = await User.findOne({ email: ADMIN_USER.email });

    if (existingAdmin) {
      console.log('ℹ️ Admin hesabı zaten mevcut. Atlanıyor.');
    } else {

      const newAdmin = new User({
        name: ADMIN_USER.name,
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        role: ADMIN_USER.role,
        title: ADMIN_USER.title
      });

      await newAdmin.save();
      console.log(`✅ Admin hesabı oluşturuldu!`);
      console.log(`👉 Email: ${ADMIN_USER.email}`);
      console.log(`👉 Şifre: ${ADMIN_USER.password}`);
    }

    console.log('🚀 Seed işlemi başarıyla tamamlandı!');
    process.exit(0);

  } catch (error) {
    console.error('❌ HATA OLUŞTU:', error);
    process.exit(1);
  }
}
seed();
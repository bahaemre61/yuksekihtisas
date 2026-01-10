// scripts/seed-cities.ts

import mongoose, { Schema, Document } from 'mongoose';
import dotenv from 'dotenv';

// .env dosyasının yerini gösteriyoruz (bir üst klasörde)
dotenv.config({ path: './.env' });

// --- 1. TİP TANIMLAMALARI (INTERFACE) ---
// Verinin neye benzediğini TS'e anlatıyoruz.
interface IDistrict {
  name: string;
}

interface ICity {
  plate: string;
  name: string;
  districts: IDistrict[];
}

// --- 2. MONGOOSE ŞEMA VE MODEL ---
// (Not: Normalde src/models altındaki modelinizi de import edebilirsiniz
// ama seed dosyalarında bağımsız çalışmak bazen daha az hata verir.)

const CitySchema = new Schema({
  plate: { type: String, required: true },
  name: { type: String, required: true },
  districts: [
    {
      name: { type: String, required: true }
    }
  ]
});

// Modeli oluşturuyoruz
const CityModel = mongoose.model<ICity & Document>('City', CitySchema);

const citiesData: ICity[] = [
  
  {
    plate: "06",
    name: "Ankara",
    districts: [
      { name: "Altındağ" }, { name: "Çankaya" }, { name: "Etimesgut" }, { name: "Keçiören" }, {name : "Mamak" }, 
      {name : "Sincan" }, {name : "Yenimahalle" }, {name : "Gölbaşı" }, {name : "Polatlı" }, {name : "Kızılcahamam" }
    ]
  },
];

// --- 4. SEED FONKSİYONU ---
const seedDB = async () => {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/proje_adiniz';
    
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB Bağlantısı Başarılı.');

    // Önceki verileri temizle
    await CityModel.deleteMany({});
    console.log('🗑️  Eski şehir verileri temizlendi.');

    // Yeni verileri ekle
    await CityModel.insertMany(citiesData);
    console.log('🌱 Şehirler ve ilçeler başarıyla eklendi!');

  } catch (err) {
    console.error('❌ Bir hata oluştu:', err);
  } finally {
    // Bağlantıyı kapat ve süreci bitir
    await mongoose.connection.close();
    process.exit();
  }
};

seedDB();
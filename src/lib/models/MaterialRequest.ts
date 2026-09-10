import mongoose, { Document, Schema, models, model } from 'mongoose';

export type MaterialRequestStatus =
  | 'pending_supervisor'
  | 'pending_mali_isler'
  | 'partially_delivered'
  | 'approved'
  | 'rejected';

export interface IMaterialRequest extends Document {
  batchId?: string;
  requester: mongoose.Types.ObjectId;
  location?: string; // Yerleşke
  materialType: string;
  materialName: string;
  quantity: number;
  unit: string;
  givenQuantity?: number; // Depodan Verilen Miktar
  remainingQuantity?: number; // Satın Alınacak / Verilecek Kalan Miktar
  description?: string; // Gerekçe Metni
  specification?: string; // Teknik Şartname Metni
  specificationFileUrl?: string; // Yüklenen PDF / DOCX Şartname Dosya Bağlantısı
  specificationFileName?: string; // Şartname Dosya Adı
  status: MaterialRequestStatus;
  supervisorReviewer?: mongoose.Types.ObjectId;
  supervisorNote?: string;
  supervisorReviewedAt?: Date;
  maliIslerReviewer?: mongoose.Types.ObjectId;
  maliIslerNote?: string;
  maliIslerReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialRequestSchema = new Schema<IMaterialRequest>(
  {
    batchId: { type: String, index: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, default: 'Balgat Yerleşkesi' },
    materialType: { type: String, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    givenQuantity: { type: Number, default: 0, min: 0 },
    remainingQuantity: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    specification: { type: String, default: '' },
    specificationFileUrl: { type: String, default: '' },
    specificationFileName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending_supervisor', 'pending_mali_isler', 'partially_delivered', 'approved', 'rejected'],
      default: 'pending_supervisor',
    },
    supervisorReviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    supervisorNote: { type: String, default: '' },
    supervisorReviewedAt: { type: Date },
    maliIslerReviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    maliIslerNote: { type: String, default: '' },
    maliIslerReviewedAt: { type: Date },
  },
  { timestamps: true }
);

if (models && (models as any).MaterialRequest) {
  delete (models as any).MaterialRequest;
}

const MaterialRequest =
  model<IMaterialRequest>('MaterialRequest', MaterialRequestSchema);

export default MaterialRequest;

import mongoose, { Document, Schema, models, model } from 'mongoose';

export type MaterialRequestStatus =
  | 'pending_supervisor'
  | 'pending_mali_isler'
  | 'approved'
  | 'rejected';

export interface IMaterialRequest extends Document {
  requester: mongoose.Types.ObjectId;
  materialType: string;
  materialName: string;
  quantity: number;
  unit: string;
  description?: string;
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
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    materialType: { type: String, required: true },
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending_supervisor', 'pending_mali_isler', 'approved', 'rejected'],
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

const MaterialRequest =
  models.MaterialRequest ||
  model<IMaterialRequest>('MaterialRequest', MaterialRequestSchema);

export default MaterialRequest;

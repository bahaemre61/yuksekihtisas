import mongoose, { Schema,Document, Types, mongo } from "mongoose";
import { IUser } from "./User";

export interface ITechnicalRequest extends Document {
    user: IUser['_id'];
    technicalStaff: mongoose.Types.ObjectId[];
    technicalIssue: string;
    location: string;
    title: string;
    description: string;
    screenshotUrl?: string;
    priority : 'MEDIUM' | 'HIGH' | 'LOW';
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    completedAt?: Date;
    rating?: { score: number; comment?: string; ratedAt?: Date };
    createdAt: Date;
    updatedAt: Date;
}

const TechnicalRequestSchema = new Schema<ITechnicalRequest>(
   {
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    technicalStaff: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }],
    location: { type: String, required: true, index: true },    
    title: { type: String, required: true },
    description: { type: String, required: true },
    screenshotUrl: { type: String },
    
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    completedAt: { type: Date, default: null },
    // Talep sahibinin iş tamamlandıktan sonra yaptığı değerlendirme (1-5 yıldız)
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      ratedAt: { type: Date }
    }
  },
  { timestamps: true, versionKey: false }
);

const TechnicalRequest = mongoose.models.TechnicalRequest || mongoose.model<ITechnicalRequest>('TechnicalRequest', TechnicalRequestSchema);

export default TechnicalRequest;
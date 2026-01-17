import mongoose, { Schema,Document, Types, mongo } from "mongoose";
import { IUser } from "./User";

export interface ITechnicalRequest extends Document {
    user: IUser['_id'];
    technicalStaff?: IUser['_id'];
    technicalIssue: string;
    location: string;
    title: string;
    description: string;
    screenshotUrl?: string;
    priority : 'MEDIUM' | 'HIGH' | 'LOW';
    status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    completedAt?: Date;
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
    technicalStaff: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
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
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

const TechnicalRequest = mongoose.models.TechnicalRequest || mongoose.model<ITechnicalRequest>('TechnicalRequest', TechnicalRequestSchema);

export default TechnicalRequest;
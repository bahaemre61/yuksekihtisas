import mongoose, { Document, Schema, models, model } from 'mongoose';

export interface IEvidence extends Document {
  sessionId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  reporterNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'EvidenceSession', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
    },
    reporterNote: { type: String, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const Evidence = models.Evidence || model<IEvidence>('Evidence', EvidenceSchema);

export default Evidence;

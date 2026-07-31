import mongoose, { Document, Schema, models, model } from 'mongoose';

export interface IEvidenceSession extends Document {
  title: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  reporters: mongoose.Types.ObjectId[];
  dataEntryUsers: mongoose.Types.ObjectId[];
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSessionSchema = new Schema<IEvidenceSession>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dataEntryUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const EvidenceSession =
  models.EvidenceSession ||
  model<IEvidenceSession>('EvidenceSession', EvidenceSessionSchema);

export default EvidenceSession;

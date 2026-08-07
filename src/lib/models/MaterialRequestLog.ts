import mongoose, { Document, Schema, models, model } from 'mongoose';

export interface IMaterialRequestLog extends Document {
  batchId?: string;
  requestId?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  action: 'INSPECT' | 'DOWNLOAD' | 'REVIEW_APPROVE' | 'REVIEW_REJECT' | 'RELEASE_INSPECT';
  actionDetails?: string;
  createdAt: Date;
}

const MaterialRequestLogSchema = new Schema<IMaterialRequestLog>(
  {
    batchId: { type: String, index: true },
    requestId: { type: Schema.Types.ObjectId, ref: 'MaterialRequest' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    action: {
      type: String,
      enum: ['INSPECT', 'DOWNLOAD', 'REVIEW_APPROVE', 'REVIEW_REJECT', 'RELEASE_INSPECT'],
      required: true,
    },
    actionDetails: { type: String, default: '' },
  },
  { timestamps: true }
);

if (models && (models as any).MaterialRequestLog) {
  delete (models as any).MaterialRequestLog;
}

const MaterialRequestLog = model<IMaterialRequestLog>('MaterialRequestLog', MaterialRequestLogSchema);

export default MaterialRequestLog;

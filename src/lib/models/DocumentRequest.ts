import mongoose, { Document, Schema, models, model } from 'mongoose';

export type RequestType = 'NEW_DOCUMENT' | 'REVISION' | 'REVOCATION';

export interface IDocumentRequest extends Document {
  sessionId: mongoose.Types.ObjectId;
  evidenceId?: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  requestDate: Date;
  requestType: RequestType;
  documentName: string;
  documentNo?: string;
  reason?: string;
  feedback?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRequestSchema = new Schema<IDocumentRequest>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'EvidenceSession', required: true },
    evidenceId: { type: Schema.Types.ObjectId, ref: 'Evidence' },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now },
    requestType: {
      type: String,
      enum: ['NEW_DOCUMENT', 'REVISION', 'REVOCATION'],
      required: true,
    },
    documentName: { type: String, required: true },
    documentNo: { type: String, default: '' },
    reason: { type: String, default: '' },
    feedback: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

const DocumentRequest =
  models.DocumentRequest ||
  model<IDocumentRequest>('DocumentRequest', DocumentRequestSchema);

export default DocumentRequest;

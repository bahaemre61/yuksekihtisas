import mongoose, { Document, Schema, models, model } from 'mongoose';
import {IUser} from "./User"

export const RequestStatus = {
    PENDING : 'pending',
    ASSIGNED: 'assigned',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
}as const


export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export interface IVehicleRequest extends Document {
    requestingUser: IUser['_id']; 
    assignedDriver?: IUser['_id']; 
    status: RequestStatus;
    willCarryItems: boolean; 
    fromLocation: string;
    toLocation: string;
    purpose: string; 
    startTime: Date; 
    endTime: Date;
    district: string;
    priority : 'normal' | 'high'; 
}

const VehicleRequestSchema: Schema<IVehicleRequest> = new Schema({
    requestingUser: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    assignedDriver: {
        type : Schema.Types.ObjectId,
        ref : 'User',
        default : null
    },
     status: {
        type: String,
        enum: Object.values(RequestStatus),
        default: RequestStatus.PENDING
    },
    willCarryItems: { 
        type: Boolean, 
        required: true 
    },
    fromLocation: { 
        type: String, 
        required: true 
    },
    toLocation: { 
        type: String, 
        required: true 
    },
    purpose: { 
        type: String, 
        required: true 
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    district: {
        type: String,
        required: true,
    },
    priority:{
        type: String,
        enum: ['normal', 'high'],
        default : 'normal'
    }
}, { 
    timestamps: true 
});

const VehicleRequest = models.VehicleRequest || model<IVehicleRequest>('VehicleRequest', VehicleRequestSchema);

export default VehicleRequest;
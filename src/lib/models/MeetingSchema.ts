import mongoose, { Document, Schema, models, model } from 'mongoose';
import { IUser } from "./User";

// Toplantı Durumları
export const MeetingStatus = {
    OPEN: 'open',          
    CLOSED: 'closed',      
    COMPLETED: 'completed', 
    CANCELLED: 'cancelled'
} as const;

export type MeetingStatus = typeof MeetingStatus[keyof typeof MeetingStatus];

interface IAttendee {
    user?: IUser['_id'];
    guestName?: string;
    isGuest: boolean;
    checkInTime: Date;
}

export interface IMeeting extends Document {
    title: string;
    description?: string;
    date: Date;
    location: string;
    organizer: IUser['_id'];
    qrSecret: string;        
    status: MeetingStatus;
    attendees: IAttendee[];  
    minutes?: string;        
    isApproved: boolean;   
}

const MeetingSchema: Schema<IMeeting> = new Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    location: { 
        type: String, 
        required: true 
    },
    organizer: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    qrSecret: { 
        type: String, 
        required: true, 
        unique: true
    },
    status: {
        type: String,
        enum: Object.values(MeetingStatus),
        default: MeetingStatus.OPEN
    },
    attendees: [{
        user: { 
            type: Schema.Types.ObjectId, 
            ref: 'User' 
        },
        guestName: {
            type: String
        },
        isGuest: {
            type: Boolean,
            default: false
        },
        checkInTime: { 
            type: Date, 
            default: Date.now 
        }
    }],
    minutes: { 
        type: String 
    },
    isApproved: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

const Meeting = models.Meeting || model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
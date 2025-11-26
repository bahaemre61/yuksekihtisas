import mongoose, {Document, Schema, models, model} from "mongoose";

export interface IAnnouncement extends Document{
    title : string;
    content : string;
    priority : 'normal' | 'urgent';
    createdAt : Date;
}

const AnnouncementSchema : Schema<IAnnouncement> = new Schema({
    title : {type : String, required : true},
    content : {type : String, required : true},
    priority : {
        type : String,
        enum: ['normal', 'urgent'],
        default : 'normal'
    }
}, {
    timestamps : true
});

const Announcement = models.Announcement || model<IAnnouncement>('Announcement', AnnouncementSchema);

export default Announcement;
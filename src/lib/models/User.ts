import mongoose, {Document, Schema, models, model}  from 'mongoose';
import bcrypt from 'bcryptjs';


export const UserRole= {
    USER: 'user',
    DRIVER : 'driver',
    ADMIN : 'admin',   
    AMIR : 'amir',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface IUser extends Document {
    name:string;
    email:string;
    password:string;
    role: UserRole;
    driverStatus?: 'available' | 'busy';
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.USER,
    },
    driverStatus: {
        type: String,
        enum: ['available', 'busy'],
        default : 'available',
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});
   UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = models.User || model<IUser>('User', UserSchema);

export default User;
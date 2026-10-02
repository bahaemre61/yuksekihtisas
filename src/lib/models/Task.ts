import mongoose, { Document, Schema, models, model } from 'mongoose';

export const TaskStatus = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const TaskPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
} as const;
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export interface ITask extends Document {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date | null;
    createdBy: mongoose.Types.ObjectId;
    assignee: mongoose.Types.ObjectId;
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },
    dueDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
}, { timestamps: true });

TaskSchema.index({ assignee: 1, status: 1 });
TaskSchema.index({ createdBy: 1 });

const Task = models.Task || model<ITask>('Task', TaskSchema);

export default Task;

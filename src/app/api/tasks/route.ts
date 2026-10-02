import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import Task, { TaskPriority, TaskStatus } from '@/src/lib/models/Task';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { TASKS_READ_ONLY } from '@/src/lib/taskConfig';
import { canAssignTo, getTaskActor, getTaskPermissions } from '@/src/lib/taskAccess';

// Görev listesi: admin hepsini; diğerleri kendi görevlerini, kendi açtıklarını ve hiyerarşide altındakilerin görevlerini görür.
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    try {
        await connectToDatabase();
        const actor = await getTaskActor(user.id, user.role);

        const query = actor.isAdmin
            ? {}
            : {
                $or: [
                    { assignee: { $in: [actor.id, ...Array.from(actor.downline)] } },
                    { createdBy: actor.id }
                ]
            };

        const tasks = await Task.find(query)
            .populate('createdBy', 'name role')
            .populate('assignee', 'name role')
            .sort({ createdAt: -1 });

        const data = tasks.map((t) => {
            const obj = t.toObject();
            const perms = getTaskPermissions(actor, {
                createdById: String(t.createdBy?._id ?? t.createdBy),
                assigneeId: String(t.assignee?._id ?? t.assignee)
            });
            return { ...obj, ...perms };
        });

        return NextResponse.json(data, { status: 200 });
    } catch (err) {
        console.error('Tasks GET error:', err);
        return NextResponse.json({ msg: 'Görevler alınamadı' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    if (TASKS_READ_ONLY) {
        return NextResponse.json({ msg: 'Görev panosu şimdilik salt okunurdur; işlem yapılamaz.' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const title = String(body.title || '').trim();
        const description = String(body.description || '').trim();
        const priority = body.priority || TaskPriority.MEDIUM;
        const assigneeId = String(body.assignee || user.id);

        if (!title) {
            return NextResponse.json({ msg: 'Görev başlığı zorunludur.' }, { status: 400 });
        }
        if (title.length > 200 || description.length > 2000) {
            return NextResponse.json({ msg: 'Başlık veya açıklama çok uzun.' }, { status: 400 });
        }
        if (!Object.values(TaskPriority).includes(priority)) {
            return NextResponse.json({ msg: 'Geçersiz öncelik.' }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
            return NextResponse.json({ msg: 'Geçersiz atanan kişi.' }, { status: 400 });
        }

        let dueDate: Date | null = null;
        if (body.dueDate) {
            dueDate = new Date(body.dueDate);
            if (isNaN(dueDate.getTime())) {
                return NextResponse.json({ msg: 'Geçersiz bitiş tarihi.' }, { status: 400 });
            }
        }

        await connectToDatabase();
        const actor = await getTaskActor(user.id, user.role);

        if (!canAssignTo(actor, assigneeId)) {
            return NextResponse.json({ msg: 'Bu kişiye görev atama yetkiniz yok. Sadece kendinize ve altınızdaki kişilere görev atayabilirsiniz.' }, { status: 403 });
        }

        const assignee = await User.findById(assigneeId).select('isActive');
        if (!assignee || assignee.isActive === false) {
            return NextResponse.json({ msg: 'Atanan kullanıcı bulunamadı veya aktif değil.' }, { status: 400 });
        }

        const task = await Task.create({
            title,
            description,
            priority,
            status: TaskStatus.TODO,
            dueDate,
            createdBy: user.id,
            assignee: assigneeId
        });

        const populated = await Task.findById(task._id)
            .populate('createdBy', 'name role')
            .populate('assignee', 'name role');

        return NextResponse.json({ ...populated!.toObject(), canManage: true, canMove: true }, { status: 201 });
    } catch (err) {
        console.error('Tasks POST error:', err);
        return NextResponse.json({ msg: 'Görev oluşturulamadı' }, { status: 500 });
    }
}

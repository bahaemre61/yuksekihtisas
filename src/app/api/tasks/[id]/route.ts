import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/src/lib/db';
import Task, { TaskPriority, TaskStatus } from '@/src/lib/models/Task';
import User from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { TASKS_READ_ONLY } from '@/src/lib/taskConfig';
import { canAssignTo, getTaskActor, getTaskPermissions } from '@/src/lib/taskAccess';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    if (TASKS_READ_ONLY) {
        return NextResponse.json({ msg: 'Görev panosu şimdilik salt okunurdur; işlem yapılamaz.' }, { status: 403 });
    }

    try {
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ msg: 'Geçersiz görev ID.' }, { status: 400 });
        }

        const body = await request.json();
        await connectToDatabase();

        const task = await Task.findById(id);
        if (!task) {
            return NextResponse.json({ msg: 'Görev bulunamadı.' }, { status: 404 });
        }

        const actor = await getTaskActor(user.id, user.role);
        const { canManage, canMove } = getTaskPermissions(actor, {
            createdById: String(task.createdBy),
            assigneeId: String(task.assignee)
        });

        // Durum (sütun) değişikliği
        if (body.status !== undefined) {
            if (!canMove) {
                return NextResponse.json({ msg: 'Bu görevin durumunu değiştirme yetkiniz yok.' }, { status: 403 });
            }
            if (!Object.values(TaskStatus).includes(body.status)) {
                return NextResponse.json({ msg: 'Geçersiz durum.' }, { status: 400 });
            }
            task.status = body.status;
            task.completedAt = body.status === TaskStatus.COMPLETED ? new Date() : null;
        }

        // İçerik düzenleme / yeniden atama
        const editsContent = ['title', 'description', 'priority', 'dueDate', 'assignee'].some((k) => body[k] !== undefined);
        if (editsContent) {
            if (!canManage) {
                return NextResponse.json({ msg: 'Bu görevi düzenleme yetkiniz yok.' }, { status: 403 });
            }

            if (body.title !== undefined) {
                const title = String(body.title).trim();
                if (!title || title.length > 200) {
                    return NextResponse.json({ msg: 'Geçersiz görev başlığı.' }, { status: 400 });
                }
                task.title = title;
            }
            if (body.description !== undefined) {
                const description = String(body.description).trim();
                if (description.length > 2000) {
                    return NextResponse.json({ msg: 'Açıklama çok uzun.' }, { status: 400 });
                }
                task.description = description;
            }
            if (body.priority !== undefined) {
                if (!Object.values(TaskPriority).includes(body.priority)) {
                    return NextResponse.json({ msg: 'Geçersiz öncelik.' }, { status: 400 });
                }
                task.priority = body.priority;
            }
            if (body.dueDate !== undefined) {
                if (body.dueDate === null || body.dueDate === '') {
                    task.dueDate = null;
                } else {
                    const d = new Date(body.dueDate);
                    if (isNaN(d.getTime())) {
                        return NextResponse.json({ msg: 'Geçersiz bitiş tarihi.' }, { status: 400 });
                    }
                    task.dueDate = d;
                }
            }
            if (body.assignee !== undefined && String(body.assignee) !== String(task.assignee)) {
                const newAssignee = String(body.assignee);
                if (!mongoose.Types.ObjectId.isValid(newAssignee) || !canAssignTo(actor, newAssignee)) {
                    return NextResponse.json({ msg: 'Bu kişiye görev atama yetkiniz yok.' }, { status: 403 });
                }
                const assigneeUser = await User.findById(newAssignee).select('isActive');
                if (!assigneeUser || assigneeUser.isActive === false) {
                    return NextResponse.json({ msg: 'Atanan kullanıcı bulunamadı veya aktif değil.' }, { status: 400 });
                }
                task.assignee = new mongoose.Types.ObjectId(newAssignee);
            }
        }

        await task.save();

        const populated = await Task.findById(task._id)
            .populate('createdBy', 'name role')
            .populate('assignee', 'name role');
        const perms = getTaskPermissions(actor, {
            createdById: String(task.createdBy),
            assigneeId: String(task.assignee)
        });

        return NextResponse.json({ ...populated!.toObject(), ...perms }, { status: 200 });
    } catch (err) {
        console.error('Task PUT error:', err);
        return NextResponse.json({ msg: 'Görev güncellenemedi' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;

    if (TASKS_READ_ONLY) {
        return NextResponse.json({ msg: 'Görev panosu şimdilik salt okunurdur; işlem yapılamaz.' }, { status: 403 });
    }

    try {
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ msg: 'Geçersiz görev ID.' }, { status: 400 });
        }

        await connectToDatabase();
        const task = await Task.findById(id);
        if (!task) {
            return NextResponse.json({ msg: 'Görev bulunamadı.' }, { status: 404 });
        }

        const actor = await getTaskActor(user.id, user.role);
        const { canManage } = getTaskPermissions(actor, {
            createdById: String(task.createdBy),
            assigneeId: String(task.assignee)
        });
        if (!canManage) {
            return NextResponse.json({ msg: 'Bu görevi silme yetkiniz yok.' }, { status: 403 });
        }

        await task.deleteOne();
        return NextResponse.json({ success: true, msg: 'Görev silindi.' }, { status: 200 });
    } catch (err) {
        console.error('Task DELETE error:', err);
        return NextResponse.json({ msg: 'Görev silinemedi' }, { status: 500 });
    }
}

import { getDownlineIds } from '@/src/lib/hierarchy';
import { UserRole } from '@/src/lib/models/User';

export interface TaskActor {
    id: string;
    isAdmin: boolean;
    downline: Set<string>;
}

export async function getTaskActor(userId: string, role: string): Promise<TaskActor> {
    const downline = await getDownlineIds(userId);
    return { id: String(userId), isAdmin: role === UserRole.ADMIN, downline: new Set(downline) };
}

// Kullanıcının görev atayabileceği kişi mi? (kendisi + hiyerarşide altındakiler; admin herkese atayabilir)
export function canAssignTo(actor: TaskActor, assigneeId: string): boolean {
    return actor.isAdmin || assigneeId === actor.id || actor.downline.has(assigneeId);
}

interface PermissionInput {
    createdById: string;
    assigneeId: string;
}

// canManage: düzenle / sil / yeniden ata  |  canMove: sütun (durum) değiştir
export function getTaskPermissions(actor: TaskActor, task: PermissionInput) {
    const canManage =
        actor.isAdmin ||
        task.createdById === actor.id ||
        actor.downline.has(task.assigneeId);
    const canMove = canManage || task.assigneeId === actor.id;
    return { canManage, canMove };
}

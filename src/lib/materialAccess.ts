import User, { UserRole } from '@/src/lib/models/User';

// Malzeme talebi oluşturma izni: admin her zaman, diğerleri yalnızca admin'in işaretlediği listedeki kullanıcılar.
export function isMaterialRequestAllowed(dbUser: { role?: string; isActive?: boolean; canCreateMaterialRequest?: boolean } | null): boolean {
    if (!dbUser || dbUser.isActive === false) return false;
    return dbUser.role === UserRole.ADMIN || dbUser.canCreateMaterialRequest === true;
}

export async function canUserCreateMaterialRequest(userId: string): Promise<boolean> {
    const dbUser = await User.findById(userId).select('role isActive canCreateMaterialRequest');
    return isMaterialRequestAllowed(dbUser);
}

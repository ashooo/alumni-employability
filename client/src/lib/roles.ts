export type UserRole = 'superadmin' | 'admin' | 'alumni';

export const isAdminLike = (role?: string | null) => role === 'admin' || role === 'superadmin';

export const isSuperAdmin = (role?: string | null) => role === 'superadmin';


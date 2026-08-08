const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#14b8a6'];

export const avatarColor = (name) => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

export const initials = (name) => (name?.trim()?.charAt(0) || '?').toUpperCase();

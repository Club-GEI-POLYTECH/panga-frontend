/** Les 5 rôles de Panga. */
export type Role = 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student';

export const ROLES: readonly Role[] = ['super_admin', 'admin', 'teacher', 'parent', 'student'];

export interface School {
  id: string;
  name: string;
  code?: string;
  /** Sous-titre fourni par /schools/public (ex. « CODE · Ville »). */
  subtitle?: string;
  logoUrl?: string | null;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string | null;
  /** École active renvoyée par le backend (user.schoolId). */
  schoolId?: string | null;
  /** Écoles auxquelles l'utilisateur a accès (parents multi-écoles). */
  schools?: School[];
  /* Champs de profil renvoyés par /auth/profile (auth/me). */
  status?: string | null;
  phone?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

export interface LoginRequest {
  /** email, username ou numéro d'élève accepté par le backend. */
  identifier: string;
  password: string;
  /** Optionnel : UUID école si l'identifiant correspond à plusieurs comptes. */
  schoolId?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Entrée du journal de connexions (GET /auth/login-history). */
export interface LoginHistoryEntry {
  id?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: string;
  success?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Durée de validité de l'access token (secondes), si fournie. */
  expiresIn?: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
  schools?: School[];
}

export type RefreshResponse = AuthTokens;

/** Session côté front (access token gardé en mémoire uniquement). */
export interface Session {
  user: User;
  activeSchool: School | null;
}

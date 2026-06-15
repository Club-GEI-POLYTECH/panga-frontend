/**
 * Modèles « école » (vue admin). Champs optionnels + index signature : les
 * formes exactes renvoyées par le backend peuvent varier.
 */

export interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  matricule?: string;
  studentNumber?: string;
  classInstanceId?: string;
  className?: string;
  parentId?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface Parent {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  childrenCount?: number;
  [key: string]: unknown;
}

export interface ClassTemplate {
  id: string;
  name?: string;
  level?: number;
  section?: string;
  capacity?: number;
  [key: string]: unknown;
}

export interface ClassInstance {
  id: string;
  name?: string;
  templateId?: string;
  schoolYear?: string;
  programId?: string;
  studentCount?: number;
  capacity?: number;
  level?: number;
  section?: string;
  [key: string]: unknown;
}

export interface FeeStructure {
  id: string;
  name?: string;
  displayName?: string;
  feeType?: string;
  amount?: number;
  currency?: string;
  schoolYear?: string;
  classId?: string;
  feeFrequency?: string;
  isMandatory?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface Payment {
  id: string;
  studentId?: string;
  studentName?: string;
  feeStructureId?: string;
  amountPaid?: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod?: string;
  status?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface Announcement {
  id: string;
  title?: string;
  content?: string;
  targetAudience?: string;
  priority?: string;
  author?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UserNotification {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

/* ----------------------------- DTOs d'écriture ---------------------------- */

export interface CreateStudentDto {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  classInstanceId?: string;
  parentId?: string;
}

export interface CreateTeacherDto {
  email: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  homeroomClassInstanceIds?: string[];
}

export interface CreateParentDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateClassTemplateDto {
  name: string;
  level: number;
  section?: string;
  capacity?: number;
}

export interface CreateClassInstanceDto {
  templateId: string;
  schoolYear: string;
}

export interface CreateFeeStructureDto {
  name: string;
  displayName?: string;
  feeType: string;
  amount: number;
  currency: string;
  schoolYear: string;
  classId?: string;
  feeFrequency?: string;
  isMandatory?: boolean;
  status?: string;
}

export interface CreatePaymentDto {
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  targetAudience: string;
  priority: string;
}

export interface SendNotificationDto {
  title: string;
  message: string;
  type: string;
  recipientUserIds: string[];
}

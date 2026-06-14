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

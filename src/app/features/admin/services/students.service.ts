import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PageQuery } from '../../../core/models/api.models';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateStudentDto, Student } from '../models/admin.models';

/** Élèves (dossier « 7 — Élèves »). */
@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/students`;

  list(query: PageQuery = { page: 1, limit: 10 }): Observable<ListResult<Student>> {
    return this.http.get<unknown>(this.base, { params: toHttpParams(query) }).pipe(
      map((r) => {
        const res = unwrapList<Student>(r);
        return { ...res, items: res.items.map(flattenStudent) };
      }),
    );
  }

  get(id: string): Observable<Student> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => flattenStudent(unwrapEnvelope<Student>(r))));
  }

  create(dto: CreateStudentDto | Record<string, unknown>): Observable<Student> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Student>(r)));
  }

  update(id: string, dto: Record<string, unknown>): Observable<Student> {
    return this.http
      .patch<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Student>(r)));
  }

  /** Lie un parent existant à l'élève (idempotent). */
  linkParent(studentId: string, parentId: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/${studentId}/parents`, { parentId });
  }

  unlinkParent(studentId: string, parentId: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${studentId}/parents/${parentId}`);
  }

  /** Import d'une liste d'élèves via fichier Excel (.xlsx/.xls). */
  importExcel(file: File, schoolYear: string): Observable<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    form.append('schoolYear', schoolYear);
    return this.http
      .post<unknown>(`${this.base}/import/excel`, form)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Modèle Excel d'import (binaire). */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  grades(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base}/${id}/grades`).pipe(map((r) => unwrapEnvelope(r)));
  }

  payments(id: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/${id}/payments`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  attendance(id: string): Observable<unknown> {
    return this.http
      .get<unknown>(`${this.base}/${id}/attendance`)
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}

/**
 * Les infos personnelles (prénom, nom, sexe, date de naissance, contacts…) sont
 * portées par le compte `user` imbriqué, pas au niveau de l'élève. On les remonte
 * à plat (sans écraser un champ propre à l'élève : id, status, schoolId…) pour
 * que toutes les vues (liste, détail, notes, présences…) les affichent.
 */
const USER_FIELDS = [
  'firstName',
  'lastName',
  'postnom',
  'dateOfBirth',
  'placeOfBirth',
  'gender',
  'nationality',
  'address',
  'city',
  'province',
  'postalCode',
  'country',
  'phone',
  'secondaryPhone',
  'email',
  'bloodGroup',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelation',
  'avatar',
  'profilePhoto',
] as const;

function flattenStudent(student: Student): Student {
  const raw = student as Record<string, unknown>;
  const user = raw['user'] as Record<string, unknown> | undefined;
  if (!user) {
    return student;
  }
  const flat: Record<string, unknown> = { ...raw };
  for (const key of USER_FIELDS) {
    const current = flat[key];
    if ((current === undefined || current === null || current === '') && user[key] != null) {
      flat[key] = user[key];
    }
  }
  return flat as Student;
}

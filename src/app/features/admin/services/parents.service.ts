import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type { CreateParentDto, Parent, Student } from '../models/admin.models';

/** Parents / responsables (dossier « 6 »). */
@Injectable({ providedIn: 'root' })
export class ParentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/parents`;

  list(): Observable<ListResult<Parent>> {
    return this.http.get<unknown>(this.base).pipe(
      map((r) => {
        const res = unwrapList<Parent>(r);
        return { ...res, items: res.items.map(flattenParent) };
      }),
    );
  }

  get(id: string): Observable<Parent> {
    return this.http
      .get<unknown>(`${this.base}/${id}`)
      .pipe(map((r) => flattenParent(unwrapEnvelope<Parent>(r))));
  }

  /** Profil du parent connecté (inclut généralement les enfants liés). */
  me(): Observable<Record<string, unknown>> {
    return this.http
      .get<unknown>(`${this.base}/me`)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  /** Enfants d'un parent. */
  students(id: string): Observable<Student[]> {
    return this.http
      .get<unknown>(`${this.base}/${id}/students`)
      .pipe(map((r) => unwrapList<Student>(r).items));
  }

  create(dto: CreateParentDto | Record<string, unknown>): Observable<Parent> {
    return this.http.post<unknown>(this.base, dto).pipe(map((r) => unwrapEnvelope<Parent>(r)));
  }

  /** Mise à jour : le backend expose un PUT (UpdateParentDto). */
  update(id: string, dto: Record<string, unknown>): Observable<Parent> {
    return this.http
      .put<unknown>(`${this.base}/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<Parent>(r)));
  }

  updateStatus(id: string, status: string): Observable<Parent> {
    return this.http
      .put<unknown>(`${this.base}/${id}/status`, { status })
      .pipe(map((r) => unwrapEnvelope<Parent>(r)));
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/${id}`);
  }

  importExcel(file: File): Observable<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<unknown>(`${this.base}/import/excel`, form)
      .pipe(map((r) => unwrapEnvelope<Record<string, unknown>>(r)));
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }
}

/**
 * Les infos personnelles (prénom, nom, contacts…) sont portées par le compte
 * `user` imbriqué. On les remonte à plat (sans écraser les champs propres au
 * parent : id, status, schoolId, relationship…) et on calcule childrenCount.
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
  'nationalIdNumber',
  'avatar',
  'profilePhoto',
] as const;

function flattenParent(parent: Parent): Parent {
  const raw = parent as Record<string, unknown>;
  const user = raw['user'] as Record<string, unknown> | undefined;
  const flat: Record<string, unknown> = { ...raw };
  if (user) {
    for (const key of USER_FIELDS) {
      const current = flat[key];
      if ((current === undefined || current === null || current === '') && user[key] != null) {
        flat[key] = user[key];
      }
    }
  }
  const students = raw['students'];
  if (Array.isArray(students)) {
    flat['childrenCount'] = students.length;
  }
  return flat as Parent;
}

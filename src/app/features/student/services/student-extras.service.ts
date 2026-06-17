import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';

type Row = Record<string, unknown>;

/** Modules « services » accessibles à l'élève : communications, calendrier,
 *  bibliothèque, transport, cantine (lecture + actions simples). */
@Injectable({ providedIn: 'root' })
export class StudentExtrasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private list(path: string, params?: Record<string, unknown>): Observable<Row[]> {
    return this.http
      .get<unknown>(`${this.base}${path}`, { params: toHttpParams(params) })
      .pipe(map((r) => unwrapList<Row>(r).items));
  }

  /* ----------------------------- Communications ----------------------------- */

  announcements(): Observable<Row[]> {
    return this.list('/communications/announcements');
  }
  acknowledgeAnnouncement(id: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.base}/communications/announcements/${id}/acknowledge`,
      {},
    );
  }
  messages(): Observable<Row[]> {
    return this.list('/communications/messages');
  }

  /* ------------------------------- Calendrier ------------------------------- */

  events(): Observable<Row[]> {
    return this.list('/calendar/events');
  }
  holidays(): Observable<Row[]> {
    return this.list('/calendar/holidays');
  }

  /* ------------------------------ Bibliothèque ------------------------------ */

  bookCategories(): Observable<Row[]> {
    return this.list('/library/categories');
  }
  books(search?: string): Observable<Row[]> {
    return this.list('/library/books', { search, q: search });
  }
  borrowedBooks(studentId: string): Observable<Row[]> {
    return this.list(`/library/students/${studentId}/borrowed`);
  }
  libraryFines(studentId: string): Observable<Row[]> {
    return this.list(`/library/students/${studentId}/fines`);
  }
  reserve(payload: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/library/transactions/reserve`, payload)
      .pipe(map((r) => unwrapEnvelope(r)));
  }

  /* -------------------------------- Transport ------------------------------- */

  transportRoutes(): Observable<Row[]> {
    return this.list('/transport/routes');
  }
  myTransport(studentId: string): Observable<Row> {
    return this.http
      .get<unknown>(`${this.base}/transport/students/${studentId}`)
      .pipe(map((r) => unwrapEnvelope<Row>(r)));
  }

  /* --------------------------------- Cantine -------------------------------- */

  menus(): Observable<Row[]> {
    return this.list('/cafeteria/menus');
  }
  menuItems(): Observable<Row[]> {
    return this.list('/cafeteria/menu-items');
  }
  myOrders(studentId: string): Observable<Row[]> {
    return this.list(`/cafeteria/students/${studentId}/orders`);
  }
  myAllergies(studentId: string): Observable<Row[]> {
    return this.list(`/cafeteria/students/${studentId}/allergies`);
  }
  orderMeal(payload: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/cafeteria/orders`, payload)
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}

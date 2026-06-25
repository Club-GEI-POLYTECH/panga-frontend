import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import type {
  Announcement,
  CreateAnnouncementDto,
  SendNotificationDto,
  UserNotification,
} from '../models/admin.models';

/** Communications & notifications (dossier « 12 »). */
@Injectable({ providedIn: 'root' })
export class CommunicationsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** `schoolId` requis quand un super_admin agit au nom d'une école (sinon 400). */
  announcements(schoolId?: string): Observable<ListResult<Announcement>> {
    return this.http
      .get<unknown>(`${this.base}/communications/announcements`, {
        params: toHttpParams({ schoolId }),
      })
      .pipe(map((r) => unwrapList<Announcement>(r)));
  }

  createAnnouncement(dto: CreateAnnouncementDto, schoolId?: string): Observable<Announcement> {
    return this.http
      .post<unknown>(`${this.base}/communications/announcements`, dto, {
        params: toHttpParams({ schoolId }),
      })
      .pipe(map((r) => unwrapEnvelope<Announcement>(r)));
  }

  myNotifications(): Observable<ListResult<UserNotification>> {
    return this.http
      .get<unknown>(`${this.base}/notifications/me`)
      .pipe(map((r) => unwrapList<UserNotification>(r)));
  }

  sendNotification(dto: SendNotificationDto): Observable<UserNotification> {
    return this.http
      .post<unknown>(`${this.base}/notifications`, dto)
      .pipe(map((r) => unwrapEnvelope<UserNotification>(r)));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
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

  announcements(): Observable<ListResult<Announcement>> {
    return this.http
      .get<unknown>(`${this.base}/communications/announcements`)
      .pipe(map((r) => unwrapList<Announcement>(r)));
  }

  createAnnouncement(dto: CreateAnnouncementDto): Observable<Announcement> {
    return this.http
      .post<unknown>(`${this.base}/communications/announcements`, dto)
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

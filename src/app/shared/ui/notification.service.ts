import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

type Tone = 'success' | 'error' | 'warning' | 'info';

/** Toasts applicatifs (wrapper MatSnackBar) avec coloration par ton. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success');
  }
  error(message: string): void {
    this.show(message, 'error', 6000);
  }
  warning(message: string): void {
    this.show(message, 'warning');
  }
  info(message: string): void {
    this.show(message, 'info');
  }

  private show(message: string, tone: Tone, duration = 4000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`panga-toast`, `panga-toast--${tone}`],
    };
    this.snack.open(message, 'OK', config);
  }
}

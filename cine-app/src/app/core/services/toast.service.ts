import { Injectable, signal } from '@angular/core';

export type TipoToast = 'error' | 'exito' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private siguienteId = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  cerrar(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private mostrar(tipo: TipoToast, mensaje: string): void {
    const id = this.siguienteId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), 5000);
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/peliculas.service';
import { AlertasService } from '../../core/services/alertas.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PeliculaConGeneros } from '../../core/models/database.types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly peliculasService = inject(PeliculasService);
  private readonly alertasService = inject(AlertasService);
  protected readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly masVendidas = signal<PeliculaConGeneros[]>([]);
  protected readonly proximamente = signal<PeliculaConGeneros[]>([]);
  protected readonly suscripciones = signal<Set<string>>(new Set());
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
    this.alertasService.revisarPendientes();
  }

  private async cargar(): Promise<void> {
    const [activas, proximamente, suscripciones] = await Promise.all([
      this.peliculasService.listarActivas(),
      this.peliculasService.listarProximamente(),
      this.alertasService.listarSuscripciones(),
    ]);

    const masRecientes = [...activas].sort((a, b) => b.created_at.localeCompare(a.created_at));
    this.masVendidas.set(masRecientes.slice(0, 3));
    this.proximamente.set(proximamente);
    this.suscripciones.set(suscripciones);
    this.cargando.set(false);
  }

  async alternarAlerta(peliculaId: string, nombre: string): Promise<void> {
    const suscripto = this.suscripciones().has(peliculaId);

    try {
      if (suscripto) {
        await this.alertasService.desuscribirse(peliculaId);
        this.toastService.info(`Ya no vas a recibir avisos de "${nombre}".`);
      } else {
        await this.alertasService.suscribirse(peliculaId);
        this.toastService.exito(`Te vamos a avisar cuando "${nombre}" tenga funciones.`);
      }

      const nuevasSuscripciones = new Set(this.suscripciones());
      if (suscripto) {
        nuevasSuscripciones.delete(peliculaId);
      } else {
        nuevasSuscripciones.add(peliculaId);
      }
      this.suscripciones.set(nuevasSuscripciones);
    } catch (err) {
      this.toastService.error(err instanceof Error ? err.message : 'No se pudo procesar la alerta.');
    }
  }
}

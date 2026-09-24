import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { PeliculaConGeneros } from '../../../core/models/database.types';

@Component({
  selector: 'app-peliculas-admin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './peliculas-admin.html',
  styleUrl: './peliculas-admin.scss',
})
export class PeliculasAdmin {
  private readonly peliculasService = inject(PeliculasService);
  private readonly toastService = inject(ToastService);

  protected readonly peliculas = signal<PeliculaConGeneros[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.peliculas.set(await this.peliculasService.listarActivas());
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudieron cargar las películas.'));
    } finally {
      this.cargando.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ComprasService } from '../../../core/services/compras.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { Pelicula, Resena } from '../../../core/models/database.types';

interface PeliculaVista {
  pelicula: Pelicula;
  fecha: string;
  miResena: Resena | null;
}

@Component({
  selector: 'app-mis-peliculas',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.scss',
})
export class MisPeliculas {
  private readonly comprasService = inject(ComprasService);
  private readonly resenasService = inject(ResenasService);
  private readonly toastService = inject(ToastService);

  protected readonly peliculas = signal<PeliculaVista[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [vistas, misResenas] = await Promise.all([
        this.comprasService.listarPeliculasVistas(),
        this.resenasService.misResenas(),
      ]);

      this.peliculas.set(
        vistas.map((v) => ({
          pelicula: v.pelicula,
          fecha: v.fecha,
          miResena: misResenas.get(v.pelicula.id) ?? null,
        })),
      );
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo cargar tus películas.'));
    } finally {
      this.cargando.set(false);
    }
  }
}

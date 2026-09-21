import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
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

  protected readonly peliculas = signal<PeliculaConGeneros[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    this.peliculas.set(await this.peliculasService.listarActivas());
    this.cargando.set(false);
  }
}

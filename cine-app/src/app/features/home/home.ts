import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/peliculas.service';
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

  protected readonly masVendidas = signal<PeliculaConGeneros[]>([]);
  protected readonly proximamente = signal<PeliculaConGeneros[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [activas, proximamente] = await Promise.all([
      this.peliculasService.listarActivas(),
      this.peliculasService.listarProximamente(),
    ]);

    const masRecientes = [...activas].sort((a, b) => b.created_at.localeCompare(a.created_at));
    this.masVendidas.set(masRecientes.slice(0, 3));
    this.proximamente.set(proximamente);
    this.cargando.set(false);
  }
}

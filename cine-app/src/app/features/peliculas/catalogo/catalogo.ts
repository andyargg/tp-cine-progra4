import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { Genero, PeliculaConGeneros } from '../../../core/models/database.types';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly peliculasService = inject(PeliculasService);

  protected readonly peliculas = signal<PeliculaConGeneros[]>([]);
  protected readonly generos = signal<Genero[]>([]);
  protected readonly cargando = signal(true);

  protected readonly busqueda = signal('');
  protected readonly generoSeleccionado = signal<number | null>(null);

  protected readonly peliculasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const generoId = this.generoSeleccionado();

    return this.peliculas().filter((pelicula) => {
      const coincideNombre = !termino || pelicula.nombre.toLowerCase().includes(termino);
      const coincideGenero = !generoId || pelicula.generos.some((g) => g.id === generoId);
      return coincideNombre && coincideGenero;
    });
  });

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [peliculas, generos] = await Promise.all([
      this.peliculasService.listarActivas(),
      this.peliculasService.listarGeneros(),
    ]);

    this.peliculas.set(peliculas);
    this.generos.set(generos);
    this.cargando.set(false);
  }
}

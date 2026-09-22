import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { SalasService } from '../../../core/services/salas.service';
import { calcularPrecioVigente } from '../../../core/utils/funciones.util';
import { Funcion, Genero, PeliculaConGeneros } from '../../../core/models/database.types';

interface HorarioMostrado {
  funcion: Funcion;
  precioVigente: number;
  nombreSala: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly salasService = inject(SalasService);

  protected readonly peliculas = signal<PeliculaConGeneros[]>([]);
  protected readonly generos = signal<Genero[]>([]);
  protected readonly funcionesPorPelicula = signal<Map<string, HorarioMostrado[]>>(new Map());
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

  protected horariosDe(peliculaId: string): HorarioMostrado[] {
    return this.funcionesPorPelicula().get(peliculaId) ?? [];
  }

  private async cargar(): Promise<void> {
    const [peliculas, generos, salas] = await Promise.all([
      this.peliculasService.listarActivas(),
      this.peliculasService.listarGeneros(),
      this.salasService.listar(),
    ]);

    this.peliculas.set(peliculas);
    this.generos.set(generos);

    const funciones = await this.funcionesService.listarFuturasPorPeliculas(
      peliculas.map((p) => p.id),
    );

    const ahora = new Date();
    const mapa = new Map<string, HorarioMostrado[]>();

    for (const funcion of funciones) {
      const pelicula = peliculas.find((p) => p.id === funcion.pelicula_id);
      const precioVigente = calcularPrecioVigente(
        funcion.precio_base,
        pelicula?.preventa_apertura ?? null,
        pelicula?.preventa_precio ?? null,
        pelicula?.estreno_fecha ?? null,
        ahora,
      );
      const nombreSala = salas.find((s) => s.id === funcion.sala_id)?.nombre ?? '';

      const lista = mapa.get(funcion.pelicula_id) ?? [];
      lista.push({ funcion, precioVigente, nombreSala });
      mapa.set(funcion.pelicula_id, lista);
    }

    this.funcionesPorPelicula.set(mapa);
    this.cargando.set(false);
  }
}

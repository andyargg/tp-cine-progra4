import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { SalasService } from '../../../core/services/salas.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { calcularPrecioVigente } from '../../../core/utils/funciones.util';
import { mensajeDeError } from '../../../core/utils/error.util';
import {
  Funcion,
  PeliculaConGeneros,
  Resena,
  ResenaPromedio,
} from '../../../core/models/database.types';

interface HorarioMostrado {
  funcion: Funcion;
  precioVigente: number;
  nombreSala: string;
}

@Component({
  selector: 'app-pelicula-detalle',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.scss',
})
export class PeliculaDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly salasService = inject(SalasService);
  private readonly resenasService = inject(ResenasService);
  private readonly toastService = inject(ToastService);
  protected readonly authService = inject(AuthService);

  private readonly peliculaId = this.route.snapshot.paramMap.get('id')!;

  protected readonly cargando = signal(true);
  protected readonly pelicula = signal<PeliculaConGeneros | null>(null);
  protected readonly promedio = signal<ResenaPromedio | null>(null);
  protected readonly resenas = signal<Resena[]>([]);
  protected readonly horarios = signal<HorarioMostrado[]>([]);
  protected readonly puedeResenar = signal(false);
  protected readonly miResena = signal<Resena | null>(null);
  protected readonly estrellasNueva = signal(5);
  protected readonly comentarioNuevo = signal('');
  protected readonly enviandoResena = signal(false);

  protected readonly estrellasOpciones = [1, 2, 3, 4, 5];

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const pelicula = await this.peliculasService.obtenerPorId(this.peliculaId);

    if (!pelicula) {
      this.cargando.set(false);
      return;
    }

    this.pelicula.set(pelicula);

    const [promedio, resenas, funciones, salas, miResena, puedeResenar] = await Promise.all([
      this.resenasService.promedioDe(this.peliculaId),
      this.resenasService.listarPorPelicula(this.peliculaId),
      this.funcionesService.listarFuturasPorPeliculas([this.peliculaId]),
      this.salasService.listar(),
      this.resenasService.miResenaDe(this.peliculaId),
      this.resenasService.puedeResenar(this.peliculaId),
    ]);

    this.promedio.set(promedio);
    this.resenas.set(resenas);
    this.miResena.set(miResena);
    this.puedeResenar.set(puedeResenar && !miResena);

    const ahora = new Date();
    this.horarios.set(
      funciones.map((funcion) => ({
        funcion,
        precioVigente: calcularPrecioVigente(
          funcion.precio_base,
          pelicula.preventa_apertura,
          pelicula.preventa_precio,
          pelicula.estreno_fecha,
          ahora,
        ),
        nombreSala: salas.find((s) => s.id === funcion.sala_id)?.nombre ?? '',
      })),
    );

    this.cargando.set(false);
  }

  async enviarResena(): Promise<void> {
    this.enviandoResena.set(true);

    try {
      await this.resenasService.crear(
        this.peliculaId,
        this.estrellasNueva(),
        this.comentarioNuevo().trim() || null,
      );

      this.toastService.exito('¡Gracias por tu reseña!');
      this.comentarioNuevo.set('');

      const [promedio, resenas, miResena] = await Promise.all([
        this.resenasService.promedioDe(this.peliculaId),
        this.resenasService.listarPorPelicula(this.peliculaId),
        this.resenasService.miResenaDe(this.peliculaId),
      ]);

      this.promedio.set(promedio);
      this.resenas.set(resenas);
      this.miResena.set(miResena);
      this.puedeResenar.set(false);
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo guardar la reseña.'));
    } finally {
      this.enviandoResena.set(false);
    }
  }
}

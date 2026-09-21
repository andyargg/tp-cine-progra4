import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormatoPelicula, Genero } from '../../../core/models/database.types';

@Component({
  selector: 'app-pelicula-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pelicula-form.html',
  styleUrl: './pelicula-form.scss',
})
export class PeliculaForm {
  private readonly fb = inject(FormBuilder);
  private readonly peliculasService = inject(PeliculasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly generos = signal<Genero[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly esEdicion = signal(false);

  private peliculaId: string | null = null;

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    imagen_url: [''],
    sinopsis: [''],
    duracion_minutos: [90, [Validators.required, Validators.min(1)]],
    formato: ['2D' as FormatoPelicula, Validators.required],
    idioma: ['Castellano', Validators.required],
    restriccion_edad: [0, Validators.required],
    estreno_fecha: [''],
    generos: this.fb.array<FormControl<boolean>>([]),
  });

  protected get generosArray() {
    return this.form.controls.generos;
  }

  constructor() {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    const generos = await this.peliculasService.listarGeneros();
    this.generos.set(generos);
    generos.forEach(() => this.generosArray.push(this.fb.control(false, { nonNullable: true })));

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.peliculaId = id;
      this.esEdicion.set(true);
      const pelicula = await this.peliculasService.obtenerPorId(id);

      if (pelicula) {
        this.form.patchValue({
          nombre: pelicula.nombre,
          imagen_url: pelicula.imagen_url ?? '',
          sinopsis: pelicula.sinopsis ?? '',
          duracion_minutos: pelicula.duracion_minutos,
          formato: pelicula.formato,
          idioma: pelicula.idioma,
          restriccion_edad: pelicula.restriccion_edad,
          estreno_fecha: pelicula.estreno_fecha ?? '',
        });

        const idsSeleccionados = new Set(pelicula.generos.map((g) => g.id));
        generos.forEach((genero, i) =>
          this.generosArray.at(i).setValue(idsSeleccionados.has(genero.id)),
        );
      }
    }

    this.cargando.set(false);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Revisá los campos del formulario.');
      return;
    }

    this.guardando.set(true);

    const valores = this.form.getRawValue();
    const generoIds = this.generos()
      .filter((_, i) => valores.generos[i])
      .map((g) => g.id);

    const datos = {
      nombre: valores.nombre!,
      imagen_url: valores.imagen_url || null,
      sinopsis: valores.sinopsis || null,
      duracion_minutos: valores.duracion_minutos!,
      formato: valores.formato!,
      idioma: valores.idioma!,
      restriccion_edad: valores.restriccion_edad!,
      estreno_fecha: valores.estreno_fecha || null,
    };

    try {
      if (this.peliculaId) {
        await this.peliculasService.actualizar(this.peliculaId, datos, generoIds);
      } else {
        await this.peliculasService.crear(datos, generoIds);
      }

      this.toastService.exito(`"${datos.nombre}" guardada.`);
      this.router.navigateByUrl('/admin/peliculas');
    } catch (err) {
      this.toastService.error(
        err instanceof Error ? err.message : 'No se pudo guardar la película.',
      );
      this.guardando.set(false);
    }
  }
}

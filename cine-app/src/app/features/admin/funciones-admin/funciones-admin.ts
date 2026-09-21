import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { ToastService } from '../../../core/services/toast.service';
import { Funcion, PeliculaConGeneros } from '../../../core/models/database.types';

interface DiaSemana {
  label: string;
  valor: number;
}

const DIAS_SEMANA: DiaSemana[] = [
  { label: 'Lun', valor: 1 },
  { label: 'Mar', valor: 2 },
  { label: 'Mié', valor: 3 },
  { label: 'Jue', valor: 4 },
  { label: 'Vie', valor: 5 },
  { label: 'Sáb', valor: 6 },
  { label: 'Dom', valor: 0 },
];

@Component({
  selector: 'app-funciones-admin',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './funciones-admin.html',
  styleUrl: './funciones-admin.scss',
})
export class FuncionesAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly toastService = inject(ToastService);

  protected readonly diasSemana = DIAS_SEMANA;
  protected readonly peliculas = signal<PeliculaConGeneros[]>([]);
  protected readonly proximas = signal<Funcion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);

  protected readonly form = this.fb.group({
    peliculaId: ['', Validators.required],
    dias: this.fb.array<FormControl<boolean>>(
      DIAS_SEMANA.map(() => this.fb.control(false, { nonNullable: true })),
    ),
    hora: ['18:00', Validators.required],
    desde: ['', Validators.required],
    hasta: ['', Validators.required],
    precioBase: [3000, [Validators.required, Validators.min(1)]],
  });

  protected get diasArray() {
    return this.form.controls.dias;
  }

  protected nombrePelicula(peliculaId: string): string {
    return this.peliculas().find((p) => p.id === peliculaId)?.nombre ?? '';
  }

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [peliculas, proximas] = await Promise.all([
      this.peliculasService.listarActivas(),
      this.funcionesService.listarProximas(),
    ]);

    this.peliculas.set(peliculas);
    this.proximas.set(proximas);
    this.cargando.set(false);
  }

  async crear(): Promise<void> {
    const diasSeleccionados = this.diasArray.value
      .map((marcado, i) => (marcado ? this.diasSemana[i].valor : null))
      .filter((v): v is number => v !== null);

    if (this.form.invalid || diasSeleccionados.length === 0) {
      this.form.markAllAsTouched();
      this.toastService.error('Completá el formulario y elegí al menos un día.');
      return;
    }

    this.creando.set(true);
    const valores = this.form.getRawValue();

    try {
      const resultado = await this.funcionesService.crearLote({
        peliculaId: valores.peliculaId!,
        diasSemana: diasSeleccionados,
        hora: valores.hora!,
        desde: valores.desde!,
        hasta: valores.hasta!,
        precioBase: valores.precioBase!,
      });

      if (resultado.creadas > 0) {
        this.toastService.exito(`Se crearon ${resultado.creadas} funciones.`);
      }

      if (resultado.fallidas.length > 0) {
        this.toastService.error(
          `No se pudieron asignar ${resultado.fallidas.length} funciones (sin sala libre): ${resultado.fallidas.join(', ')}`,
        );
      }

      await this.cargar();
    } catch (err) {
      this.toastService.error(
        err instanceof Error ? err.message : 'No se pudieron crear las funciones.',
      );
    } finally {
      this.creando.set(false);
    }
  }
}

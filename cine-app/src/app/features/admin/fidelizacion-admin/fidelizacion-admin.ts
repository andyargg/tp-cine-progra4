import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CuponesService } from '../../../core/services/cupones.service';
import { RecompensasService } from '../../../core/services/recompensas.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { Cupon, Recompensa } from '../../../core/models/database.types';

@Component({
  selector: 'app-fidelizacion-admin',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './fidelizacion-admin.html',
  styleUrl: './fidelizacion-admin.scss',
})
export class FidelizacionAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly cuponesService = inject(CuponesService);
  private readonly recompensasService = inject(RecompensasService);
  private readonly toastService = inject(ToastService);

  protected readonly cupones = signal<Cupon[]>([]);
  protected readonly recompensas = signal<Recompensa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardandoCupon = signal(false);
  protected readonly guardandoRecompensa = signal(false);

  protected readonly formCupon = this.fb.group({
    codigo: ['', Validators.required],
    porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    edad_minima: [null as number | null],
    vigencia_desde: ['', Validators.required],
    vigencia_hasta: [''],
  });

  protected readonly formRecompensa = this.fb.group({
    nombre: ['', Validators.required],
    costo_puntos: [100, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    const [cupones, recompensas] = await Promise.all([
      this.cuponesService.listar(),
      this.recompensasService.listarTodas(),
    ]);

    this.cupones.set(cupones);
    this.recompensas.set(recompensas);
    this.cargando.set(false);
  }

  async crearCupon(): Promise<void> {
    if (this.formCupon.invalid) {
      this.formCupon.markAllAsTouched();
      return;
    }

    this.guardandoCupon.set(true);
    const valores = this.formCupon.getRawValue();

    try {
      await this.cuponesService.crear({
        codigo: valores.codigo!,
        porcentaje: valores.porcentaje!,
        edad_minima: valores.edad_minima,
        vigencia_desde: valores.vigencia_desde!,
        vigencia_hasta: valores.vigencia_hasta || null,
      });

      this.formCupon.reset({ codigo: '', porcentaje: 10, edad_minima: null, vigencia_desde: '', vigencia_hasta: '' });
      await this.cargar();
      this.toastService.exito('Cupón creado.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo crear el cupón.'));
    } finally {
      this.guardandoCupon.set(false);
    }
  }

  async alternarCupon(cupon: Cupon): Promise<void> {
    try {
      await this.cuponesService.cambiarActivo(cupon.id, !cupon.activo);
      await this.cargar();
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo actualizar el cupón.'));
    }
  }

  async crearRecompensa(): Promise<void> {
    if (this.formRecompensa.invalid) {
      this.formRecompensa.markAllAsTouched();
      return;
    }

    this.guardandoRecompensa.set(true);
    const { nombre, costo_puntos } = this.formRecompensa.getRawValue();

    try {
      await this.recompensasService.crear(nombre!, costo_puntos!);
      this.formRecompensa.reset({ nombre: '', costo_puntos: 100 });
      await this.cargar();
      this.toastService.exito('Recompensa creada.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo crear la recompensa.'));
    } finally {
      this.guardandoRecompensa.set(false);
    }
  }

  async alternarRecompensa(recompensa: Recompensa): Promise<void> {
    try {
      await this.recompensasService.cambiarActiva(recompensa.id, !recompensa.activa);
      await this.cargar();
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo actualizar la recompensa.'));
    }
  }
}

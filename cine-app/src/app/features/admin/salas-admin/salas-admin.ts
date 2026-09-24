import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SalasService } from '../../../core/services/salas.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { Sala } from '../../../core/models/database.types';

@Component({
  selector: 'app-salas-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './salas-admin.html',
  styleUrl: './salas-admin.scss',
})
export class SalasAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly salasService = inject(SalasService);
  private readonly toastService = inject(ToastService);

  protected readonly salas = signal<Sala[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
  });

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.salas.set(await this.salasService.listar());
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudieron cargar las salas.'));
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Ingresá un nombre para la sala.');
      return;
    }

    this.creando.set(true);
    const { nombre } = this.form.getRawValue();

    try {
      await this.salasService.crear(nombre!);
      this.form.reset();
      await this.cargar();
      this.toastService.exito(`Sala "${nombre}" creada con 518 butacas.`);
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo crear la sala.'));
    } finally {
      this.creando.set(false);
    }
  }

  async alternarActiva(sala: Sala): Promise<void> {
    try {
      await this.salasService.cambiarActiva(sala.id, !sala.activa);
      await this.cargar();
    } catch (err) {
      this.toastService.error(
        mensajeDeError(err, 'No se pudo actualizar la sala.'),
      );
    }
  }
}

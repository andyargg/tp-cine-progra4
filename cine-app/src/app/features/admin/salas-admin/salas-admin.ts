import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SalasService } from '../../../core/services/salas.service';
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

  protected readonly salas = signal<Sala[]>([]);
  protected readonly cargando = signal(true);
  protected readonly creando = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
  });

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    this.salas.set(await this.salasService.listar());
    this.cargando.set(false);
  }

  async crear(): Promise<void> {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Ingresá un nombre para la sala.');
      return;
    }

    this.creando.set(true);
    const { nombre } = this.form.getRawValue();

    try {
      await this.salasService.crear(nombre!);
      this.form.reset();
      await this.cargar();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      this.creando.set(false);
    }
  }

  async alternarActiva(sala: Sala): Promise<void> {
    await this.salasService.cambiarActiva(sala.id, !sala.activa);
    await this.cargar();
  }
}

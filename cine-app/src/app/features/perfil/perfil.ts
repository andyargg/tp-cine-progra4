import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ComprasService } from '../../core/services/compras.service';
import { FuncionesService } from '../../core/services/funciones.service';
import { PeliculasService } from '../../core/services/peliculas.service';
import { SalasService } from '../../core/services/salas.service';
import { ButacasService } from '../../core/services/butacas.service';
import { ToastService } from '../../core/services/toast.service';
import { calcularEdad } from '../../core/utils/edad.util';
import { generarEntradaPdf } from '../../core/utils/entrada-pdf.util';
import { Compra } from '../../core/models/database.types';

type EstadoGuardado = 'inicial' | 'guardando' | 'guardado' | 'error';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly comprasService = inject(ComprasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly salasService = inject(SalasService);
  private readonly butacasService = inject(ButacasService);
  private readonly toastService = inject(ToastService);

  protected readonly usuario = this.authService.usuarioActual;
  protected readonly estado = signal<EstadoGuardado>('inicial');
  protected readonly misCompras = signal<Compra[]>([]);
  protected readonly cancelando = signal<string | null>(null);

  protected readonly edad = computed(() => {
    const fechaNacimiento = this.usuario()?.fecha_nacimiento;
    return fechaNacimiento ? calcularEdad(fechaNacimiento) : null;
  });

  protected readonly form = this.fb.group({
    nombre: [this.usuario()?.nombre ?? '', Validators.required],
    apellido: [this.usuario()?.apellido ?? '', Validators.required],
    fechaNacimiento: [this.usuario()?.fecha_nacimiento ?? '', Validators.required],
  });

  constructor() {
    this.cargarCompras();
  }

  private async cargarCompras(): Promise<void> {
    this.misCompras.set(await this.comprasService.listarMisCompras());
  }

  async guardar(): Promise<void> {
    const usuarioActual = this.usuario();

    if (this.form.invalid || !usuarioActual) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, apellido, fechaNacimiento } = this.form.getRawValue();
    this.estado.set('guardando');

    const { error } = await this.supabaseService.client
      .from('usuarios')
      .update({ nombre, apellido, fecha_nacimiento: fechaNacimiento })
      .eq('id', usuarioActual.id);

    if (error) {
      this.estado.set('error');
      return;
    }

    await this.authService.refrescarUsuarioActual();
    this.estado.set('guardado');
  }

  async cancelar(compra: Compra): Promise<void> {
    this.cancelando.set(compra.id);

    try {
      await this.comprasService.cancelarCompra(compra.id);
      this.toastService.exito('Compra cancelada, el crédito ya está disponible en tu cuenta.');
      await Promise.all([this.cargarCompras(), this.authService.refrescarUsuarioActual()]);
    } catch (err) {
      this.toastService.error(err instanceof Error ? err.message : 'No se pudo cancelar la compra.');
    } finally {
      this.cancelando.set(null);
    }
  }

  async descargarEntrada(compra: Compra): Promise<void> {
    try {
      const entradas = await this.comprasService.listarEntradasDeCompra(compra.id);
      if (entradas.length === 0) {
        this.toastService.error('Esta compra no tiene entradas asociadas.');
        return;
      }

      const funcion = await this.funcionesService.obtenerPorId(entradas[0].funcion_id);
      if (!funcion) return;

      const [pelicula, sala, butacas] = await Promise.all([
        this.peliculasService.obtenerPorId(funcion.pelicula_id),
        this.salasService.obtenerPorId(funcion.sala_id),
        this.butacasService.obtenerPorIds(entradas.map((e) => e.butaca_id)),
      ]);

      if (!pelicula || !sala) return;

      await generarEntradaPdf({
        compraId: compra.id,
        qrCodigo: compra.id,
        peliculaNombre: pelicula.nombre,
        funcionInicio: funcion.inicio,
        salaNombre: sala.nombre,
        butacas: butacas.map((b) => ({ fila: b.fila, columna: b.columna })),
        total: compra.total,
      });
    } catch (err) {
      this.toastService.error(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    }
  }
}

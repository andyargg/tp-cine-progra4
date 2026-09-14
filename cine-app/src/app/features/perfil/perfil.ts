import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { calcularEdad } from '../../core/utils/edad.util';

type EstadoGuardado = 'inicial' | 'guardando' | 'guardado' | 'error';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly supabaseService = inject(SupabaseService);

  protected readonly usuario = this.authService.usuarioActual;
  protected readonly estado = signal<EstadoGuardado>('inicial');

  protected readonly edad = computed(() => {
    const fechaNacimiento = this.usuario()?.fecha_nacimiento;
    return fechaNacimiento ? calcularEdad(fechaNacimiento) : null;
  });

  protected readonly form = this.fb.group({
    nombre: [this.usuario()?.nombre ?? '', Validators.required],
    apellido: [this.usuario()?.apellido ?? '', Validators.required],
    fechaNacimiento: [this.usuario()?.fecha_nacimiento ?? '', Validators.required],
  });

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
}

import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SelectorFecha } from '../../../shared/selector-fecha/selector-fecha';
import { calcularEdad } from '../../../core/utils/edad.util';
import { mensajeDeError } from '../../../core/utils/error.util';

type EstadoRegistro = 'inicial' | 'enviando' | 'confirmacion_pendiente' | 'error';

function passwordsCoincidentesValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmarPassword = control.get('confirmarPassword')?.value;
  return password === confirmarPassword ? null : { passwordsNoCoinciden: true };
}

function fechaNacimientoValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string | null;
  if (!valor) return null;

  if (new Date(`${valor}T00:00:00`) > new Date()) return { fechaFutura: true };
  if (calcularEdad(valor) > 120) return { fechaInvalida: true };
  return null;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SelectorFecha],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly estado = signal<EstadoRegistro>('inicial');
  protected readonly mensajeError = signal('');

  protected readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', [Validators.required, fechaNacimientoValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: passwordsCoincidentesValidator },
  );

  protected mostrarError(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensajeError.set('Revisá los campos marcados en rojo.');
      this.estado.set('error');
      return;
    }

    const { nombre, apellido, email, fechaNacimiento, password } = this.form.getRawValue();
    this.estado.set('enviando');

    const { error } = await this.authService.registrarse(
      email!,
      password!,
      nombre!,
      apellido!,
      fechaNacimiento!,
    );

    if (error) {
      this.mensajeError.set(mensajeDeError(error, 'No se pudo crear la cuenta. Intentá de nuevo.'));
      this.estado.set('error');
      return;
    }

    this.estado.set('confirmacion_pendiente');
  }
}

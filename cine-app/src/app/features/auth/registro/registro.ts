import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type EstadoRegistro = 'inicial' | 'enviando' | 'confirmacion_pendiente' | 'error';

function passwordsCoincidentesValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmarPassword = control.get('confirmarPassword')?.value;
  return password === confirmarPassword ? null : { passwordsNoCoinciden: true };
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: passwordsCoincidentesValidator },
  );

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
      this.mensajeError.set(error.message);
      this.estado.set('error');
      return;
    }

    this.estado.set('confirmacion_pendiente');
  }
}

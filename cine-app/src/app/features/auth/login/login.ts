import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type EstadoLogin = 'inicial' | 'enviando' | 'error' | 'recuperar_enviado';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly estado = signal<EstadoLogin>('inicial');
  protected readonly mensajeError = signal('');
  protected readonly modoRecuperar = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async enviar(): Promise<void> {
    if (this.modoRecuperar()) {
      await this.enviarRecuperacion();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.estado.set('enviando');

    const { error } = await this.authService.iniciarSesion(email!, password!);

    if (error) {
      this.mensajeError.set(error.message);
      this.estado.set('error');
      return;
    }

    this.router.navigateByUrl('/');
  }

  private async enviarRecuperacion(): Promise<void> {
    const email = this.form.controls.email.value;

    if (!email) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.estado.set('enviando');
    await this.authService.recuperarContrasena(email);
    this.estado.set('recuperar_enviado');
  }

  alternarModoRecuperar(): void {
    this.modoRecuperar.set(!this.modoRecuperar());
    this.estado.set('inicial');
  }
}

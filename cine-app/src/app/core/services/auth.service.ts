import { Injectable, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Usuario } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly sesionSignal = signal<Session | null>(null);
  private readonly usuarioActualSignal = signal<Usuario | null>(null);
  private readonly cargandoSignal = signal(true);

  readonly sesion = this.sesionSignal.asReadonly();
  readonly usuarioActual = this.usuarioActualSignal.asReadonly();
  readonly cargando = this.cargandoSignal.asReadonly();

  readonly listo: Promise<void>;

  constructor() {
    this.listo = this.supabaseService.client.auth.getSession().then(({ data }) =>
      this.actualizarSesion(data.session).then(() => this.cargandoSignal.set(false)),
    );

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.actualizarSesion(session);
    });
  }

  async registrarse(
    email: string,
    password: string,
    nombre: string,
    apellido: string,
    fechaNacimiento: string,
  ) {
    return this.supabaseService.client.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellido, fecha_nacimiento: fechaNacimiento } },
    });
  }

  async iniciarSesion(email: string, password: string) {
    return this.supabaseService.client.auth.signInWithPassword({ email, password });
  }

  async cerrarSesion() {
    return this.supabaseService.client.auth.signOut();
  }

  async recuperarContrasena(email: string) {
    return this.supabaseService.client.auth.resetPasswordForEmail(email);
  }

  async refrescarUsuarioActual(): Promise<void> {
    await this.actualizarSesion(this.sesionSignal());
  }

  private async actualizarSesion(session: Session | null) {
    this.sesionSignal.set(session);

    if (!session) {
      this.usuarioActualSignal.set(null);
      return;
    }

    const { data } = await this.supabaseService.client
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single();

    this.usuarioActualSignal.set(data as Usuario | null);
  }
}

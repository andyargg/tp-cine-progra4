import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  async listarSuscripciones(): Promise<Set<string>> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return new Set();

    const { data, error } = await this.supabaseService.client
      .from('alertas_estreno')
      .select('pelicula_id')
      .eq('usuario_id', usuario.id);

    if (error || !data) return new Set();
    return new Set(data.map((a) => a.pelicula_id));
  }

  async suscribirse(peliculaId: string): Promise<void> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) throw new Error('Iniciá sesión para activar la alerta.');

    const { error } = await this.supabaseService.client
      .from('alertas_estreno')
      .insert({ usuario_id: usuario.id, pelicula_id: peliculaId });

    if (error) throw error;
  }

  async desuscribirse(peliculaId: string): Promise<void> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return;

    const { error } = await this.supabaseService.client
      .from('alertas_estreno')
      .delete()
      .eq('usuario_id', usuario.id)
      .eq('pelicula_id', peliculaId);

    if (error) throw error;
  }

  async revisarPendientes(): Promise<void> {
    await this.authService.listo;
    const usuario = this.authService.usuarioActual();
    if (!usuario) return;

    const { data, error } = await this.supabaseService.client
      .from('alertas_estreno')
      .select('pelicula_id, peliculas(nombre, funciones(publicada))')
      .eq('usuario_id', usuario.id)
      .eq('notificado', false);

    if (error || !data) return;

    const idsParaMarcar: string[] = [];

    for (const alerta of data as any[]) {
      const tieneFuncionPublicada = (alerta.peliculas?.funciones ?? []).some(
        (f: any) => f.publicada,
      );

      if (tieneFuncionPublicada) {
        this.toastService.info(`"${alerta.peliculas.nombre}" ya tiene funciones disponibles.`);
        idsParaMarcar.push(alerta.pelicula_id);
      }
    }

    if (idsParaMarcar.length === 0) return;

    await this.supabaseService.client
      .from('alertas_estreno')
      .update({ notificado: true })
      .eq('usuario_id', usuario.id)
      .in('pelicula_id', idsParaMarcar);
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { LogActividad } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async registrar(accion: string, detalle?: Record<string, unknown>): Promise<void> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return;

    await this.supabaseService.client.from('logs_actividad').insert({
      usuario_id: usuario.id,
      accion,
      detalle: detalle ?? null,
    });
  }

  async listarRecientes(limite = 100): Promise<LogActividad[]> {
    const { data, error } = await this.supabaseService.client
      .from('logs_actividad')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data ?? [];
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Canje, Recompensa } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class RecompensasService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async listarActivas(): Promise<Recompensa[]> {
    const { data, error } = await this.supabaseService.client
      .from('recompensas')
      .select('*')
      .eq('activa', true)
      .order('costo_puntos');

    if (error) throw error;
    return data ?? [];
  }

  async listarTodas(): Promise<Recompensa[]> {
    const { data, error } = await this.supabaseService.client
      .from('recompensas')
      .select('*')
      .order('costo_puntos');

    if (error) throw error;
    return data ?? [];
  }

  async crear(nombre: string, costoPuntos: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('recompensas')
      .insert({ nombre, costo_puntos: costoPuntos });

    if (error) throw error;
  }

  async cambiarActiva(id: string, activa: boolean): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('recompensas')
      .update({ activa })
      .eq('id', id);

    if (error) throw error;
  }

  async canjear(recompensaId: string): Promise<string> {
    const { data, error } = await this.supabaseService.client.rpc('canjear_recompensa', {
      p_recompensa_id: recompensaId,
    });

    if (error) throw error;
    return data as string;
  }

  async listarMisCanjes(): Promise<Canje[]> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return [];

    const { data, error } = await this.supabaseService.client
      .from('canjes')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

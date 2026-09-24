import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Resena, ResenaPromedio } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class ResenasService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async listarPorPelicula(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.supabaseService.client
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async promedioDe(peliculaId: string): Promise<ResenaPromedio | null> {
    const { data, error } = await this.supabaseService.client
      .from('vista_resenas_promedio')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async promediosDeTodas(peliculaIds: string[]): Promise<Map<string, ResenaPromedio>> {
    if (peliculaIds.length === 0) return new Map();

    const { data, error } = await this.supabaseService.client
      .from('vista_resenas_promedio')
      .select('*')
      .in('pelicula_id', peliculaIds);

    if (error) throw error;
    return new Map((data ?? []).map((r) => [r.pelicula_id, r]));
  }

  async crear(peliculaId: string, estrellas: number, comentario: string | null): Promise<void> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) throw new Error('Iniciá sesión para dejar una reseña.');

    const { error } = await this.supabaseService.client.from('resenas').insert({
      usuario_id: usuario.id,
      pelicula_id: peliculaId,
      estrellas,
      comentario,
    });

    if (error) throw error;
  }

  async miResenaDe(peliculaId: string): Promise<Resena | null> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return null;

    const { data, error } = await this.supabaseService.client
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .eq('usuario_id', usuario.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async misResenas(): Promise<Map<string, Resena>> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return new Map();

    const { data, error } = await this.supabaseService.client
      .from('resenas')
      .select('*')
      .eq('usuario_id', usuario.id);

    if (error) throw error;
    return new Map((data ?? []).map((r) => [r.pelicula_id, r]));
  }

  async puedeResenar(peliculaId: string): Promise<boolean> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return false;

    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('id, funciones!inner(pelicula_id, inicio), compras!inner(usuario_id)')
      .eq('funciones.pelicula_id', peliculaId)
      .eq('compras.usuario_id', usuario.id)
      .neq('estado', 'cancelada')
      .lt('funciones.inicio', new Date().toISOString())
      .limit(1);

    if (error) throw error;
    return (data ?? []).length > 0;
  }
}

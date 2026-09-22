import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Sala } from '../models/database.types';
import { generarButacas } from '../utils/butacas.util';

@Injectable({ providedIn: 'root' })
export class SalasService {
  private readonly supabaseService = inject(SupabaseService);

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.supabaseService.client
      .from('salas')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data;
  }

  async obtenerPorId(id: string): Promise<Sala | null> {
    const { data, error } = await this.supabaseService.client
      .from('salas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async crear(nombre: string): Promise<string> {
    const { data, error } = await this.supabaseService.client
      .from('salas')
      .insert({ nombre })
      .select('id')
      .single();

    if (error) throw error;

    const butacas = generarButacas().map((b) => ({ ...b, sala_id: data.id }));
    const { error: errorButacas } = await this.supabaseService.client
      .from('butacas')
      .insert(butacas);

    if (errorButacas) throw errorButacas;

    return data.id;
  }

  async cambiarActiva(id: string, activa: boolean): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('salas')
      .update({ activa })
      .eq('id', id);

    if (error) throw error;
  }
}

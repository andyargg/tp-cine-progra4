import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Butaca, ButacaReservadaTemp } from '../models/database.types';

const MINUTOS_RESERVA = 5;

@Injectable({ providedIn: 'root' })
export class ButacasService {
  private readonly supabaseService = inject(SupabaseService);

  async listarPorSala(salaId: string): Promise<Butaca[]> {
    const { data, error } = await this.supabaseService.client
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('columna');

    if (error) throw error;
    return data ?? [];
  }

  async obtenerPorIds(ids: string[]): Promise<Butaca[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.supabaseService.client
      .from('butacas')
      .select('*')
      .in('id', ids);

    if (error) throw error;
    return data ?? [];
  }

  async listarVendidas(funcionId: string): Promise<Set<string>> {
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('butaca_id')
      .eq('funcion_id', funcionId)
      .neq('estado', 'cancelada');

    if (error) throw error;
    return new Set((data ?? []).map((e) => e.butaca_id));
  }

  async listarReservasVigentes(funcionId: string): Promise<ButacaReservadaTemp[]> {
    const { data, error } = await this.supabaseService.client
      .from('butacas_reservadas_temp')
      .select('*')
      .eq('funcion_id', funcionId)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data ?? [];
  }

  async reservar(funcionId: string, butacaId: string, sessionId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + MINUTOS_RESERVA * 60 * 1000).toISOString();

    const { error } = await this.supabaseService.client
      .from('butacas_reservadas_temp')
      .upsert({ funcion_id: funcionId, butaca_id: butacaId, session_id: sessionId, expires_at: expiresAt });

    if (error) throw error;
  }

  async liberar(funcionId: string, butacaId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('butacas_reservadas_temp')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('butaca_id', butacaId);

    if (error) throw error;
  }

  suscribirse(funcionId: string, onCambio: () => void): RealtimeChannel {
    return this.supabaseService.client
      .channel(`butacas-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'butacas_reservadas_temp',
          filter: `funcion_id=eq.${funcionId}`,
        },
        onCambio,
      )
      .subscribe();
  }
}

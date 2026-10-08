import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Butaca, ButacaReservadaTemp } from '../models/database.types';

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
    const { data, error } = await this.supabaseService.client.rpc('butacas_vendidas', {
      p_funcion_id: funcionId,
    });

    if (error) throw error;
    return new Set((data ?? []) as string[]);
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
    const { error } = await this.supabaseService.client.rpc('reservar_butaca', {
      p_funcion_id: funcionId,
      p_butaca_id: butacaId,
      p_session_id: sessionId,
    });

    if (error) throw error;
  }

  async liberar(funcionId: string, butacaId: string, sessionId: string): Promise<void> {
    const { error } = await this.supabaseService.client.rpc('liberar_butaca', {
      p_funcion_id: funcionId,
      p_butaca_id: butacaId,
      p_session_id: sessionId,
    });

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

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cupon } from '../models/database.types';

interface CuponFormValue {
  codigo: string;
  porcentaje: number;
  edad_minima: number | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private readonly supabaseService = inject(SupabaseService);

  async listar(): Promise<Cupon[]> {
    const { data, error } = await this.supabaseService.client
      .from('cupones')
      .select('*')
      .order('codigo');

    if (error) throw error;
    return data ?? [];
  }

  async crear(valores: CuponFormValue): Promise<void> {
    const { error } = await this.supabaseService.client.from('cupones').insert(valores);
    if (error) throw error;
  }

  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('cupones')
      .update({ activo })
      .eq('id', id);

    if (error) throw error;
  }
}

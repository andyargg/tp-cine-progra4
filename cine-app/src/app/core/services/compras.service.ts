import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Compra, CompraProducto, Entrada } from '../models/database.types';

export interface ItemCandyBar {
  producto_id: string | null;
  combo_id: string | null;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  async confirmarCompra(
    funcionId: string,
    butacaIds: string[],
    usarCuponBienvenida: boolean,
    itemsCandy: ItemCandyBar[] = [],
    codigoCupon: string | null = null,
  ): Promise<string> {
    const { data, error } = await this.supabaseService.client.rpc('confirmar_compra', {
      p_funcion_id: funcionId,
      p_butaca_ids: butacaIds,
      p_usar_cupon_bienvenida: usarCuponBienvenida,
      p_items_candy: itemsCandy,
      p_codigo_cupon: codigoCupon,
    });

    if (error) throw error;
    return data as string;
  }

  async cancelarCompra(compraId: string): Promise<void> {
    const { error } = await this.supabaseService.client.rpc('cancelar_compra', {
      p_compra_id: compraId,
    });

    if (error) throw error;
  }

  async obtenerCompra(compraId: string): Promise<Compra> {
    const { data, error } = await this.supabaseService.client
      .from('compras')
      .select('*')
      .eq('id', compraId)
      .single();

    if (error) throw error;
    return data;
  }

  async listarEntradasDeCompra(compraId: string): Promise<Entrada[]> {
    const { data, error } = await this.supabaseService.client
      .from('entradas')
      .select('*')
      .eq('compra_id', compraId);

    if (error) throw error;
    return data ?? [];
  }

  async listarProductosDeCompra(compraId: string): Promise<CompraProducto[]> {
    const { data, error } = await this.supabaseService.client
      .from('compra_productos')
      .select('*')
      .eq('compra_id', compraId);

    if (error) throw error;
    return data ?? [];
  }

  async listarMisCompras(): Promise<Compra[]> {
    const usuario = this.authService.usuarioActual();
    if (!usuario) return [];

    const { data, error } = await this.supabaseService.client
      .from('compras')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

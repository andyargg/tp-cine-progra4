import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  CategoriaProducto,
  Combo,
  ComboConProductos,
  CompraProducto,
  Producto,
} from '../models/database.types';

interface ProductoFormValue {
  categoria_id: number;
  nombre: string;
  precio: number;
  imagen_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class CandyBarService {
  private readonly supabaseService = inject(SupabaseService);

  async listarCategorias(): Promise<CategoriaProducto[]> {
    const { data, error } = await this.supabaseService.client
      .from('categorias_productos')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data ?? [];
  }

  async crearCategoria(nombre: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('categorias_productos')
      .insert({ nombre });

    if (error) throw error;
  }

  async listarProductosActivos(): Promise<Producto[]> {
    const { data, error } = await this.supabaseService.client
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data ?? [];
  }

  async crearProducto(valores: ProductoFormValue): Promise<void> {
    const { error } = await this.supabaseService.client.from('productos').insert(valores);
    if (error) throw error;
  }

  async actualizarProducto(id: string, valores: ProductoFormValue): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('productos')
      .update(valores)
      .eq('id', id);

    if (error) throw error;
  }

  async listarCombosActivos(): Promise<ComboConProductos[]> {
    const { data, error } = await this.supabaseService.client
      .from('combos')
      .select('*, combos_productos(cantidad, productos(*))')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return (data ?? []).map(mapearCombo);
  }

  async crearCombo(nombre: string, precio: number, productoIds: string[]): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('combos')
      .insert({ nombre, precio })
      .select('id')
      .single();

    if (error) throw error;
    await this.reemplazarProductosDeCombo(data.id, productoIds);
  }

  private async reemplazarProductosDeCombo(comboId: string, productoIds: string[]): Promise<void> {
    await this.supabaseService.client.from('combos_productos').delete().eq('combo_id', comboId);

    if (productoIds.length === 0) return;

    const filas = productoIds.map((productoId) => ({
      combo_id: comboId,
      producto_id: productoId,
      cantidad: 1,
    }));

    const { error } = await this.supabaseService.client.from('combos_productos').insert(filas);
    if (error) throw error;
  }

  async nombrarItemsDeCompra(
    items: CompraProducto[],
  ): Promise<{ nombre: string; cantidad: number }[]> {
    const productoIds = items.filter((i) => i.producto_id).map((i) => i.producto_id!);
    const comboIds = items.filter((i) => i.combo_id).map((i) => i.combo_id!);

    const [productos, combos] = await Promise.all([
      productoIds.length > 0
        ? this.supabaseService.client.from('productos').select('id, nombre').in('id', productoIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
      comboIds.length > 0
        ? this.supabaseService.client.from('combos').select('id, nombre').in('id', comboIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    ]);

    const nombresProductos = new Map((productos.data ?? []).map((p) => [p.id, p.nombre]));
    const nombresCombos = new Map((combos.data ?? []).map((c) => [c.id, c.nombre]));

    return items.map((item) => ({
      nombre:
        (item.producto_id && nombresProductos.get(item.producto_id)) ||
        (item.combo_id && nombresCombos.get(item.combo_id)) ||
        'Ítem',
      cantidad: item.cantidad,
    }));
  }
}

function mapearCombo(fila: any): ComboConProductos {
  const productos = (fila.combos_productos ?? [])
    .filter((cp: any) => cp.productos !== null)
    .map((cp: any) => ({ producto: cp.productos as Producto, cantidad: cp.cantidad }));

  const { combos_productos, ...combo } = fila;
  return { ...combo, productos };
}

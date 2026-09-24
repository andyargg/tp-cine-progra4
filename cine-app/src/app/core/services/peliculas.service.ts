import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Genero, Pelicula, PeliculaConGeneros } from '../models/database.types';

interface PeliculaFormValue {
  nombre: string;
  imagen_url: string | null;
  sinopsis: string | null;
  duracion_minutos: number;
  formato: Pelicula['formato'];
  idioma: string;
  restriccion_edad: number;
  estreno_fecha: string | null;
}

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private readonly supabaseService = inject(SupabaseService);

  async listarGeneros(): Promise<Genero[]> {
    const { data, error } = await this.supabaseService.client
      .from('generos')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data;
  }

  async listarActivas(): Promise<PeliculaConGeneros[]> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .select('*, peliculas_generos(generos(id, nombre))')
      .eq('activa', true)
      .order('nombre');

    if (error) throw error;
    return (data ?? []).map(mapearPeliculaConGeneros);
  }

  async listarProximamente(): Promise<PeliculaConGeneros[]> {
    const hoy = new Date().toISOString().slice(0, 10);

    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .select('*, peliculas_generos(generos(id, nombre))')
      .eq('activa', true)
      .gt('estreno_fecha', hoy)
      .order('estreno_fecha');

    if (error) throw error;
    return (data ?? []).map(mapearPeliculaConGeneros);
  }

  async listarMasVendidas(limite = 3): Promise<PeliculaConGeneros[]> {
    const { data: ventas, error } = await this.supabaseService.client
      .from('vista_ventas_por_pelicula')
      .select('*')
      .gt('entradas_vendidas', 0)
      .order('entradas_vendidas', { ascending: false })
      .limit(limite);

    if (error) throw error;
    if (!ventas || ventas.length === 0) return [];

    const ids = ventas.map((v) => v.pelicula_id);

    const { data, error: errorPeliculas } = await this.supabaseService.client
      .from('peliculas')
      .select('*, peliculas_generos(generos(id, nombre))')
      .in('id', ids)
      .eq('activa', true);

    if (errorPeliculas) throw errorPeliculas;
    if (!data) return [];

    const mapa = new Map(data.map((p) => [p.id, mapearPeliculaConGeneros(p)]));
    return ids.map((id) => mapa.get(id)).filter((p): p is PeliculaConGeneros => !!p);
  }

  async obtenerPorId(id: string): Promise<PeliculaConGeneros | null> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .select('*, peliculas_generos(generos(id, nombre))')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapearPeliculaConGeneros(data);
  }

  async crear(valores: PeliculaFormValue, generoIds: number[]): Promise<string> {
    const { data, error } = await this.supabaseService.client
      .from('peliculas')
      .insert(valores)
      .select('id')
      .single();

    if (error) throw error;

    await this.reemplazarGeneros(data.id, generoIds);
    return data.id;
  }

  async actualizar(id: string, valores: PeliculaFormValue, generoIds: number[]): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('peliculas')
      .update(valores)
      .eq('id', id);

    if (error) throw error;

    await this.reemplazarGeneros(id, generoIds);
  }

  private async reemplazarGeneros(peliculaId: string, generoIds: number[]): Promise<void> {
    await this.supabaseService.client
      .from('peliculas_generos')
      .delete()
      .eq('pelicula_id', peliculaId);

    if (generoIds.length === 0) return;

    const filas = generoIds.map((generoId) => ({ pelicula_id: peliculaId, genero_id: generoId }));
    const { error } = await this.supabaseService.client.from('peliculas_generos').insert(filas);

    if (error) throw error;
  }
}

function mapearPeliculaConGeneros(fila: any): PeliculaConGeneros {
  const generos = (fila.peliculas_generos ?? [])
    .map((pg: any) => pg.generos)
    .filter((g: Genero | null): g is Genero => g !== null);

  const { peliculas_generos, ...pelicula } = fila;
  return { ...pelicula, generos };
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LogsService } from './logs.service';
import { Funcion } from '../models/database.types';
import { generarFechas, hayConflicto } from '../utils/funciones.util';

interface CrearLoteInput {
  peliculaId: string;
  diasSemana: number[];
  hora: string;
  desde: string;
  hasta: string;
  precioBase: number;
}

interface ResultadoLote {
  creadas: number;
  fallidas: string[];
}

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly logsService = inject(LogsService);

  async listarFuturasPorPeliculas(peliculaIds: string[]): Promise<Funcion[]> {
    if (peliculaIds.length === 0) return [];

    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*')
      .in('pelicula_id', peliculaIds)
      .eq('publicada', true)
      .gt('inicio', new Date().toISOString())
      .order('inicio');

    if (error) throw error;
    return data ?? [];
  }

  async obtenerPorId(id: string): Promise<Funcion | null> {
    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async listarProximas(): Promise<Funcion[]> {
    const { data, error } = await this.supabaseService.client
      .from('funciones')
      .select('*')
      .gt('inicio', new Date().toISOString())
      .order('inicio')
      .limit(100);

    if (error) throw error;
    return data ?? [];
  }

  async crearLote(input: CrearLoteInput): Promise<ResultadoLote> {
    const { data: pelicula, error: errorPelicula } = await this.supabaseService.client
      .from('peliculas')
      .select('duracion_minutos')
      .eq('id', input.peliculaId)
      .single();

    if (errorPelicula || !pelicula) throw new Error('No se encontró la película.');

    const bufferMinutos = await this.obtenerBufferMinutos();

    const { data: salas, error: errorSalas } = await this.supabaseService.client
      .from('salas')
      .select('id')
      .eq('activa', true);

    if (errorSalas) throw errorSalas;
    if (!salas || salas.length === 0) throw new Error('No hay salas activas.');

    const desdeIso = new Date(`${input.desde}T00:00:00`).toISOString();
    const hastaIso = new Date(`${input.hasta}T23:59:59`).toISOString();

    const { data: funcionesExistentes, error: errorFunciones } = await this.supabaseService.client
      .from('funciones')
      .select('sala_id, inicio, fin')
      .gte('inicio', desdeIso)
      .lte('inicio', hastaIso);

    if (errorFunciones) throw errorFunciones;

    const ocupacionPorSala = new Map<string, { inicio: Date; fin: Date }[]>();
    for (const sala of salas) ocupacionPorSala.set(sala.id, []);

    for (const funcion of funcionesExistentes ?? []) {
      const lista = ocupacionPorSala.get(funcion.sala_id);
      if (lista) lista.push({ inicio: new Date(funcion.inicio), fin: new Date(funcion.fin) });
    }

    const fechas = generarFechas(input.diasSemana, input.desde, input.hasta);
    const [horas, minutos] = input.hora.split(':').map(Number);

    const nuevasFunciones: {
      pelicula_id: string;
      sala_id: string;
      inicio: string;
      fin: string;
      precio_base: number;
      publicada: boolean;
    }[] = [];
    const fallidas: string[] = [];

    for (const fecha of fechas) {
      const inicio = new Date(fecha);
      inicio.setHours(horas, minutos, 0, 0);
      const fin = new Date(inicio.getTime() + pelicula.duracion_minutos * 60 * 1000);

      let salaAsignada: string | null = null;

      for (const sala of salas) {
        const ocupacion = ocupacionPorSala.get(sala.id) ?? [];
        if (!hayConflicto({ inicio, fin }, ocupacion, bufferMinutos)) {
          salaAsignada = sala.id;
          break;
        }
      }

      if (!salaAsignada) {
        fallidas.push(inicio.toLocaleString('es-AR'));
        continue;
      }

      ocupacionPorSala.get(salaAsignada)!.push({ inicio, fin });
      nuevasFunciones.push({
        pelicula_id: input.peliculaId,
        sala_id: salaAsignada,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        precio_base: input.precioBase,
        publicada: true,
      });
    }

    if (nuevasFunciones.length > 0) {
      const { error } = await this.supabaseService.client.from('funciones').insert(nuevasFunciones);
      if (error) throw error;

      await this.logsService.registrar('funciones_creadas', {
        peliculaId: input.peliculaId,
        cantidad: nuevasFunciones.length,
      });
    }

    return { creadas: nuevasFunciones.length, fallidas };
  }

  private async obtenerBufferMinutos(): Promise<number> {
    const { data, error } = await this.supabaseService.client
      .from('configuracion')
      .select('valor')
      .eq('clave', 'buffer_minutos_entre_funciones')
      .single();

    if (error) throw error;
    return Number(data.valor);
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CandyMasVendido, FacturacionDiaria, PeliculaMasVista } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly supabaseService = inject(SupabaseService);

  async facturacionDiaria(): Promise<FacturacionDiaria[]> {
    const { data, error } = await this.supabaseService.client.rpc('reporte_facturacion_diaria');
    if (error) throw error;
    return data ?? [];
  }

  async peliculasMasVistas(desde: Date): Promise<PeliculaMasVista[]> {
    const { data, error } = await this.supabaseService.client.rpc('reporte_peliculas_mas_vistas', {
      p_desde: desde.toISOString(),
    });

    if (error) throw error;
    return data ?? [];
  }

  async candyMasVendido(desde: Date): Promise<CandyMasVendido[]> {
    const { data, error } = await this.supabaseService.client.rpc('reporte_candy_mas_vendido', {
      p_desde: desde.toISOString(),
    });

    if (error) throw error;
    return data ?? [];
  }
}

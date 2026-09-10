import { Component, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Configuracion } from '../../core/models/database.types';

type EstadoConexion = 'cargando' | 'ok' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly estado = signal<EstadoConexion>('cargando');
  protected readonly configuracion = signal<Configuracion[]>([]);

  constructor(private readonly supabase: SupabaseService) {
    this.verificarConexion();
  }

  private async verificarConexion(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('configuracion')
      .select('*');

    if (error) {
      this.estado.set('error');
      return;
    }

    this.configuracion.set(data ?? []);
    this.estado.set('ok');
  }
}

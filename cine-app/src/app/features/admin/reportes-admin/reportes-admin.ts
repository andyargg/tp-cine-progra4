import { Component, effect, inject, signal, viewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import Chart from 'chart.js/auto';
import { ReportesService } from '../../../core/services/reportes.service';
import { LogsService } from '../../../core/services/logs.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { CandyBarService } from '../../../core/services/candy-bar.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { exportarCsv, exportarTablaPdf } from '../../../core/utils/exportar.util';
import { FacturacionDiaria, LogActividad } from '../../../core/models/database.types';

type Periodo = 'semana' | 'mes';

interface ItemNombrado {
  nombre: string;
  valor: number;
}

@Component({
  selector: 'app-reportes-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './reportes-admin.html',
  styleUrl: './reportes-admin.scss',
})
export class ReportesAdmin {
  private readonly reportesService = inject(ReportesService);
  private readonly logsService = inject(LogsService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly candyBarService = inject(CandyBarService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly toastService = inject(ToastService);

  private readonly canvasPeliculas = viewChild<ElementRef<HTMLCanvasElement>>('chartPeliculas');
  private readonly canvasCandy = viewChild<ElementRef<HTMLCanvasElement>>('chartCandy');

  private chartPeliculas: Chart | null = null;
  private chartCandy: Chart | null = null;

  protected readonly cargando = signal(true);
  protected readonly periodo = signal<Periodo>('semana');
  protected readonly facturacion = signal<FacturacionDiaria[]>([]);
  protected readonly logs = signal<LogActividad[]>([]);
  protected readonly peliculasMasVistas = signal<ItemNombrado[]>([]);
  protected readonly candyMasVendido = signal<ItemNombrado[]>([]);

  constructor() {
    this.cargar();

    effect(() => {
      this.dibujarGrafico(this.canvasPeliculas(), this.chartPeliculas, this.peliculasMasVistas(), (c) => (this.chartPeliculas = c));
    });

    effect(() => {
      this.dibujarGrafico(this.canvasCandy(), this.chartCandy, this.candyMasVendido(), (c) => (this.chartCandy = c));
    });
  }

  protected cambiarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.cargarGraficos();
  }

  protected exportarFacturacionCsv(): void {
    exportarCsv(
      'facturacion.csv',
      this.facturacion().map((f) => ({
        dia: f.dia,
        total_facturado: f.total_facturado,
        entradas_vendidas: f.entradas_vendidas,
      })),
    );
  }

  protected exportarFacturacionPdf(): void {
    exportarTablaPdf(
      'Facturación diaria',
      ['Día', 'Total facturado', 'Entradas vendidas'],
      this.facturacion().map((f) => [f.dia, `$${f.total_facturado}`, f.entradas_vendidas]),
      'facturacion.pdf',
    );
  }

  private async cargar(): Promise<void> {
    try {
      const [facturacion, logs] = await Promise.all([
        this.reportesService.facturacionDiaria(),
        this.logsService.listarRecientes(50),
      ]);

      this.facturacion.set(facturacion);
      this.logs.set(logs);

      await this.cargarGraficos();
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudieron cargar los reportes.'));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarGraficos(): Promise<void> {
    const dias = this.periodo() === 'semana' ? 7 : 30;
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    try {
      const [masVistas, masVendido] = await Promise.all([
        this.reportesService.peliculasMasVistas(desde),
        this.reportesService.candyMasVendido(desde),
      ]);

      const idsPeliculas = masVistas.map((v) => v.pelicula_id);
      const { data: peliculas } = await this.supabaseService.client
        .from('peliculas')
        .select('id, nombre')
        .in('id', idsPeliculas.length > 0 ? idsPeliculas : ['00000000-0000-0000-0000-000000000000']);

      const nombresPeliculas = new Map((peliculas ?? []).map((p) => [p.id, p.nombre]));
      this.peliculasMasVistas.set(
        masVistas.map((v) => ({
          nombre: nombresPeliculas.get(v.pelicula_id) ?? 'Película',
          valor: Number(v.entradas),
        })),
      );

      const nombresCandy = await this.candyBarService.nombrarItemsDeCompra(
        masVendido.map((c) => ({
          producto_id: c.producto_id,
          combo_id: c.combo_id,
          cantidad: Number(c.cantidad),
        })),
      );
      this.candyMasVendido.set(nombresCandy.map((c) => ({ nombre: c.nombre, valor: c.cantidad })));
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudieron cargar los gráficos.'));
    }
  }

  private dibujarGrafico(
    ref: ElementRef<HTMLCanvasElement> | undefined,
    chartActual: Chart | null,
    items: ItemNombrado[],
    guardar: (chart: Chart) => void,
  ): void {
    if (!ref) return;

    chartActual?.destroy();

    const chart = new Chart(ref.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.nombre),
        datasets: [{ data: items.map((i) => i.valor), backgroundColor: '#ef8354' }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    guardar(chart);
  }
}

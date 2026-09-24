import {
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import QrScanner from 'qr-scanner';
import { ComprasService } from '../../../core/services/compras.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ButacasService } from '../../../core/services/butacas.service';
import { CandyBarService } from '../../../core/services/candy-bar.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import { Compra, EstadoEntrada } from '../../../core/models/database.types';

interface EntradaResumen {
  id: string;
  fila: string;
  columna: number;
  peliculaNombre: string;
  funcionInicio: string;
  estado: EstadoEntrada;
}

interface ProductoResumen {
  nombre: string;
  cantidad: number;
  retirado: boolean;
}

interface ResumenCompra {
  compra: Compra;
  entradas: EntradaResumen[];
  productos: ProductoResumen[];
}

@Component({
  selector: 'app-validar-qr',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './validar-qr.html',
  styleUrl: './validar-qr.scss',
})
export class ValidarQr implements AfterViewInit, OnDestroy {
  private readonly comprasService = inject(ComprasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly butacasService = inject(ButacasService);
  private readonly candyBarService = inject(CandyBarService);
  private readonly toastService = inject(ToastService);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private scanner: QrScanner | null = null;

  protected readonly camaraDisponible = signal(true);
  protected readonly codigoManual = signal('');
  protected readonly buscando = signal(false);
  protected readonly resumen = signal<ResumenCompra | null>(null);
  protected readonly validando = signal(false);

  ngAfterViewInit(): void {
    this.scanner = new QrScanner(
      this.video().nativeElement,
      (resultado) => this.buscarPorCodigo(resultado.data),
      { highlightScanRegion: true, highlightCodeOutline: true },
    );

    this.scanner.start().catch(() => {
      this.camaraDisponible.set(false);
    });
  }

  ngOnDestroy(): void {
    this.scanner?.stop();
    this.scanner?.destroy();
  }

  protected buscarManual(): void {
    const codigo = this.codigoManual().trim();
    if (!codigo) return;
    this.buscarPorCodigo(codigo);
  }

  protected limpiar(): void {
    this.resumen.set(null);
    this.codigoManual.set('');
    this.scanner?.start().catch(() => {});
  }

  private async buscarPorCodigo(compraId: string): Promise<void> {
    this.buscando.set(true);
    this.scanner?.stop();

    try {
      const compra = await this.comprasService.obtenerCompra(compraId);
      const [entradas, productos] = await Promise.all([
        this.comprasService.listarEntradasDeCompra(compraId),
        this.comprasService.listarProductosDeCompra(compraId),
      ]);

      let entradasResumen: EntradaResumen[] = [];

      if (entradas.length > 0) {
        const funcion = await this.funcionesService.obtenerPorId(entradas[0].funcion_id);
        const pelicula = funcion ? await this.peliculasService.obtenerPorId(funcion.pelicula_id) : null;
        const butacas = await this.butacasService.obtenerPorIds(entradas.map((e) => e.butaca_id));
        const butacasPorId = new Map(butacas.map((b) => [b.id, b]));

        entradasResumen = entradas.map((e) => {
          const butaca = butacasPorId.get(e.butaca_id);
          return {
            id: e.id,
            fila: butaca?.fila ?? '?',
            columna: butaca?.columna ?? 0,
            peliculaNombre: pelicula?.nombre ?? '',
            funcionInicio: funcion?.inicio ?? '',
            estado: e.estado,
          };
        });
      }

      const nombresCandy = await this.candyBarService.nombrarItemsDeCompra(productos);
      const productosResumen: ProductoResumen[] = productos.map((p, i) => ({
        nombre: nombresCandy[i]?.nombre ?? 'Ítem',
        cantidad: p.cantidad,
        retirado: p.retirado,
      }));

      this.resumen.set({ compra, entradas: entradasResumen, productos: productosResumen });
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se encontró ninguna compra con ese código.'));
      this.scanner?.start().catch(() => {});
    } finally {
      this.buscando.set(false);
    }
  }

  async validarEntradas(): Promise<void> {
    const resumen = this.resumen();
    if (!resumen) return;

    this.validando.set(true);

    try {
      const cantidad = await this.comprasService.validarEntradas(resumen.compra.id);
      this.toastService.exito(`${cantidad} entrada(s) validada(s).`);
      await this.buscarPorCodigo(resumen.compra.id);
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo validar.'));
    } finally {
      this.validando.set(false);
    }
  }

  async validarCandy(): Promise<void> {
    const resumen = this.resumen();
    if (!resumen) return;

    this.validando.set(true);

    try {
      const cantidad = await this.comprasService.validarCandy(resumen.compra.id);
      this.toastService.exito(`${cantidad} producto(s) entregado(s).`);
      await this.buscarPorCodigo(resumen.compra.id);
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo validar.'));
    } finally {
      this.validando.set(false);
    }
  }
}

import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ButacasService } from '../../../core/services/butacas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { SalasService } from '../../../core/services/salas.service';
import { ComprasService } from '../../../core/services/compras.service';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { calcularPrecioVigente } from '../../../core/utils/funciones.util';
import { generarEntradaPdf } from '../../../core/utils/entrada-pdf.util';
import { mensajeDeError } from '../../../core/utils/error.util';
import { Butaca, Funcion, PeliculaConGeneros, Sala } from '../../../core/models/database.types';

interface CompraConfirmada {
  compraId: string;
  total: number;
  butacas: { fila: string; columna: number }[];
}

@Component({
  selector: 'app-seleccion-butacas',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './seleccion-butacas.html',
  styleUrl: './seleccion-butacas.scss',
})
export class SeleccionButacas implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly butacasService = inject(ButacasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly salasService = inject(SalasService);
  private readonly comprasService = inject(ComprasService);
  private readonly toastService = inject(ToastService);
  private readonly supabaseService = inject(SupabaseService);
  protected readonly authService = inject(AuthService);

  private readonly funcionId = this.route.snapshot.paramMap.get('funcionId')!;
  private readonly sessionId = crypto.randomUUID();
  private canal: RealtimeChannel | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  protected readonly cargando = signal(true);
  protected readonly funcion = signal<Funcion | null>(null);
  protected readonly pelicula = signal<PeliculaConGeneros | null>(null);
  protected readonly sala = signal<Sala | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  protected readonly vendidas = signal<Set<string>>(new Set());
  protected readonly reservasAjenas = signal<Map<string, string>>(new Map());
  protected readonly seleccionadas = signal<Set<string>>(new Set());
  protected readonly usarCuponBienvenida = signal(false);
  protected readonly confirmoVip = signal(false);
  protected readonly procesando = signal(false);
  protected readonly compraConfirmada = signal<CompraConfirmada | null>(null);
  protected readonly precioUnitario = signal(0);
  protected readonly porcentajeCupon = signal(0);

  protected readonly filas = computed(() => {
    const porFila = new Map<string, Butaca[]>();
    for (const butaca of this.butacas()) {
      const lista = porFila.get(butaca.fila) ?? [];
      lista.push(butaca);
      porFila.set(butaca.fila, lista);
    }
    return [...porFila.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  protected readonly butacasSeleccionadas = computed(() =>
    this.butacas().filter((b) => this.seleccionadas().has(b.id)),
  );

  protected readonly hayVipSeleccionada = computed(() =>
    this.butacasSeleccionadas().some((b) => b.tipo === 'vip'),
  );

  protected readonly puedeUsarCupon = computed(() => {
    const usuario = this.authService.usuarioActual();
    return !!usuario && !usuario.cupon_bienvenida_usado;
  });

  protected readonly subtotal = computed(() => this.precioUnitario() * this.seleccionadas().size);

  protected readonly totalEstimado = computed(() => {
    const sub = this.subtotal();
    if (this.usarCuponBienvenida() && this.puedeUsarCupon()) {
      return Math.round((sub - (sub * this.porcentajeCupon()) / 100) * 100) / 100;
    }
    return sub;
  });

  protected readonly puedeConfirmar = computed(
    () => this.seleccionadas().size > 0 && (!this.hayVipSeleccionada() || this.confirmoVip()),
  );

  constructor() {
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.canal) this.supabaseService.client.removeChannel(this.canal);
    if (this.intervalo) clearInterval(this.intervalo);

    for (const butacaId of this.seleccionadas()) {
      this.butacasService.liberar(this.funcionId, butacaId);
    }
  }

  protected estadoDe(butaca: Butaca): string {
    if (this.vendidas().has(butaca.id)) return 'vendida';
    if (this.seleccionadas().has(butaca.id)) return 'seleccionada';
    if (this.reservasAjenas().has(butaca.id)) return 'ocupada';
    return butaca.tipo;
  }

  protected async toggleButaca(butaca: Butaca): Promise<void> {
    if (this.vendidas().has(butaca.id) || this.reservasAjenas().has(butaca.id)) return;

    const actuales = new Set(this.seleccionadas());

    try {
      if (actuales.has(butaca.id)) {
        actuales.delete(butaca.id);
        this.seleccionadas.set(actuales);
        await this.butacasService.liberar(this.funcionId, butaca.id);
      } else {
        actuales.add(butaca.id);
        this.seleccionadas.set(actuales);
        await this.butacasService.reservar(this.funcionId, butaca.id, this.sessionId);
      }
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo actualizar la butaca.'));
    }
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar()) return;

    this.procesando.set(true);
    const butacasElegidas = this.butacasSeleccionadas();

    try {
      const compraId = await this.comprasService.confirmarCompra(
        this.funcionId,
        butacasElegidas.map((b) => b.id),
        this.usarCuponBienvenida() && this.puedeUsarCupon(),
      );

      const compra = await this.comprasService.obtenerCompra(compraId);

      this.compraConfirmada.set({
        compraId,
        total: compra.total,
        butacas: butacasElegidas.map((b) => ({ fila: b.fila, columna: b.columna })),
      });

      await this.descargarPdf();
      this.toastService.exito('¡Compra confirmada! Descargamos tu entrada en PDF.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo confirmar la compra.'));
    } finally {
      this.procesando.set(false);
    }
  }

  async descargarPdf(): Promise<void> {
    const compra = this.compraConfirmada();
    const pelicula = this.pelicula();
    const funcion = this.funcion();
    const sala = this.sala();

    if (!compra || !pelicula || !funcion || !sala) return;

    await generarEntradaPdf({
      compraId: compra.compraId,
      qrCodigo: compra.compraId,
      peliculaNombre: pelicula.nombre,
      funcionInicio: funcion.inicio,
      salaNombre: sala.nombre,
      butacas: compra.butacas,
      total: compra.total,
    });
  }

  private async cargar(): Promise<void> {
    const funcion = await this.funcionesService.obtenerPorId(this.funcionId);

    if (!funcion) {
      this.toastService.error('No se encontró la función.');
      this.router.navigateByUrl('/peliculas');
      return;
    }

    this.funcion.set(funcion);

    const [pelicula, sala] = await Promise.all([
      this.peliculasService.obtenerPorId(funcion.pelicula_id),
      this.salasService.obtenerPorId(funcion.sala_id),
    ]);

    this.pelicula.set(pelicula);
    this.sala.set(sala);

    if (pelicula) {
      this.precioUnitario.set(
        calcularPrecioVigente(
          funcion.precio_base,
          pelicula.preventa_apertura,
          pelicula.preventa_precio,
          pelicula.estreno_fecha,
          new Date(),
        ),
      );

      if (pelicula.restriccion_edad > 0) {
        this.toastService.info(
          `Esta función es +${pelicula.restriccion_edad}. Los menores deben ir acompañados de un adulto.`,
        );
      }
    }

    if (sala) {
      this.butacas.set(await this.butacasService.listarPorSala(sala.id));
    }

    await this.cargarBufferConfig();
    await this.actualizarEstadoOcupacion();

    this.canal = this.butacasService.suscribirse(this.funcionId, () => {
      this.actualizarEstadoOcupacion();
    });

    this.intervalo = setInterval(() => this.actualizarEstadoOcupacion(), 30000);

    this.cargando.set(false);
  }

  private async cargarBufferConfig(): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('configuracion')
      .select('valor')
      .eq('clave', 'cupon_bienvenida_porcentaje')
      .single();

    if (data) this.porcentajeCupon.set(Number(data.valor));
  }

  private async actualizarEstadoOcupacion(): Promise<void> {
    const [vendidas, reservas] = await Promise.all([
      this.butacasService.listarVendidas(this.funcionId),
      this.butacasService.listarReservasVigentes(this.funcionId),
    ]);

    this.vendidas.set(vendidas);

    const ajenas = new Map<string, string>();
    for (const reserva of reservas) {
      if (reserva.session_id !== this.sessionId) {
        ajenas.set(reserva.butaca_id, reserva.session_id);
      }
    }
    this.reservasAjenas.set(ajenas);
  }
}

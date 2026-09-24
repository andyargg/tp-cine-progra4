import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { CandyBarService } from '../../../core/services/candy-bar.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/error.util';
import {
  CategoriaProducto,
  ComboConProductos,
  Producto,
} from '../../../core/models/database.types';

@Component({
  selector: 'app-candy-bar-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './candy-bar-admin.html',
  styleUrl: './candy-bar-admin.scss',
})
export class CandyBarAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly candyBarService = inject(CandyBarService);
  private readonly toastService = inject(ToastService);

  protected readonly categorias = signal<CategoriaProducto[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly combos = signal<ComboConProductos[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardandoCategoria = signal(false);
  protected readonly guardandoProducto = signal(false);
  protected readonly guardandoCombo = signal(false);
  protected readonly editandoProductoId = signal<string | null>(null);

  protected readonly formCategoria = this.fb.group({
    nombre: ['', Validators.required],
  });

  protected readonly formProducto = this.fb.group({
    categoria_id: [null as number | null, Validators.required],
    nombre: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    imagen_url: [''],
  });

  protected readonly formCombo = this.fb.group({
    nombre: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    productos: this.fb.array<FormControl<boolean>>([]),
  });

  protected get productosArray() {
    return this.formCombo.controls.productos;
  }

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [categorias, productos, combos] = await Promise.all([
        this.candyBarService.listarCategorias(),
        this.candyBarService.listarProductosActivos(),
        this.candyBarService.listarCombosActivos(),
      ]);

      this.categorias.set(categorias);
      this.productos.set(productos);
      this.combos.set(combos);

      this.productosArray.clear();
      productos.forEach(() =>
        this.productosArray.push(this.fb.control(false, { nonNullable: true })),
      );
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo cargar el candy bar.'));
    } finally {
      this.cargando.set(false);
    }
  }

  async crearCategoria(): Promise<void> {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }

    this.guardandoCategoria.set(true);
    const { nombre } = this.formCategoria.getRawValue();

    try {
      await this.candyBarService.crearCategoria(nombre!);
      this.formCategoria.reset();
      await this.cargar();
      this.toastService.exito('Categoría creada.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo crear la categoría.'));
    } finally {
      this.guardandoCategoria.set(false);
    }
  }

  editarProducto(producto: Producto): void {
    this.editandoProductoId.set(producto.id);
    this.formProducto.setValue({
      categoria_id: producto.categoria_id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen_url: producto.imagen_url ?? '',
    });
  }

  cancelarEdicionProducto(): void {
    this.editandoProductoId.set(null);
    this.formProducto.reset({ categoria_id: null, nombre: '', precio: 0, imagen_url: '' });
  }

  async guardarProducto(): Promise<void> {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }

    this.guardandoProducto.set(true);
    const valores = this.formProducto.getRawValue();
    const datos = {
      categoria_id: valores.categoria_id!,
      nombre: valores.nombre!,
      precio: valores.precio!,
      imagen_url: valores.imagen_url || null,
    };

    try {
      const id = this.editandoProductoId();
      if (id) {
        await this.candyBarService.actualizarProducto(id, datos);
      } else {
        await this.candyBarService.crearProducto(datos);
      }

      this.cancelarEdicionProducto();
      await this.cargar();
      this.toastService.exito('Producto guardado.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo guardar el producto.'));
    } finally {
      this.guardandoProducto.set(false);
    }
  }

  async crearCombo(): Promise<void> {
    const productoIds = this.productosArray.value
      .map((marcado, i) => (marcado ? this.productos()[i].id : null))
      .filter((v): v is string => v !== null);

    if (this.formCombo.invalid || productoIds.length === 0) {
      this.formCombo.markAllAsTouched();
      this.toastService.error('Completá el combo y elegí al menos un producto.');
      return;
    }

    this.guardandoCombo.set(true);
    const valores = this.formCombo.getRawValue();

    try {
      await this.candyBarService.crearCombo(valores.nombre!, valores.precio!, productoIds);
      this.formCombo.reset({ nombre: '', precio: 0 });
      this.productosArray.controls.forEach((c) => c.setValue(false));
      await this.cargar();
      this.toastService.exito('Combo creado.');
    } catch (err) {
      this.toastService.error(mensajeDeError(err, 'No se pudo crear el combo.'));
    } finally {
      this.guardandoCombo.set(false);
    }
  }
}

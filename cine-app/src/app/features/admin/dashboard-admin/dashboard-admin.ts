import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AccesoRapido {
  ruta: string;
  titulo: string;
  descripcion: string;
}

const ACCESOS: AccesoRapido[] = [
  { ruta: '/admin/peliculas', titulo: 'Películas', descripcion: 'Catálogo, géneros y ficha' },
  { ruta: '/admin/salas', titulo: 'Salas', descripcion: 'Alta y activación de salas' },
  { ruta: '/admin/funciones', titulo: 'Funciones', descripcion: 'Horarios y asignación automática' },
  { ruta: '/admin/candy-bar', titulo: 'Candy bar', descripcion: 'Categorías, productos y combos' },
  { ruta: '/admin/fidelizacion', titulo: 'Cupones y puntos', descripcion: 'Cupones y recompensas' },
  { ruta: '/admin/reportes', titulo: 'Reportes', descripcion: 'Facturación, gráficos y auditoría' },
];

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss',
})
export class DashboardAdmin {
  protected readonly accesos = ACCESOS;
}

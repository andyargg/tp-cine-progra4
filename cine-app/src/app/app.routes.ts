import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'peliculas',
    loadComponent: () => import('./features/peliculas/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    path: 'peliculas/:id',
    loadComponent: () =>
      import('./features/peliculas/pelicula-detalle/pelicula-detalle').then(
        (m) => m.PeliculaDetalle,
      ),
  },
  {
    path: 'mis-peliculas',
    loadComponent: () =>
      import('./features/peliculas/mis-peliculas/mis-peliculas').then((m) => m.MisPeliculas),
    canActivate: [authGuard],
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'funciones/:funcionId/butacas',
    loadComponent: () =>
      import('./features/compra/seleccion-butacas/seleccion-butacas').then(
        (m) => m.SeleccionButacas,
      ),
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/dashboard-admin/dashboard-admin').then((m) => m.DashboardAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/peliculas',
    loadComponent: () =>
      import('./features/admin/peliculas-admin/peliculas-admin').then((m) => m.PeliculasAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/peliculas/nueva',
    loadComponent: () =>
      import('./features/admin/pelicula-form/pelicula-form').then((m) => m.PeliculaForm),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/peliculas/:id/editar',
    loadComponent: () =>
      import('./features/admin/pelicula-form/pelicula-form').then((m) => m.PeliculaForm),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/salas',
    loadComponent: () =>
      import('./features/admin/salas-admin/salas-admin').then((m) => m.SalasAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/funciones',
    loadComponent: () =>
      import('./features/admin/funciones-admin/funciones-admin').then((m) => m.FuncionesAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/candy-bar',
    loadComponent: () =>
      import('./features/admin/candy-bar-admin/candy-bar-admin').then((m) => m.CandyBarAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/fidelizacion',
    loadComponent: () =>
      import('./features/admin/fidelizacion-admin/fidelizacion-admin').then(
        (m) => m.FidelizacionAdmin,
      ),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'admin/reportes',
    loadComponent: () =>
      import('./features/admin/reportes-admin/reportes-admin').then((m) => m.ReportesAdmin),
    canActivate: [rolGuard(['admin'])],
  },
  {
    path: 'empleado/validar',
    loadComponent: () =>
      import('./features/empleado/validar-qr/validar-qr').then((m) => m.ValidarQr),
    canActivate: [rolGuard(['empleado', 'admin'])],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

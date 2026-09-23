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
    path: '**',
    redirectTo: '',
  },
];

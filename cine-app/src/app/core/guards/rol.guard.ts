import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../models/database.types';

export function rolGuard(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.listo;

    const usuario = authService.usuarioActual();

    if (usuario && rolesPermitidos.includes(usuario.rol)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
}

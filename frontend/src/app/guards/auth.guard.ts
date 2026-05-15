import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.verificarStatus().pipe(
    map((autenticado) => {
      if (autenticado) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};

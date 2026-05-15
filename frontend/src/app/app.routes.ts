import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/callback/callback.component').then((m) => m.CallbackComponent),
  },
  {
    path: 'anuncios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/listagem/listagem.component').then((m) => m.ListagemComponent),
  },
  {
    path: 'anuncios/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/form-anuncio/form-anuncio.component').then((m) => m.FormAnuncioComponent),
  },
  {
    path: 'anuncios/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/form-anuncio/form-anuncio.component').then((m) => m.FormAnuncioComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

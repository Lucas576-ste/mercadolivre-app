import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  template: `<p style="text-align:center;margin-top:4rem">Autenticando...</p>`,
})
export class CallbackComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.auth.verificarStatus().subscribe((autenticado) => {
      this.router.navigate([autenticado ? '/anuncios' : '/login']);
    });
  }
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Toasts } from './layout/toasts/toasts';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Toasts],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

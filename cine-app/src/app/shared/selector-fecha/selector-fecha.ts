import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  input,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import type { Instance } from 'flatpickr/dist/types/instance';

export type ModoSelectorFecha = 'fecha' | 'hora';

@Component({
  selector: 'app-selector-fecha',
  standalone: true,
  imports: [],
  templateUrl: './selector-fecha.html',
  styleUrl: './selector-fecha.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectorFecha),
      multi: true,
    },
  ],
})
export class SelectorFecha implements AfterViewInit, OnDestroy, ControlValueAccessor {
  readonly modo = input<ModoSelectorFecha>('fecha');
  readonly placeholder = input('');

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private instancia: Instance | null = null;
  private valorPendiente: string | null = null;

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    const esHora = this.modo() === 'hora';

    this.instancia = flatpickr(this.inputRef().nativeElement, {
      locale: Spanish,
      enableTime: esHora,
      noCalendar: esHora,
      dateFormat: esHora ? 'H:i' : 'Y-m-d',
      altInput: true,
      altFormat: esHora ? 'H:i' : 'd/m/Y',
      time_24hr: true,
      onChange: (_fechas, valorTexto) => {
        this.onChange(valorTexto);
        this.onTouched();
      },
    });

    if (this.valorPendiente !== null) {
      this.instancia.setDate(this.valorPendiente, false);
    }
  }

  ngOnDestroy(): void {
    this.instancia?.destroy();
  }

  writeValue(valor: string | null): void {
    if (!this.instancia) {
      this.valorPendiente = valor;
      return;
    }
    this.instancia.setDate(valor ?? '', false);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    if (disabled) {
      this.instancia?.set('clickOpens', false);
    } else {
      this.instancia?.set('clickOpens', true);
    }
  }
}

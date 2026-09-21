export interface FranjaHoraria {
  inicio: Date;
  fin: Date;
}

export function generarFechas(diasSemana: number[], desde: string, hasta: string): Date[] {
  const fechas: Date[] = [];
  const fechaActual = new Date(`${desde}T00:00:00`);
  const fechaFin = new Date(`${hasta}T00:00:00`);

  while (fechaActual <= fechaFin) {
    if (diasSemana.includes(fechaActual.getDay())) {
      fechas.push(new Date(fechaActual));
    }
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return fechas;
}

export function hayConflicto(
  candidato: FranjaHoraria,
  existentes: FranjaHoraria[],
  bufferMinutos: number,
): boolean {
  const bufferMs = bufferMinutos * 60 * 1000;

  return existentes.some(
    (existente) =>
      candidato.inicio.getTime() < existente.fin.getTime() + bufferMs &&
      existente.inicio.getTime() < candidato.fin.getTime() + bufferMs,
  );
}

export function calcularPrecioVigente(
  precioBase: number,
  preventaApertura: string | null,
  preventaPrecio: number | null,
  estrenoFecha: string | null,
  ahora: Date,
): number {
  if (!preventaApertura || !preventaPrecio || !estrenoFecha) {
    return precioBase;
  }

  const apertura = new Date(preventaApertura);
  const estreno = new Date(`${estrenoFecha}T00:00:00`);

  if (ahora >= apertura && ahora < estreno) {
    return preventaPrecio;
  }

  return precioBase;
}

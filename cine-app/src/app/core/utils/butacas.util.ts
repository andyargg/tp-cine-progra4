import { TipoButaca } from '../models/database.types';

interface ButacaGenerada {
  fila: string;
  columna: number;
  tipo: TipoButaca;
}

const FILAS_ANTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const FILAS_DESPUES = ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
const FILAS_VIP = ['R', 'S', 'T'];
const FILA_ACCESIBLE = 'J';
const BLOQUES_NORMALES = [4, 20, 4];
const BLOQUES_ACCESIBLES = [2, 10, 2];

export function generarButacas(): ButacaGenerada[] {
  const butacas: ButacaGenerada[] = [];

  for (const fila of FILAS_ANTES) {
    agregarFila(butacas, fila, BLOQUES_NORMALES, 'normal');
  }

  agregarFila(butacas, FILA_ACCESIBLE, BLOQUES_ACCESIBLES, 'accesible');

  for (const fila of FILAS_DESPUES) {
    agregarFila(butacas, fila, BLOQUES_NORMALES, FILAS_VIP.includes(fila) ? 'vip' : 'normal');
  }

  return butacas;
}

function agregarFila(
  butacas: ButacaGenerada[],
  fila: string,
  bloques: number[],
  tipo: TipoButaca,
): void {
  let columna = 1;

  for (const cantidad of bloques) {
    for (let i = 0; i < cantidad; i++) {
      butacas.push({ fila, columna, tipo });
      columna++;
    }
  }
}

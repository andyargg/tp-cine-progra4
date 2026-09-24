import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarTablaPdf(
  titulo: string,
  columnas: string[],
  filas: (string | number)[][],
  nombreArchivo: string,
): void {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(titulo, 14, 15);

  autoTable(doc, {
    startY: 22,
    head: [columnas],
    body: filas,
  });

  doc.save(nombreArchivo);
}

export function exportarCsv(nombreArchivo: string, filas: Record<string, string | number>[]): void {
  if (filas.length === 0) return;

  const columnas = Object.keys(filas[0]);
  const encabezado = columnas.join(',');
  const cuerpo = filas
    .map((fila) =>
      columnas.map((c) => `"${String(fila[c]).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const contenido = `${encabezado}\n${cuerpo}`;
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();

  URL.revokeObjectURL(url);
}

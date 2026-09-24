import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface ItemCandyBarPdf {
  nombre: string;
  cantidad: number;
}

export interface DatosEntradaPdf {
  compraId: string;
  qrCodigo: string;
  peliculaNombre: string;
  funcionInicio: string;
  salaNombre: string;
  butacas: { fila: string; columna: number }[];
  candyBar?: ItemCandyBarPdf[];
  total: number;
  ventana?: Window | null;
}

export async function generarEntradaPdf(datos: DatosEntradaPdf): Promise<void> {
  const qrDataUrl = await QRCode.toDataURL(datos.qrCodigo, { width: 200 });

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('CineApp - Entrada', 20, 20);

  doc.setFontSize(14);
  doc.text(datos.peliculaNombre, 20, 35);

  doc.setFontSize(11);
  doc.text(`Función: ${new Date(datos.funcionInicio).toLocaleString('es-AR')}`, 20, 45);
  doc.text(`Sala: ${datos.salaNombre}`, 20, 52);
  doc.text(`Butacas: ${datos.butacas.map((b) => `${b.fila}${b.columna}`).join(', ')}`, 20, 59);

  let y = 66;

  if (datos.candyBar && datos.candyBar.length > 0) {
    doc.text(
      `Candy bar: ${datos.candyBar.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')}`,
      20,
      y,
    );
    y += 7;
  }

  doc.text(`Total: $${datos.total}`, 20, y);
  y += 7;
  doc.text(`Compra: ${datos.compraId}`, 20, y);

  doc.addImage(qrDataUrl, 'PNG', 20, y + 12, 60, 60);

  if (datos.ventana) {
    datos.ventana.location.href = doc.output('bloburl').toString();
  } else {
    doc.save(`entrada-${datos.compraId}.pdf`);
  }
}

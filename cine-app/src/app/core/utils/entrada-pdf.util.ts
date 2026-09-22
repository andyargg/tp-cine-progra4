import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface DatosEntradaPdf {
  compraId: string;
  qrCodigo: string;
  peliculaNombre: string;
  funcionInicio: string;
  salaNombre: string;
  butacas: { fila: string; columna: number }[];
  total: number;
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
  doc.text(`Total: $${datos.total}`, 20, 66);
  doc.text(`Compra: ${datos.compraId}`, 20, 73);

  doc.addImage(qrDataUrl, 'PNG', 20, 85, 60, 60);

  doc.save(`entrada-${datos.compraId}.pdf`);
}

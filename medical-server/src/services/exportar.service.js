// ═══════════════════════════════════════════════════════════════
// src/services/exportar.service.js — Exportación a PDF y Excel
// ═══════════════════════════════════════════════════════════════

const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Helpers ───────────────────────────────────────────────────

/**
 * Formatea una fecha al formato local chileno (dd-mm-aaaa).
 * @param {Date|string} fecha - Fecha a formatear.
 * @returns {string} Fecha formateada, o '—' si no hay valor.
 */
const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-CL') : '—';

/**
 * Formatea un par mes/año a etiqueta corta (ej. "Ene 2026").
 * @param {{mes:number, anio:number}} param0 - Mes (1-12) y año.
 * @returns {string} Etiqueta "Mmm AAAA".
 */
const formatearMes = ({ mes, anio }) =>
  `${MESES[(mes || 1) - 1]} ${anio}`;

// ══════════════════════════════════════════════════════════════
//  PDF — Reporte del Doctor
// ══════════════════════════════════════════════════════════════
/**
 * Genera el reporte del doctor en PDF y lo escribe (stream) en la respuesta HTTP.
 * @param {object} datos - Datos del reporte (doctor, periodo, resumen, etc.).
 * @param {import('express').Response} res - Respuesta donde se envía el PDF.
 * @returns {void}
 */
const generarPDFDoctor = (datos, res) => {
  const { doctor, periodo, resumen, ultimasAtenciones, diagnosticosFrecuentes } = datos;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Headers HTTP para descarga
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-doctor-${Date.now()}.pdf"`);
  doc.pipe(res);

  // ── Encabezado ────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill('#1e40af');
  doc.fillColor('white')
     .fontSize(22).font('Helvetica-Bold')
     .text('Sistema de Citas Médicas', 50, 22)
     .fontSize(12).font('Helvetica')
     .text('Reporte de Atenciones — Doctor', 50, 50)
     .text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 50, 66);
  doc.fillColor('#1e293b');

  let y = 110;

  // ── Datos del doctor ──────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').text('Información del Doctor', 50, y);
  y += 20;
  doc.fontSize(11).font('Helvetica')
     .text(`Nombre: ${doctor?.nombre || '—'}`, 50, y)
     .text(`Especialidad: ${doctor?.especialidad || '—'}`, 50, y + 16)
     .text(`Período: ${periodo.desde || 'Todo'} — ${periodo.hasta || 'Todo'}`, 50, y + 32);
  y += 60;

  // ── Resumen ───────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').text('Resumen', 50, y);
  y += 20;

  const metricas = [
    ['Total Atenciones',       resumen.totalAtenciones],
    ['Pacientes Únicos',       resumen.totalPacientesUnicos],
    ['Completadas',            resumen.citasPorEstado.find(e => e._id === 'completada')?.total || 0],
    ['Canceladas',             resumen.citasPorEstado.find(e => e._id === 'cancelada')?.total  || 0],
  ];

  const colW = 120, rowH = 50, cols = 4;
  metricas.forEach(([label, valor], i) => {
    const x = 50 + i * colW;
    doc.rect(x, y, colW - 6, rowH).fill('#eff6ff').stroke('#bfdbfe');
    doc.fillColor('#1e40af').fontSize(22).font('Helvetica-Bold')
       .text(String(valor), x + 8, y + 6, { width: colW - 16, align: 'center' });
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(label, x + 4, y + 32, { width: colW - 10, align: 'center' });
    doc.fillColor('#1e293b');
  });
  y += rowH + 20;

  // ── Citas por mes ─────────────────────────────────────────
  if (resumen.citasPorMes?.length) {
    doc.fontSize(14).font('Helvetica-Bold').text('Citas por Mes', 50, y);
    y += 18;
    doc.fontSize(10).font('Helvetica');
    resumen.citasPorMes.forEach(({ _id, total }) => {
      const barW = Math.min(total * 15, 350);
      doc.rect(50, y, barW, 14).fill('#3b82f6');
      doc.fillColor('#1e293b').text(`${formatearMes(_id)}: ${total}`, 50 + barW + 6, y + 2);
      y += 20;
    });
    y += 10;
  }

  // ── Últimas atenciones ────────────────────────────────────
  if (ultimasAtenciones?.length) {
    if (y > 680) { doc.addPage(); y = 50; }
    doc.fontSize(14).font('Helvetica-Bold').text('Últimas Atenciones', 50, y);
    y += 18;

    // Encabezado tabla
    const cols2 = ['Fecha', 'Paciente', 'Motivo', 'Estado'];
    const colsW  = [90, 150, 180, 80];
    let x = 50;
    doc.rect(50, y, 500, 18).fill('#e0e7ff');
    cols2.forEach((c, i) => {
      doc.fillColor('#1e40af').fontSize(9).font('Helvetica-Bold').text(c, x + 4, y + 4, { width: colsW[i] });
      x += colsW[i];
    });
    y += 18;

    ultimasAtenciones.forEach((cita, idx) => {
      if (y > 720) { doc.addPage(); y = 50; }
      const paciente = cita.pacienteId?.usuarioId;
      const nombre   = paciente ? `${paciente.nombre} ${paciente.apellido}` : '—';
      if (idx % 2 === 0) doc.rect(50, y, 500, 18).fill('#f8fafc');
      x = 50;
      const fila = [
        formatearFecha(cita.fechaHora),
        nombre,
        cita.motivo || '—',
        cita.estado  || '—'
      ];
      fila.forEach((val, i) => {
        doc.fillColor('#334155').fontSize(9).font('Helvetica')
           .text(val, x + 4, y + 4, { width: colsW[i] - 4 });
        x += colsW[i];
      });
      y += 18;
    });
    y += 10;
  }

  // ── Diagnósticos frecuentes ───────────────────────────────
  if (diagnosticosFrecuentes?.length) {
    if (y > 680) { doc.addPage(); y = 50; }
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Top Diagnósticos', 50, y);
    y += 18;
    diagnosticosFrecuentes.forEach(({ _id, total }, i) => {
      doc.fontSize(10).font('Helvetica').fillColor('#334155')
         .text(`${i + 1}. ${_id} — ${total} ${total === 1 ? 'vez' : 'veces'}`, 60, y);
      y += 16;
    });
  }

  // ── Pie ───────────────────────────────────────────────────
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Documento generado automáticamente por Medical API', 50, doc.page.height - 40, { align: 'center' });

  doc.end();
};

// ══════════════════════════════════════════════════════════════
//  EXCEL — Reporte del Doctor
// ══════════════════════════════════════════════════════════════
/**
 * Genera el reporte del doctor en Excel (.xlsx) y lo escribe en la respuesta HTTP.
 * @param {object} datos - Datos del reporte (doctor, periodo, resumen, etc.).
 * @param {import('express').Response} res - Respuesta donde se envía el archivo.
 * @returns {Promise<void>}
 */
const generarExcelDoctor = async (datos, res) => {
  const { doctor, periodo, resumen, ultimasAtenciones, diagnosticosFrecuentes } = datos;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Medical API';
  wb.created = new Date();

  // ── Estilos reutilizables ─────────────────────────────────
  const estiloTitulo = {
    font:      { bold: true, size: 14, color: { argb: 'FF1E40AF' } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  const estiloHeader = {
    font:      { bold: true, color: { argb: 'FFFFFFFF' } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      bottom: { style: 'thin', color: { argb: 'FF93C5FD' } }
    }
  };
  const estiloFila = (par) => ({
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: par ? 'FFF8FAFC' : 'FFFFFFFF' } },
    alignment: { vertical: 'middle' }
  });

  // ── Hoja 1: Resumen ───────────────────────────────────────
  const wsResumen = wb.addWorksheet('Resumen');
  wsResumen.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 20 }
  ];

  wsResumen.mergeCells('A1:B1');
  const celdaTitulo = wsResumen.getCell('A1');
  celdaTitulo.value = 'Reporte de Atenciones — Doctor';
  Object.assign(celdaTitulo, estiloTitulo);
  celdaTitulo.font = { ...estiloTitulo.font, size: 16 };
  wsResumen.getRow(1).height = 30;

  wsResumen.addRow([]);
  wsResumen.addRow(['Doctor',      doctor?.nombre       || '—']);
  wsResumen.addRow(['Especialidad', doctor?.especialidad || '—']);
  wsResumen.addRow(['Período desde', periodo.desde || 'Todos']);
  wsResumen.addRow(['Período hasta', periodo.hasta || 'Todos']);
  wsResumen.addRow(['Generado',    new Date().toLocaleDateString('es-CL')]);
  wsResumen.addRow([]);

  const metricasTitulo = wsResumen.addRow(['Métrica', 'Valor']);
  metricasTitulo.eachCell(c => Object.assign(c, estiloHeader));
  wsResumen.getRow(metricasTitulo.number).height = 22;

  const metricas = [
    ['Total Atenciones Completadas', resumen.totalAtenciones],
    ['Pacientes Únicos Atendidos',   resumen.totalPacientesUnicos],
    ['Citas Completadas',            resumen.citasPorEstado.find(e => e._id === 'completada')?.total || 0],
    ['Citas Canceladas',             resumen.citasPorEstado.find(e => e._id === 'cancelada')?.total  || 0],
    ['Citas Pendientes',             resumen.citasPorEstado.find(e => e._id === 'pendiente')?.total  || 0],
    ['Citas Confirmadas',            resumen.citasPorEstado.find(e => e._id === 'confirmada')?.total || 0],
  ];
  metricas.forEach(([k, v], i) => {
    const row = wsResumen.addRow([k, v]);
    row.eachCell(c => Object.assign(c, estiloFila(i % 2 === 0)));
    row.getCell(2).alignment = { horizontal: 'center' };
  });

  // ── Hoja 2: Citas por mes ─────────────────────────────────
  const wsMes = wb.addWorksheet('Citas por Mes');
  wsMes.columns = [
    { header: 'Mes', key: 'mes', width: 15 },
    { header: 'Total Citas', key: 'total', width: 15 }
  ];
  wsMes.getRow(1).eachCell(c => Object.assign(c, estiloHeader));
  wsMes.getRow(1).height = 22;

  (resumen.citasPorMes || []).forEach(({ _id, total }, i) => {
    const row = wsMes.addRow({ mes: formatearMes(_id), total });
    row.eachCell(c => Object.assign(c, estiloFila(i % 2 === 0)));
    row.getCell('total').alignment = { horizontal: 'center' };
  });

  // ── Hoja 3: Últimas atenciones ────────────────────────────
  const wsAten = wb.addWorksheet('Últimas Atenciones');
  wsAten.columns = [
    { header: 'Fecha',    key: 'fecha',    width: 15 },
    { header: 'Paciente', key: 'paciente', width: 28 },
    { header: 'Motivo',   key: 'motivo',   width: 35 },
    { header: 'Tipo',     key: 'tipo',     width: 15 },
    { header: 'Estado',   key: 'estado',   width: 15 }
  ];
  wsAten.getRow(1).eachCell(c => Object.assign(c, estiloHeader));
  wsAten.getRow(1).height = 22;

  (ultimasAtenciones || []).forEach((cita, i) => {
    const paciente = cita.pacienteId?.usuarioId;
    const row = wsAten.addRow({
      fecha:    formatearFecha(cita.fechaHora),
      paciente: paciente ? `${paciente.nombre} ${paciente.apellido}` : '—',
      motivo:   cita.motivo  || '—',
      tipo:     cita.tipo    || '—',
      estado:   cita.estado  || '—'
    });
    row.eachCell(c => Object.assign(c, estiloFila(i % 2 === 0)));
  });

  // ── Hoja 4: Diagnósticos frecuentes ──────────────────────
  const wsDx = wb.addWorksheet('Diagnósticos');
  wsDx.columns = [
    { header: '#',            key: 'rank',  width: 6  },
    { header: 'Diagnóstico', key: 'dx',    width: 50 },
    { header: 'Frecuencia',  key: 'total', width: 15 }
  ];
  wsDx.getRow(1).eachCell(c => Object.assign(c, estiloHeader));
  wsDx.getRow(1).height = 22;

  (diagnosticosFrecuentes || []).forEach(({ _id, total }, i) => {
    const row = wsDx.addRow({ rank: i + 1, dx: _id, total });
    row.eachCell(c => Object.assign(c, estiloFila(i % 2 === 0)));
    row.getCell('total').alignment = { horizontal: 'center' };
  });

  // ── Enviar ────────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-doctor-${Date.now()}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
};

module.exports = { generarPDFDoctor, generarExcelDoctor };

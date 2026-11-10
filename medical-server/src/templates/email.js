const LOGO_CID = 'logo@medical.criveradev.com';

const entidadesHtml = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = valor => String(valor).replace(/[&<>"']/g, caracter => entidadesHtml[caracter]);

function renderizarEmail({ titulo, saludo, mensaje, detalles = [], codigo, accion, notas = [] }) {
  const parrafo = texto => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapar(texto)}</p>`;
  const filas = detalles.map(([etiqueta, valor]) => `
    <tr><td style="padding:6px 0;">
      <strong>${escapar(etiqueta)}:</strong> ${escapar(valor)}
    </td></tr>`).join('');
  const bloque = filas ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      bgcolor="#eff6fc" style="margin:0 0 20px;border:1px solid #b3d2ee;border-radius:16px;">
      <tr><td style="padding:14px 18px;color:#122f4f;">
        <p style="margin:0 0 4px;color:#1a4d84;font-size:11px;font-weight:bold;letter-spacing:1.4px;">DETALLES</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="font-size:15px;line-height:1.5;">${filas}</table>
      </td></tr>
    </table>` : '';
  const verificacion = codigo ? `
    <p style="margin:0 0 20px;padding:20px 12px;background:#eff6fc;border:1px solid #b3d2ee;border-radius:16px;
      text-align:center;color:#122f4f;">
      <span style="display:block;margin-bottom:6px;color:#1a4d84;font-size:11px;font-weight:bold;letter-spacing:1.4px;">CÓDIGO DE VERIFICACIÓN</span>
      <code style="font-family:Consolas,monospace;font-size:32px;font-weight:bold;letter-spacing:5px;">${escapar(codigo)}</code>
    </p>` : '';

  const enlace = accion ? `
    <p style="margin:0 0 20px;">
      <a href="${escapar(accion.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1a4d84;color:white;text-decoration:none;font-weight:bold;">${escapar(accion.texto)}</a>
    </p>` : '';

  return {
    text: [
      'Medical', titulo, saludo, mensaje, codigo,
      ...detalles.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      accion?.url,
      ...notas,
    ].filter(Boolean).join('\n\n'),
    html: `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eff6fc;color:#334155;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eff6fc">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff"
        style="max-width:600px;border:1px solid #d8e9f7;border-radius:24px;">
        <tr><td style="padding:16px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td><img src="cid:${LOGO_CID}" width="36" height="36" alt=""
                style="display:block;border:0;"></td>
              <td style="padding-left:10px;font-size:20px;font-weight:bold;color:#122f4f;">Medical</td>
            </tr>
          </table>
        </td></tr>
        <tr><td bgcolor="#122f4f"
          style="padding:24px;background-color:#122f4f;background-image:linear-gradient(135deg,#122f4f,#1a4d84);">
          <p style="margin:0 0 8px;color:#b3d2ee;font-size:11px;font-weight:bold;letter-spacing:2px;">PORTAL DE PACIENTES</p>
          <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;">${escapar(titulo)}</h1>
        </td></tr>
        <tr><td style="padding:24px 24px 12px;">
          ${saludo ? parrafo(saludo) : ''}
          ${parrafo(mensaje)}
          ${bloque}
          ${verificacion}
          ${enlace}
          ${notas.map(parrafo).join('')}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #d8e9f7;color:#475569;font-size:13px;">
          Medical · Portal de pacientes
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

module.exports = { LOGO_CID, renderizarEmail };

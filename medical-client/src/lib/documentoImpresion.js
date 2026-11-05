import { clinica } from '../data/clinic';

export const escaparHtml = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[caracter]);

// Divide las secciones usando sus medidas reales para conservar todo el texto al imprimir.
function paginarDocumento(document) {
  const origen = document.getElementById('origen');
  const destino = document.getElementById('paginas');
  destino.replaceChildren();

  function nuevaPagina() {
    const pagina = document.createElement('article');
    pagina.className = 'hoja';
    pagina.append(origen.querySelector('header').cloneNode(true));
    const cuerpo = document.createElement('div');
    cuerpo.className = 'contenido';
    pagina.append(cuerpo);
    const pie = document.createElement('div');
    pie.className = 'numero-pagina';
    pagina.append(pie);
    destino.append(pagina);
    return cuerpo;
  }

  let cuerpo = nuevaPagina();
  const cabe = () => cuerpo.scrollHeight <= cuerpo.clientHeight + 1;

  for (const seccion of origen.querySelector('.secciones').children) {
    let restante = seccion.cloneNode(true);
    while (restante) {
      cuerpo.append(restante);
      if (cabe()) break;
      const altura = restante.getBoundingClientRect().height;
      restante.remove();

      // Prueba primero una hoja completa para no partir bloques que caben juntos.
      if (cuerpo.childElementCount > 0 && altura <= cuerpo.clientHeight) {
        cuerpo = nuevaPagina();
        continue;
      }

      // Si la sección supera una hoja, busca cuánto texto cabe manteniendo su HTML.
      const nodos = [];
      const recorrer = document.createTreeWalker(restante, NodeFilter.SHOW_TEXT);
      while (recorrer.nextNode()) nodos.push(recorrer.currentNode);
      const largo = restante.textContent.length;

      function fragmento(fin, inicio = 0) {
        const rango = document.createRange();
        rango.selectNodeContents(restante);
        function extremo(indice) {
          for (const nodo of nodos) {
            if (indice <= nodo.length) return [nodo, indice];
            indice -= nodo.length;
          }
          return [restante, restante.childNodes.length];
        }
        if (inicio) rango.setStart(...extremo(inicio));
        if (fin < largo) rango.setEnd(...extremo(fin));
        const copia = restante.cloneNode(false);
        copia.append(rango.cloneContents());
        return copia;
      }

      let inicio = 1;
      let fin = largo;
      let limite = 0;
      while (inicio <= fin) {
        const mitad = Math.floor((inicio + fin) / 2);
        const prueba = fragmento(mitad);
        cuerpo.append(prueba);
        const entra = cabe();
        prueba.remove();
        if (entra) {
          limite = mitad;
          inicio = mitad + 1;
        } else {
          fin = mitad - 1;
        }
      }
      const encabezado = restante.querySelector('h2');
      if (cuerpo.childElementCount > 0 && limite <= (encabezado?.textContent.length || 0) + 30) {
        cuerpo = nuevaPagina();
        continue;
      }
      if (!limite || limite >= largo) {
        // Las plantillas solo contienen texto. Evita un bucle si cambia esa condición.
        cuerpo.append(restante);
        break;
      }
      const texto = restante.textContent;
      const espacio = texto.slice(0, limite).search(/\s+\S*$/);
      if (espacio > limite / 2) limite = espacio;
      cuerpo.append(fragmento(limite));
      restante = fragmento(largo, limite);
      cuerpo = nuevaPagina();
    }
  }

  const paginas = [...destino.children];
  paginas.forEach((pagina, indice) => {
    pagina.querySelector('.numero-pagina').textContent =
      'Medical · Página ' + (indice + 1) + ' de ' + paginas.length;
  });
}

export function imprimirDocumento({ ventana, titulo, folio, fecha, contenido }) {
  const esc = escaparHtml;
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} ${esc(folio)}</title>
<style>
  @page {
    size: A4;
    margin: 14mm;
  }
  * { box-sizing: border-box; }
  body { margin: 0; color: #182b42; background: #eff6fc; font: 10.5pt/1.5 Arial, sans-serif; }
  .hoja { width: 182mm; height: 230mm; display: flex; flex-direction: column; margin: 24px auto; padding: 0; background: white; }
  .hoja header { flex: none; }
  .contenido { flex: 1; min-height: 0; }
  .numero-pagina { flex: 0 0 30px; padding-top: 12px; line-height: 14px; text-align: right; font-size: 9pt; color: #475569; }
  #origen { display: none; }
  .cabecera { padding-bottom: 16px; }
  .marca { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .logo { width: 36px; height: 36px; flex: none; }
  .marca strong { color: #122f4f; font-size: 17pt; }
  .direccion { margin: 0; color: #475569; font-size: 9pt; }
  .titulo { padding: 14px 18px; border-radius: 14px; background: #122f4f; color: white; }
  .titulo h1 { margin: 0 0 7px; font-size: 22pt; line-height: 1.2; color: white; }
  .referencia { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; font-size: 9pt; color: #d8e9f7; overflow-wrap: anywhere; }
  h2 { margin: 0 0 8px; color: #1a4d84; font-size: 11pt; break-after: avoid; }
  p { margin: 0 0 8px; orphans: 3; widows: 3; overflow-wrap: anywhere; }
  .bloque { margin: 0 0 12px; padding: 12px; border: 1px solid #d8e9f7; border-radius: 12px; }
  .suave { background: #eff6fc; }
  .datos { display: flex; flex-wrap: wrap; gap: 12px 24px; }
  .datos > div { min-width: 0; flex: 1 1 55mm; overflow-wrap: anywhere; }
  .etiqueta { display: block; margin-bottom: 4px; color: #475569; font-size: 9pt; }
  .valor { font-weight: 600; }
  .texto { white-space: pre-wrap; }
  .estado { display: inline-block; padding: 5px 12px; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 10pt; font-weight: bold; }
  .pagado { color: #0f6e56; background: #ecfdf5; border-color: #a7f3d0; }
  .pendiente { color: #92400e; background: #fffbeb; border-color: #fde68a; }
  .anulado { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
  .importe { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 20px; margin: 0 0 18px; border: 1px solid #b3d2ee; border-radius: 14px; background: #eff6fc; break-inside: avoid; }
  .importe strong { color: #122f4f; font-size: 26pt; overflow-wrap: anywhere; }
  .prescripcion { padding: 12px 0; border-top: 2px solid #b3d2ee; border-bottom: 1px solid #d8e9f7; margin-bottom: 12px; }
  .firma { margin: 16px 0 12px; padding-top: 24px; text-align: center; break-inside: avoid; }
  .firma strong { display: block; max-width: 95mm; margin: auto; padding-top: 8px; border-top: 1px solid #64748b; overflow-wrap: anywhere; }
  .pie { border-top: 1px solid #d8e9f7; padding-top: 12px; color: #475569; font-size: 9pt; break-inside: avoid; }
  .herramientas { display: flex; justify-content: center; padding: 18px; }
  button { border: 0; border-radius: 10px; padding: 12px 20px; color: white; background: #1a4d84; font: 600 14px Arial, sans-serif; cursor: pointer; }
  @media print {
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hoja { margin: 0; break-inside: avoid; break-after: page; }
    .hoja:last-child { break-after: auto; }
    .herramientas { display: none; }
  }
  @media screen and (max-width: 600px) {
    body { overflow-x: auto; }
    .hoja { margin: 12px; }
  }
</style>
</head>
<body>
<div class="herramientas"><button id="imprimir" type="button">Imprimir / Guardar PDF</button></div>
<div id="origen">
      <header class="cabecera">
        <div class="marca">
          <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1f5fa3"/>
            <path d="M7 17h4l2-5 3 9 2-5h7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div><strong>${esc(clinica.nombre)}</strong><p class="direccion">${esc(clinica.direccion)} · ${esc(clinica.telefono)}</p></div>
        </div>
        <div class="titulo">
          <h1>${esc(titulo)}</h1>
          <div class="referencia"><span>Folio ${esc(folio)}</span><span>${esc(fecha)}</span></div>
        </div>
      </header>
      <div class="secciones">${contenido}</div>
</div>
<main id="paginas"></main>

</body>
</html>`;
  const w = window.open('', ventana, 'width=820,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.document.getElementById('imprimir').addEventListener('click', () => {
    paginarDocumento(w.document);
    w.print();
  });
  w.focus();
  // Espera al texto y al primer dibujo para imprimir sin depender de un tiempo fijo.
  w.document.fonts.ready.then(() => {
    if (!w.closed) {
      paginarDocumento(w.document);
      w.requestAnimationFrame(() => w.print());
    }
  });
}

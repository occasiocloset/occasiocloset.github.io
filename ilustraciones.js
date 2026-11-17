/* =====================================================================
   OCCASIO · Ilustraciones
   Prendas dibujadas en SVG (estilo pegatina con alfiler), iconos y logo.
   ===================================================================== */
(function () {
  'use strict';

  const COLORES = {
    negro: '#2B2523', blanco: '#FBF8F2', crema: '#EADFC8', beige: '#D6C3A3',
    camel: '#B98A55', marron: '#6E4A33', vino: '#6B1E2B', rojo: '#B23A3A',
    rosa: '#E3B5B0', azul: '#2F3B55', vaquero: '#5C7590', verde: '#6F7A55',
    gris: '#9A9590', dorado: '#C49A4E'
  };
  // [masculino, femenino]
  const NOMBRE_COLOR = {
    negro: ['negro', 'negra'], blanco: ['blanco', 'blanca'], crema: ['crema', 'crema'],
    beige: ['beige', 'beige'], camel: ['camel', 'camel'], marron: ['marrón', 'marrón'],
    vino: ['vino', 'vino'], rojo: ['rojo', 'roja'], rosa: ['rosa', 'rosa'],
    azul: ['azul', 'azul'], vaquero: ['vaquero', 'vaquera'], verde: ['verde', 'verde'],
    gris: ['gris', 'gris'], dorado: ['dorado', 'dorada']
  };

  const oscuro = hex => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 120;
  };

  /* Cada forma: c = cuerpo (se rellena con el color), l = líneas de detalle,
     x/y = alfiler, extra(color) = piezas con color propio. */
  const FORMAS = {
    camiseta: { c: ['M31 16 L42 11 Q50 18 58 11 L69 16 L87 31 L78 42 L70 36 L70 89 L30 89 L30 36 L22 42 L13 31 Z'],
      l: ['M42 11 Q50 18 58 11', 'M30 84 L70 84'], x: 50, y: 13, rayas: 'h' },
    camisa: { c: ['M33 12 L44 9 L50 17 L56 9 L67 12 L84 28 L90 74 L80 77 L72 40 L72 91 L28 91 L28 40 L20 77 L10 74 L16 28 Z'],
      l: ['M50 21 L50 91', 'M12 70 L21 72', 'M88 70 L79 72'], x: 50, y: 9, rayas: 'v',
      extra: () => `<path d="M44 9 L40 16 L50 22 L60 16 L56 9 L50 17 Z" fill="#fff" fill-opacity=".55" stroke="rgba(58,42,38,.3)" stroke-width="1" stroke-linejoin="round"/>` +
        [32, 46, 60, 74, 86].map(y => `<circle cx="52.6" cy="${y}" r="1.4" fill="rgba(58,42,38,.35)"/>`).join('') },
    jersey: { c: ['M33 13 L43 10 Q50 16 57 10 L67 13 L84 28 L89 76 L80 78 L72 40 L73 88 L27 88 L28 40 L20 78 L11 76 L16 28 Z'],
      l: ['M43 13 Q50 20 57 13', 'M28 82 L72 82', 'M12 70 L21 72', 'M88 70 L79 72'], x: 50, y: 11, rayas: 'h' },
    top: { c: ['M37 10 L42 10 Q50 26 58 10 L63 10 Q64 26 71 33 L72 88 L28 88 L29 33 Q36 26 37 10 Z'],
      l: ['M29 82 L71 82'], x: 50, y: 15, rayas: 'h' },
    pantalon: { c: ['M29 8 L71 8 L77 92 L56 92 L50 36 L44 92 L23 92 Z'],
      l: ['M29 15 L71 15', 'M50 15 L50 34', 'M32 19 Q38 25 41 15', 'M68 19 Q62 25 59 15'], x: 50, y: 9, rayas: 'v' },
    falda: { c: ['M31 14 L69 14 L84 80 Q50 86 16 80 Z'],
      l: ['M31 21 L69 21', 'M42 22 L36 82', 'M50 22 L50 84', 'M58 22 L64 82'], x: 50, y: 15, rayas: 'v' },
    short: { c: ['M28 22 L72 22 L76 66 L55 68 L50 46 L45 68 L24 66 Z'],
      l: ['M28 29 L72 29', 'M50 29 L50 44'], x: 50, y: 23, rayas: 'v' },
    vestido: { c: ['M39 8 L44 8 Q50 16 56 8 L61 8 L63 32 Q60 38 61 42 L82 90 Q50 95 18 90 L39 42 Q40 38 37 32 Z'],
      l: ['M39 42 Q50 45 61 42', 'M44 8 Q50 16 56 8'], x: 50, y: 11, rayas: 'h' },
    abrigo: { c: ['M33 9 L44 7 L50 26 L56 7 L67 9 L85 26 L90 80 L80 82 L74 42 L76 95 L24 95 L26 42 L20 82 L10 80 L15 26 Z'],
      l: ['M44 7 L40 22 L50 40', 'M56 7 L60 22 L50 40', 'M50 40 L50 95', 'M30 70 L40 70', 'M60 70 L70 70'], x: 50, y: 9, rayas: 'v',
      extra: () => `<circle cx="46" cy="52" r="1.8" fill="rgba(58,42,38,.4)"/><circle cx="46" cy="66" r="1.8" fill="rgba(58,42,38,.4)"/>` },
    chaqueta: { c: ['M33 12 L44 10 L50 28 L56 10 L67 12 L85 28 L89 74 L79 76 L73 42 L74 82 L26 82 L27 42 L21 76 L11 74 L15 28 Z'],
      l: ['M44 10 L41 24 L50 42', 'M56 10 L59 24 L50 42', 'M50 42 L50 82', 'M27 76 L73 76'], x: 50, y: 11, rayas: 'v',
      extra: () => `<circle cx="47" cy="54" r="1.7" fill="rgba(58,42,38,.4)"/><circle cx="47" cy="66" r="1.7" fill="rgba(58,42,38,.4)"/>` },
    botas: { c: ['M34 10 L54 10 L54 64 Q54 70 60 72 L76 77 Q82 79 82 86 L82 90 L34 90 Z'],
      l: ['M34 17 L54 17', 'M34 84 L82 84'], x: 44, y: 11, rayas: 'v' },
    zapatillas: { c: ['M10 68 Q12 50 28 48 L44 46 Q52 54 66 56 Q86 58 90 70 L90 74 L10 74 Z'],
      l: ['M36 50 L40 58', 'M42 49 L46 57', 'M48 52 L52 59'], x: 36, y: 47, rayas: 'h',
      extra: () => `<path d="M9 72 L91 72 L91 79 Q50 82 9 79 Z" fill="#FBF8F2" stroke="rgba(58,42,38,.3)" stroke-width="1"/>` },
    mocasines: { c: ['M24 16 Q34 6 44 16 L46 80 Q34 93 22 80 Z', 'M56 16 Q66 6 76 16 L78 80 Q66 93 54 80 Z'],
      l: ['M26 32 Q34 25 42 32', 'M58 32 Q66 25 74 32'], x: 50, y: 14, rayas: 'v' },
    bolso: { c: ['M18 42 L82 42 L77 90 L23 90 Z'],
      l: ['M20 56 L80 56'], x: 50, y: 15, rayas: 'v', asa: 'M33 42 Q33 15 50 15 Q67 15 67 42',
      extra: () => `<rect x="45" y="51" width="10" height="9" rx="2" fill="none" stroke="#C49A4E" stroke-width="2"/>` },
    gafas: { aros: [[30, 52, 17], [70, 52, 17]], puente: 'M46 47 Q50 42 54 47', x: 50, y: 34, lente: true },
    pendientes: { aros: [[34, 54, 13], [66, 54, 13]], ganchos: ['M34 41 L34 34', 'M66 41 L66 34'], x: 50, y: 30 },
    bufanda: { c: ['M30 8 L52 8 L52 64 L62 88 L46 92 L38 72 L30 66 Z'],
      l: ['M30 20 L52 20', 'M30 32 L52 32', 'M30 44 L52 44', 'M47 92 L45 98', 'M52 91 L51 97', 'M57 90 L58 96'], x: 41, y: 9, rayas: 'h' }
  };

  let n = 0;
  const alfiler = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="4.6" fill="#ECE6DC" stroke="#C3B8A8" stroke-width="1"/><circle cx="${x - 1.4}" cy="${y - 1.5}" r="1.4" fill="#fff"/>`;

  function svgPrenda(forma, color, rayas, etiqueta) {
    const f = FORMAS[forma] || FORMAS.camiseta;
    const hex = COLORES[color] || color || '#B9A68C';
    const linea = oscuro(hex) ? 'rgba(255,255,255,.22)' : 'rgba(58,42,38,.22)';
    const borde = 'rgba(58,42,38,.28)';
    let defs = '', relleno = hex, cuerpo = '', pegatina = '';

    if (rayas && COLORES[rayas]) {
      const id = 'ry' + (++n);
      defs = f.rayas === 'v'
        ? `<pattern id="${id}" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="${hex}"/><rect width="2.6" height="10" fill="${COLORES[rayas]}"/></pattern>`
        : `<pattern id="${id}" width="10" height="7" patternUnits="userSpaceOnUse"><rect width="10" height="7" fill="${hex}"/><rect width="10" height="2.6" fill="${COLORES[rayas]}"/></pattern>`;
      relleno = `url(#${id})`;
    }

    if (f.aros) {
      const ancho = f.lente ? 5 : 4.5;
      pegatina = f.aros.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f.lente ? '#fff' : 'none'}" stroke="#fff" stroke-width="${ancho + 7}"/>`).join('');
      if (f.puente) pegatina += `<path d="${f.puente}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`;
      if (f.ganchos) pegatina += f.ganchos.map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`).join('');
      cuerpo = f.aros.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f.lente ? '#3A2A26' : 'none'}" fill-opacity=".88" stroke="${hex}" stroke-width="${ancho}"/>`).join('');
      if (f.lente) cuerpo += f.aros.map(([x, y, r]) => `<path d="M${x - r + 6} ${y - 5} Q${x - 4} ${y - r + 3} ${x + 3} ${y - r + 5}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>`).join('');
      if (f.puente) cuerpo += `<path d="${f.puente}" fill="none" stroke="${hex}" stroke-width="4" stroke-linecap="round"/>`;
      if (f.ganchos) cuerpo += f.ganchos.map(d => `<path d="${d}" fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round"/>`).join('');
    } else {
      pegatina = f.c.map(d => `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`).join('');
      if (f.asa) pegatina += `<path d="${f.asa}" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>`;
      if (f.asa) cuerpo += `<path d="${f.asa}" fill="none" stroke="${hex}" stroke-width="4" stroke-linecap="round"/>`;
      cuerpo += f.c.map(d => `<path d="${d}" fill="${relleno}" stroke="${borde}" stroke-width="1" stroke-linejoin="round"/>`).join('');
      cuerpo += (f.l || []).map(d => `<path d="${d}" fill="none" stroke="${linea}" stroke-width="1.4" stroke-linecap="round"/>`).join('');
      if (f.extra) cuerpo += f.extra(hex);
    }
    const etq = etiqueta ? ` role="img" aria-label="${etiqueta.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
    return `<svg viewBox="0 0 100 100"${etq}>${defs ? `<defs>${defs}</defs>` : ''}${pegatina}${cuerpo}${alfiler(f.x, f.y)}</svg>`;
  }

  /* Iconos de interfaz (trazo) */
  const I = {
    hoy: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
    armario: '<path d="M12 9.5 3.6 16.2c-.8.6-.3 1.8.6 1.8h15.6c.9 0 1.4-1.2.6-1.8L12 9.5V8"/><path d="M12 8a2.2 2.2 0 1 0-2.2-2.2"/>',
    calendario: '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    perfil: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    otra: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4.5V8h-3.5"/>',
    chispa: '<path d="M12 3.5 13.8 10.2 20.5 12 13.8 13.8 12 20.5 10.2 13.8 3.5 12 10.2 10.2Z"/>',
    camara: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.4"/>',
    galeria: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4.5 3 3 2-2L19 17"/>',
    look: '<path d="M8 4h8l3 4-3 2v10H8V10L5 8z"/>',
    publicar: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
    prenda: '<path d="M9 4 4.5 6.5 6 11l2-.8V20h8v-9.8l2 .8 1.5-4.5L15 4c-.5 1.5-1.6 2.3-3 2.3S9.5 5.5 9 4z"/>',
    compartir: '<circle cx="17.5" cy="6" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    ok: '<path d="m5 12.5 4.2 4L19 7"/>',
    izq: '<path d="m14.5 6-6 6 6 6"/>',
    der: '<path d="m9.5 6 6 6-6 6"/>',
    filtro: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    sobre: '<rect x="3.5" y="6" width="17" height="12.5" rx="2"/><path d="m4 7 8 6 8-6"/>'
  };
  const icono = (nombre, tam = 22) =>
    `<svg class="ico" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[nombre] || ''}</svg>`;

  /* Logo: percha cuyo gancho forma la «o» */
  const percha = (tam = 28, grosor = 8) =>
    `<svg class="percha" width="${tam}" height="${Math.round(tam * 0.78)}" viewBox="0 -2 120 94" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round"><path d="M60 42 L14 76 Q10 80 16 80 L104 80 Q110 80 106 76 Z"/><path d="M60 42 V32"/><path d="M60 32 A11 11 0 1 1 70.6 17"/></g></svg>`;

  window.OCC_IL = { svgPrenda, icono, percha, COLORES, NOMBRE_COLOR };
})();

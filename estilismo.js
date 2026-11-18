/* =====================================================================
   OCCASIO · Estilismo y colorimetría
   Genera propuestas de outfit puntuando cada combinación con criterios de
   armonía de color y estilismo: 2-4 colores, regla 60-30-10, análogos y
   complementarios, temperatura, contraste claro/oscuro, accesorios que
   repiten la paleta o aportan el acento, y combinaciones actuales.
   Las reglas son orientativas: suman o restan puntos, no prohíben nada.
   ===================================================================== */
(function (raiz) {
  'use strict';

  /* Perfil de cada color del armario
     h: tono (0-360) · s: saturación (0-1) · l: luminosidad (0-1)
     t: temperatura (c cálido, f frío, n neutro) · n: cuánto actúa como neutro (1 = neutro puro) */
  const PAL = {
    negro:   { h: 0,   s: 0,    l: 0.08, t: 'n', n: 1 },
    blanco:  { h: 0,   s: 0,    l: 0.97, t: 'n', n: 1 },
    crema:   { h: 40,  s: 0.3,  l: 0.88, t: 'c', n: 1 },
    beige:   { h: 35,  s: 0.3,  l: 0.75, t: 'c', n: 1 },
    gris:    { h: 0,   s: 0,    l: 0.6,  t: 'f', n: 1 },
    camel:   { h: 30,  s: 0.5,  l: 0.52, t: 'c', n: 0.75 },
    marron:  { h: 22,  s: 0.4,  l: 0.3,  t: 'c', n: 0.75 },
    vaquero: { h: 212, s: 0.3,  l: 0.46, t: 'f', n: 0.8 },
    azul:    { h: 222, s: 0.35, l: 0.25, t: 'f', n: 0.7 },
    verde:   { h: 75,  s: 0.25, l: 0.4,  t: 'c', n: 0.55 },
    vino:    { h: 350, s: 0.6,  l: 0.26, t: 'c', n: 0.35 },
    rojo:    { h: 0,   s: 0.75, l: 0.45, t: 'c', n: 0 },
    rosa:    { h: 350, s: 0.45, l: 0.8,  t: 'c', n: 0.3 },
    dorado:  { h: 42,  s: 0.6,  l: 0.55, t: 'c', n: 0.7, metal: true }
  };
  const NOMBRE = { negro: 'negro', blanco: 'blanco', crema: 'crema', beige: 'beige', gris: 'gris', camel: 'camel', marron: 'marrón', vaquero: 'vaquero', azul: 'azul marino', verde: 'verde oliva', vino: 'burdeos', rojo: 'rojo', rosa: 'rosa', dorado: 'dorado' };
  /* Familias: tonos de una misma gama cuentan como un solo color (looks tonales) */
  const FAMILIA = { negro: 'negro', blanco: 'claro', crema: 'claro', gris: 'gris', beige: 'tierra', camel: 'tierra', marron: 'tierra', vaquero: 'vaquero', azul: 'azul', verde: 'verde', vino: 'vino', rojo: 'rojo', rosa: 'rosa', dorado: 'metal' };
  const fam = c => FAMILIA[c] || c;
  const perfil = c => PAL[c] || { h: 0, s: 0.3, l: 0.5, t: 'n', n: 0.6 };
  const esColor = c => perfil(c).n < 0.7 && !perfil(c).metal;          // color «protagonista», no neutro
  const intenso = c => { const p = perfil(c); return p.s >= 0.55 && p.l > 0.3 && p.l < 0.75; };
  const difTono = (a, b) => { const d = Math.abs(perfil(a).h - perfil(b).h) % 360; return d > 180 ? 360 - d : d; };

  /* Superficie aproximada que ocupa cada prenda en el conjunto (para la regla 60-30-10) */
  const AREA = { abrigo: 0.34, vestido: 0.5, arriba: 0.3, abajo: 0.3, calzado: 0.08, accesorio: 0.05 };
  const PEQUENAS = ['calzado', 'accesorio'];

  function reparto(ps) {
    const conAbrigo = ps.some(p => p.tipo === 'abrigo');
    const w = {};
    ps.forEach(p => {
      const a = p.tipo === 'arriba' && conAbrigo ? 0.18 : (AREA[p.tipo] || 0.1);
      w[p.color] = (w[p.color] || 0) + a;
    });
    const total = Object.values(w).reduce((x, y) => x + y, 0) || 1;
    Object.keys(w).forEach(k => { w[k] /= total; });
    return w;
  }

  /* Puntúa un conjunto. Devuelve { puntos, motivo } */
  function puntuar(ps) {
    const share = reparto(ps);
    const cols = Object.keys(share).sort((a, b) => share[b] - share[a]);
    const fshare = {};
    cols.forEach(c => { if (fam(c) !== 'metal') fshare[fam(c)] = (fshare[fam(c)] || 0) + share[c]; });
    const fams = Object.keys(fshare).sort((a, b) => fshare[b] - fshare[a]);
    const grandes = ps.filter(p => !PEQUENAS.includes(p.tipo));
    const pequenas = ps.filter(p => PEQUENAS.includes(p.tipo));
    const colGrandes = new Set(grandes.map(p => p.color));
    const colores = cols.filter(esColor);
    const peso = c => share[c] || 0;
    const enGrande = c => colGrandes.has(c);
    let s = 0;
    const motivos = [];

    // 1. Número de colores (por gamas): 2-4 en total, como mucho 2 protagonistas
    if (fams.length > 4) s -= 3 * (fams.length - 4);
    if (fams.length === 1) s -= 1;
    if (colores.length > 2) s -= 2.5 * (colores.length - 2);

    // 2. Dos colores intensos no compiten por la atención
    const fuertes = colores.filter(intenso);
    if (fuertes.length > 1) s -= 3;
    if (fuertes.length === 1 && peso(fuertes[0]) > 0.45) s -= 0.8;   // un color muy llamativo, mejor no en todo el look

    // 3. Relación entre todos los colores con tono (incluidos los acentos)
    const conTono = cols.filter(c => perfil(c).n < 0.8 && !perfil(c).metal);
    for (let i = 0; i < conTono.length; i++) for (let j = i + 1; j < conTono.length; j++) {
      const a = conTono[i], b = conTono[j];
      if (fam(a) === fam(b)) continue;
      const d = difTono(a, b);
      const suaves = Math.min(perfil(a).s, perfil(b).s) < 0.4 || perfil(a).l < 0.3 || perfil(b).l < 0.3;
      if (d <= 40) { s += 0.8; motivos.push('análogos'); }
      else if (d >= 150) { s += suaves ? 1 : 0.2; motivos.push('complementarios'); }
      else s -= (perfil(a).s > 0.4 && perfil(b).s > 0.4) ? 2 : 0.6;
      if (perfil(a).t !== perfil(b).t && !suaves) s -= 1;
    }

    // 4. Regla 60-30-10 (sobre gamas)
    const d0 = fshare[fams[0]] || 0;
    s += (d0 >= 0.4 && d0 <= 0.72) ? 1.5 : -Math.abs(d0 - 0.56) * 4;
    if (fams[1]) { const d1 = fshare[fams[1]]; s += (d1 >= 0.18 && d1 <= 0.42) ? 1 : -0.5; }

    // 5. Zapatos, bolso y accesorios: repiten la paleta o ponen un acento
    let acentos = 0;
    pequenas.forEach(p => {
      const c = perfil(p.color);
      if (c.metal) { s += colores.every(x => perfil(x).t !== 'f') ? 0.3 : -0.2; return; }
      if (enGrande(p.color) || grandes.some(g => fam(g.color) === fam(p.color))) { s += 0.6; return; }
      if (c.n >= 0.7) { s += 0.2; return; }
      acentos++;
    });
    if (acentos === 1 && colores.length <= 2) { s += 0.8; motivos.push('acento'); }
    if (acentos > 1) s -= 1.5;

    // 6. Contraste entre claros y oscuros en las prendas grandes
    const L = grandes.map(p => perfil(p.color).l);
    const rango = L.length ? Math.max(...L) - Math.min(...L) : 0;
    s += rango >= 0.3 ? 1.2 : rango >= 0.15 ? 0.3 : -1;

    // 7. No abusar de negro, blanco o beige por defecto
    const basicos = ['negro', 'blanco', 'beige', 'crema', 'gris'];
    if (grandes.length && grandes.every(p => basicos.includes(p.color))) s -= 0.8;
    if (['negro', 'claro'].includes(fams[0]) && fshare[fams[0]] > 0.5) s -= 0.6;
    if ((fshare.negro || 0) > 0.75) s -= 1;
    if (grandes.some(p => !basicos.includes(p.color))) s += 0.5;

    // 8. Combinaciones actuales (moda femenina 16-25). Solo cuentan si el color pesa en el look
    let tendencia = '';
    const pesa = (...cs) => cs.some(c => peso(c) >= 0.15 && enGrande(c));
    const tierra = ['crema', 'beige', 'camel', 'marron', 'blanco', 'dorado'];
    if (pesa('marron', 'camel') && pesa('azul', 'vaquero')) { s += 1; tendencia = 'Marrón con azul: una combinación de temporada'; }
    else if (fams.length >= 1 && cols.length >= 2 && cols.every(c => tierra.includes(c)) && grandes.some(p => ['beige', 'camel', 'marron'].includes(p.color))) { s += 1.5; tendencia = 'Look tonal en tonos tierra, muy actual'; }
    else if ((pesa('vino', 'rojo') || pequenas.some(p => ['vino', 'rojo'].includes(p.color))) && colores.length === 1) { s += 1; tendencia = `Un toque ${cols.includes('rojo') ? 'rojo' : 'burdeos'} sobre una base neutra`; }
    else if (pesa('vaquero') && colores.length === 1) { s += 0.4; tendencia = 'Vaquero con un único color protagonista'; }

    let motivo = tendencia;
    if (!motivo && motivos.includes('análogos')) motivo = 'Colores vecinos que se funden bien';
    if (!motivo && motivos.includes('complementarios')) motivo = 'Colores complementarios equilibrados';
    if (!motivo && motivos.includes('acento')) motivo = 'Base equilibrada con un acento de color en los complementos';
    if (!motivo && rango >= 0.3) motivo = 'Buen contraste entre tonos claros y oscuros';
    if (!motivo) motivo = 'Paleta sencilla y coherente';
    return { puntos: s, motivo };
  }

  /* Papel de cada color: protagonista, apoyo y acento */
  function paleta(ps) {
    const share = reparto(ps);
    const cols = Object.keys(share).sort((a, b) => share[b] - share[a]);
    const grandes = new Set(ps.filter(p => !PEQUENAS.includes(p.tipo)).map(p => p.color));
    const acento = cols.find(c => !grandes.has(c) && (esColor(c) || perfil(c).metal)) || cols.slice(2).find(c => perfil(c).n < 0.8) || cols[2] || null;
    const out = [];
    if (cols[0]) out.push({ color: cols[0], papel: 'protagonista' });
    if (cols[1] && cols[1] !== acento) out.push({ color: cols[1], papel: 'apoyo' });
    if (acento && acento !== cols[0]) out.push({ color: acento, papel: 'acento' });
    return out;
  }

  /* Genera la mejor propuesta.
     prendas: [{id, tipo, color, temporada, usos, ultimo_uso}] · opciones: {temporada, hoy, dif, excluir} */
  function proponerOutfit(prendas, opciones = {}) {
    const t = opciones.temporada || 'entretiempo';
    const excluir = new Set(opciones.excluir || []);
    const disp = prendas.filter(p => !excluir.has(p.id));
    const vale = p => p.temporada === 'todo' || p.temporada === t || (t !== 'verano' && (p.temporada === 'invierno' || p.temporada === 'entretiempo'));
    const de = tipo => { const a = disp.filter(p => p.tipo === tipo && vale(p)); return a.length ? a : disp.filter(p => p.tipo === tipo); };
    const grupo = { arriba: de('arriba'), abajo: de('abajo'), vestido: de('vestido'), abrigo: de('abrigo'), calzado: de('calzado'), accesorio: de('accesorio') };
    const peso = p => 1 / (1 + (p.usos || 0)) * (p.recien ? 0.3 : 1);
    const azar = lista => {
      if (!lista.length) return null;
      const tot = lista.reduce((x, p) => x + peso(p), 0);
      let r = Math.random() * tot;
      for (const p of lista) { r -= peso(p); if (r <= 0) return p; }
      return lista[lista.length - 1];
    };
    const puedeDos = grupo.arriba.length && grupo.abajo.length;
    if (!puedeDos && !grupo.vestido.length) return Object.assign([], { analisis: null });

    const vistos = new Set(), candidatos = [];
    for (let i = 0; i < 350; i++) {
      const ps = [];
      const vestido = grupo.vestido.length && (!puedeDos || Math.random() < 0.3);
      if (vestido) ps.push(azar(grupo.vestido)); else { ps.push(azar(grupo.arriba)); ps.push(azar(grupo.abajo)); }
      if (t !== 'verano' && grupo.abrigo.length && (t === 'invierno' || Math.random() < 0.7)) ps.push(azar(grupo.abrigo));
      if (grupo.calzado.length) ps.push(azar(grupo.calzado));
      if (grupo.accesorio.length && Math.random() < 0.65) ps.push(azar(grupo.accesorio));
      const clave = ps.map(p => p.id).sort().join('|');
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const r = puntuar(ps);
      const uso = ps.reduce((x, p) => x + peso(p), 0) / ps.length;    // desempate: lo menos usado
      candidatos.push({ ps, total: r.puntos + uso * 0.6, motivo: r.motivo });
    }
    candidatos.sort((a, b) => b.total - a.total);
    const top = candidatos.slice(0, 5);
    const pesos = [5, 4, 3, 2, 1].slice(0, top.length);
    let r = Math.random() * pesos.reduce((x, y) => x + y, 0), k = 0;
    while (r > pesos[k]) { r -= pesos[k]; k++; }
    const elegido = top[k];
    const ids = elegido.ps.map(p => p.id);
    return Object.assign(ids, { analisis: { motivo: elegido.motivo, paleta: paleta(elegido.ps), puntos: elegido.total } });
  }

  const api = { PAL, NOMBRE, puntuar, paleta, proponerOutfit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.OCC_ESTILO = api;
})(typeof window !== 'undefined' ? window : globalThis);

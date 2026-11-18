/* =====================================================================
   OCCASIO · App web con cuentas reales (Supabase)
   ===================================================================== */
(() => {
'use strict';

const CFG = window.OCCASIO_CONFIG || {};
const { svgPrenda, icono, percha, COLORES, NOMBRE_COLOR } = window.OCC_IL;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- Fechas ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aFecha = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoy = () => iso(new Date());
const suma = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return iso(d); };
const dif = (a, b) => Math.round((aFecha(a) - aFecha(b)) / 864e5);
const lunes = s => suma(s, -((aFecha(s).getDay() + 6) % 7));
const fechaDe = ts => iso(new Date(ts));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAC = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const corta = s => { const d = aFecha(s); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const larga = s => { const d = aFecha(s); return `${DIA[d.getDay()]}, ${d.getDate()} de ${MESL[d.getMonth()]}`; };
const diaTxt = s => { const n = dif(s, hoy()); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : `el ${DIA[aFecha(s).getDay()]} ${aFecha(s).getDate()}`; };
const haceTxt = s => { const n = dif(hoy(), s); return n <= 0 ? 'Hoy' : n === 1 ? 'Ayer' : n < 60 ? `Hace ${n} días` : corta(s); };

/* ---------- Textos ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const vez = n => `${n} ${n === 1 ? 'vez' : 'veces'}`;
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'look';
const eur = n => Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const lista = arr => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];
const comillas = s => `«${s}»`;

const TIPOS = [['arriba', 'Parte de arriba'], ['abajo', 'Parte de abajo'], ['vestido', 'Vestido'], ['abrigo', 'Abrigo'], ['calzado', 'Calzado'], ['accesorio', 'Accesorio']];
const TIPO_TXT = Object.fromEntries(TIPOS);
const TIPO_FILTRO = { arriba: 'Arriba', abajo: 'Abajo', vestido: 'Vestidos', abrigo: 'Abrigos', calzado: 'Calzado', accesorio: 'Accesorios' };
const TEMPORADAS = [['invierno', 'Invierno'], ['verano', 'Verano'], ['entretiempo', 'Entretiempo'], ['todo', 'Todo el año']];
const TEMP_TXT = Object.fromEntries(TEMPORADAS);
const FORMA_TIPO = { arriba: 'camiseta', abajo: 'pantalon', vestido: 'vestido', abrigo: 'abrigo', calzado: 'zapatillas', accesorio: 'bolso' };
const FEM_TIPO = { arriba: 1, abajo: 1, vestido: 0, abrigo: 0, calzado: 0, accesorio: 0 };
const SLOTS = [['arriba', 'Arriba'], ['abajo', 'Abajo o vestido'], ['abrigo', 'Abrigo'], ['calzado', 'Calzado'], ['accesorio', 'Accesorio']];
const colorTxt = (c, fem) => (NOMBRE_COLOR[c] || [c, c])[fem ? 1 : 0];
const COLORES_AV = ['#6E4A33', '#3A2A26', '#8C7860', '#5C4A42', '#7A5A44'];

/* =====================================================================
   CONEXIÓN Y ESTADO
   ===================================================================== */
const configurado = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
const sb = configurado ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

let yo = null;               // usuaria con la sesión abierta
let canal = null;            // tiempo real
let ultimaCarga = 0;
const vacio = () => ({ perfil: null, amigas: [], amistades: [], prendas: [], looks: [], cal: {}, posts: [], reac: [], prestamos: [] });
let S = vacio();

const urlBase = () => CFG.urlPublica || (location.origin + location.pathname);
const UID = () => yo && yo.id;

async function q(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

function traducir(e) {
  const m = String((e && (e.message || e.error_description)) || e || '').toLowerCase();
  if (m.includes('invalid login')) return 'El correo o la contraseña no son correctos.';
  if (m.includes('email not confirmed')) return 'Antes de entrar, confirma tu cuenta con el enlace que te enviamos por correo.';
  if (m.includes('already registered')) return 'Ya hay una cuenta con ese correo. Prueba a entrar.';
  if (m.includes('password should') || m.includes('weak password')) return 'La contraseña tiene que tener al menos 8 caracteres.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'No hay conexión. Revisa tu internet y vuelve a probar.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Ese correo no parece válido.';
  if (m.includes('same password') || m.includes('different from the old')) return 'La nueva contraseña tiene que ser distinta de la anterior.';
  if (m.includes('payload too large') || m.includes('maximum allowed size')) return 'La foto es demasiado grande.';
  if (m.includes('row-level security')) return 'No tienes permiso para hacer eso.';
  return (e && e.message) ? e.message : 'Algo ha fallado. Vuelve a probar.';
}

/* ---------- Fotos privadas: enlaces firmados ---------- */
const URLS = new Map();
async function firmar(paths) {
  const ahora = Date.now();
  const faltan = [...new Set(paths.filter(p => p && !esCatalogo(p) && !((URLS.get(p) || {}).exp > ahora + 30 * 60e3)))];
  for (let i = 0; i < faltan.length; i += 100) {
    const trozo = faltan.slice(i, i + 100);
    const { data, error } = await sb.storage.from('fotos').createSignedUrls(trozo, 6 * 3600);
    if (error) { console.warn('fotos', error.message); continue; }
    (data || []).forEach(d => { if (d.signedUrl && d.path) URLS.set(d.path, { url: d.signedUrl, exp: ahora + 6 * 3600e3 }); });
  }
}
const esCatalogo = p => typeof p === 'string' && p.startsWith('catalogo/');
const urlFoto = p => esCatalogo(p) ? p : (p && URLS.get(p) ? URLS.get(p).url : '');

function leerFoto(file, lado = 720) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const t = Math.min(lado, s);
      const c = document.createElement('canvas');
      c.width = c.height = t;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, t, t);
      URL.revokeObjectURL(url);
      const src = c.toDataURL('image/jpeg', 0.82);
      c.toBlob(blob => blob ? res({ src, blob }) : rej(new Error('foto')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se ha podido leer la foto.')); };
    img.src = url;
  });
}
async function subirFoto(blob, prefijo = '') {
  const path = `${UID()}/${prefijo}${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/* ---------- Carga de datos ---------- */
async function cargarTodo() {
  const [perfiles, amistades, prendas, looks, cal, posts, prestamos] = await Promise.all([
    q(sb.from('perfiles').select('*')),
    q(sb.from('amistades').select('*')),
    q(sb.from('prendas').select('*').order('creado', { ascending: false })),
    q(sb.from('looks').select('*').order('creado', { ascending: false })),
    q(sb.from('calendario').select('*')),
    q(sb.from('publicaciones').select('*').order('creado', { ascending: false }).limit(80)),
    q(sb.from('prestamos').select('*').order('creado', { ascending: false }))
  ]);
  const ids = new Set(amistades.map(x => x.a === UID() ? x.b : x.a));
  S.perfil = perfiles.find(p => p.id === UID()) || { id: UID(), nombre: '', foto_path: null, codigo: '' };
  S.amigas = perfiles.filter(p => ids.has(p.id)).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  S.amistades = amistades;
  S.prendas = prendas;
  S.looks = looks;
  S.cal = Object.fromEntries(cal.map(c => [c.fecha, c]));
  S.posts = posts;
  S.prestamos = prestamos;
  S.reac = posts.length ? await q(sb.from('reacciones').select('*').in('publicacion', posts.map(p => p.id))) : [];
  await firmar([...prendas.map(p => p.foto_path), ...perfiles.map(p => p.foto_path)]);
  S.admin = await sb.rpc('soy_admin').then(r => r.data === true, () => false);
  ultimaCarga = Date.now();
}
async function recargar(silencio) {
  try { await cargarTodo(); refrescar(); }
  catch (e) { if (!silencio) aviso(traducir(e)); }
}

/* ---------- Consultas ---------- */
const P = id => S.prendas.find(p => p.id === id);
const Lk = id => S.looks.find(l => l.id === id);
const esMia = p => p && p.duena === UID();
const amigaDe = id => S.amigas.find(a => a.id === id);
const nombre = id => id === UID() ? ((S.perfil && S.perfil.nombre) || 'Tú') : ((amigaDe(id) || {}).nombre || 'Una amiga');
const prestA = (p, est) => S.prestamos.find(x => x.prenda === p.id && x.a === UID() && est.includes(x.estado));
const tengo = p => !esMia(p) && prestA(p, ['aceptada']);
const pedida = p => !esMia(p) && prestA(p, ['pendiente']);
const prestadaA = p => esMia(p) && S.prestamos.find(x => x.prenda === p.id && x.de === UID() && x.estado === 'aceptada');
const misPrendas = () => S.prendas.filter(esMia);
const miArmario = () => S.prendas.filter(p => esMia(p) || tengo(p));
const deAmigas = () => S.prendas.filter(p => !esMia(p) && amigaDe(p.duena));
const misLooks = () => S.looks.filter(l => l.duena === UID());
const pendientesParaMi = () => S.prestamos.filter(x => x.de === UID() && x.estado === 'pendiente' && P(x.prenda));
const diasSin = p => p.ultimo_uso ? dif(hoy(), p.ultimo_uso) : 9999;
const sinUsar = p => diasSin(p) > 30;
const visibles = ids => (ids || []).map(P).filter(Boolean);
const principal = ids => { const ps = visibles(ids); const p = ps.find(x => x.tipo === 'vestido') || ps.find(x => x.tipo === 'arriba') || ps.find(x => x.tipo === 'abajo'); return p ? p.id : null; };
const reaccionesDe = id => S.reac.filter(r => r.publicacion === id);

/* =====================================================================
   PIEZAS DE INTERFAZ
   ===================================================================== */
const colorAv = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return COLORES_AV[Math.abs(h) % COLORES_AV.length]; };
function avatar(id, cls = '') {
  const per = id === UID() ? S.perfil : amigaDe(id);
  const n = ((per && per.nombre) || (id === UID() ? 'Tú' : '?')).trim() || '?';
  const f = per && urlFoto(per.foto_path);
  return `<span class="av ${cls}" style="background:${id === UID() ? 'var(--cafe)' : colorAv(id)}" aria-hidden="true">${f ? `<img src="${esc(f)}" alt="">` : esc(n[0].toUpperCase())}</span>`;
}
function sticker(p, o = {}) {
  const f = urlFoto(p.foto_path);
  const media = f ? `<img ${esCatalogo(p.foto_path) ? 'class="entera" ' : ''}src="${esc(f)}" alt="${esc(p.nombre)}" loading="lazy">` : svgPrenda(FORMA_TIPO[p.tipo], p.color, null, p.nombre);
  const badge = o.duena && p.duena !== (o.autora || UID()) ? `<span class="duena">${avatar(p.duena, 's')}</span>` : '';
  return `<span class="st">${media}${o.extra || ''}${badge}</span>`;
}
const giro = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 9) - 4); };
function collage(ids, o = {}) {
  const ps = visibles(ids);
  if (!ps.length) return `<div class="collage vacio">${o.vacio || 'Sin prendas'}</div>`;
  const de = t => ps.filter(p => p.tipo === t);
  const [arr] = de('arriba'), [aba] = de('abajo'), [ves] = de('vestido'), [abr] = de('abrigo'), [cal] = de('calzado'), acc = de('accesorio');
  const pos = [];
  if (ves) pos.push([ves, 'left:8%;top:4%;width:42%']);
  else {
    if (arr) pos.push([arr, 'left:8%;top:2%;width:35%']);
    if (aba) pos.push([aba, 'left:11%;top:43%;width:31%']);
  }
  if (abr) pos.push([abr, 'left:46%;top:3%;width:32%']);
  if (cal) pos.push([cal, 'left:47%;top:57%;width:23%']);
  acc.slice(0, 2).forEach((a, i) => pos.push([a, i ? 'left:76%;top:62%;width:20%' : abr ? 'left:74%;top:30%;width:23%' : 'left:62%;top:12%;width:27%']));
  return `<div class="collage">${pos.map(([p, s]) => `<div class="ci" style="${s};transform:rotate(${giro(p.id)}deg)">${sticker(p, { duena: o.duena, autora: o.autora })}</div>`).join('')}</div>`;
}
const ventana = (archivo, cuerpo) =>
  `<div class="ventana"><div class="v-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(archivo)}</span></div>${cuerpo}</div>`;
const cabecera = (der = '') =>
  `<header class="top"><div class="logo">${percha(30, 9)}<b>occasio</b></div><div class="der">${der}</div></header>`;
const hojaCab = (eti, tit, voz = true) =>
  `<div class="hoja-cab"><div>${eti ? `<p class="eti">${eti}</p>` : ''}<h2 class="tit ${voz ? 'voz' : ''}">${tit}</h2></div><button class="ib" data-a="cerrar" aria-label="Cerrar">${icono('cerrar')}</button></div>`;
function campana() {
  const n = pendientesParaMi().length;
  return `<button class="ib borde campana" data-a="peticiones" aria-label="Préstamos${n ? `: ${n} ${n === 1 ? 'petición' : 'peticiones'} sin responder` : ''}">${icono('sobre', 21)}${n ? `<span class="num">${n}</span>` : ''}</button>`;
}

/* ---------- Capas ---------- */
function abrir(tipo, pinta, opts = {}) {
  const el = document.createElement('div');
  el.className = 'capa';
  el.innerHTML = tipo === 'hoja'
    ? `<div class="velo" data-a="cerrar"></div><section class="hoja" role="dialog" aria-modal="true" aria-label="${esc(opts.titulo || '')}" tabindex="-1"><div class="asa" aria-hidden="true"></div><div class="cuerpo"></div></section>`
    : tipo === 'zoom'
    ? `<div class="velo" data-a="cerrar"></div><section class="zoom" role="dialog" aria-modal="true" aria-label="${esc(opts.titulo || '')}" tabindex="-1"><div class="cuerpo"></div></section>`
    : `<section class="pag" role="dialog" aria-modal="true" aria-label="${esc(opts.titulo || '')}" tabindex="-1"><div class="cuerpo"></div></section>`;
  Object.assign(el, opts.props || {});
  const cuerpo = $('.cuerpo', el);
  el._pinta = forzar => {
    const a = document.activeElement;
    if (!forzar && a && el.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /text|number|date|search|email|password/.test(a.type)))) return;
    cuerpo.innerHTML = pinta(el);
  };
  el._pinta(true);
  $('#capas').appendChild(el);
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(() => { const s = $('section', el); s && s.focus({ preventScroll: true }); }, 60);
  return el;
}
function cerrar(el) {
  el = el || $('#capas').lastElementChild;
  if (!el || el.classList.contains('sale')) return;
  el.classList.remove('on'); el.classList.add('sale');
  setTimeout(() => el.remove(), 280);
  render();
}
const cerrarTodas = () => $$('#capas .capa').forEach(el => el.remove());
const repinta = el => el && el.isConnected && el._pinta && el._pinta(true);
function refrescar() {
  if (!yo) return;
  render();
  $$('#capas .capa').forEach(el => el._pinta && el._pinta(false));
}

/* ---------- Avisos ---------- */
let avisoT, notiT;
function aviso(txt) {
  const a = $('#aviso');
  a.textContent = txt; a.classList.add('on');
  clearTimeout(avisoT);
  avisoT = setTimeout(() => a.classList.remove('on'), 3200);
}
function notificar(txt, sub = 'ahora') {
  const n = $('#noti');
  n.innerHTML = `<span class="ic">${percha(22, 10)}</span><div><small>Occasio · ${esc(sub)}</small><p>${esc(txt)}</p></div>`;
  n.classList.add('on');
  clearTimeout(notiT);
  notiT = setTimeout(() => n.classList.remove('on'), 4500);
}
function carga(txt) { $('#carga-txt').textContent = txt || 'Cargando…'; $('#carga').classList.remove('fuera'); }
const sinCarga = () => $('#carga').classList.add('fuera');

/* Ejecuta una acción con el botón en estado «cargando» y muestra el error si lo hay */
async function intenta(b, fn) {
  if (b) { b.setAttribute('aria-busy', 'true'); b.disabled = true; }
  try { return await fn(); }
  catch (e) { console.warn(e); aviso(traducir(e)); return undefined; }
  finally { if (b && b.isConnected) { b.removeAttribute('aria-busy'); b.disabled = false; } }
}

/* =====================================================================
   ACCESO: crear cuenta, entrar, recuperar contraseña
   ===================================================================== */
let modoAcceso = 'inicio', correoPendiente = '', recuperando = false;
function mostrarAcceso(modo = 'inicio') {
  modoAcceso = modo;
  let el = $('#acceso');
  if (!el) { el = document.createElement('section'); el.className = 'acceso'; el.id = 'acceso'; $('#app').insertBefore(el, $('#capas')); }
  const priv = `<a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a>`;
  const vistas = {
    inicio: () => `<div class="bienv">${percha(110, 7)}<p class="marca">occasio</p><h1 class="tit voz">Tu armario, mil looks</h1><p>Tu ropa en el móvil, el armario de tus amigas y tus looks en el calendario.</p></div>
      <button class="btn pri ancho grande" data-a="acc" data-m="registro">Crear cuenta</button>
      <button class="btn sec ancho grande" data-a="acc" data-m="entrar">Ya tengo cuenta</button>`,
    registro: () => `<button class="ib" data-a="acc" data-m="inicio" aria-label="Atrás">${icono('atras')}</button>
      <h1 class="tit voz">Crea tu cuenta</h1>
      <form data-form="registro" novalidate>
        <label class="campo"><span>Tu nombre</span><input class="inp" name="nombre" autocomplete="given-name" maxlength="40" required></label>
        <label class="campo"><span>Correo</span><input class="inp" name="correo" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required></label>
        <label class="campo"><span>Contraseña (mínimo 8 caracteres)</span><input class="inp" name="clave" type="password" autocomplete="new-password" minlength="8" required></label>
        <label class="chk"><input type="checkbox" name="ok"><span>Tengo 14 años o más y acepto la ${priv}</span></label>
        <label class="chk" style="margin-top:-6px"><input type="checkbox" name="novedades"><span>Quiero recibir novedades de Occasio por correo (opcional)</span></label>
        <p class="error" role="alert"></p>
        <button class="btn pri ancho grande" type="submit">Crear cuenta</button>
      </form>
      <button class="lnk centro" data-a="acc" data-m="entrar" style="justify-content:center">Ya tengo cuenta</button>`,
    entrar: () => `<button class="ib" data-a="acc" data-m="inicio" aria-label="Atrás">${icono('atras')}</button>
      <h1 class="tit voz">Entra en tu armario</h1>
      <form data-form="entrar" novalidate>
        <label class="campo"><span>Correo</span><input class="inp" name="correo" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(correoPendiente)}" required></label>
        <label class="campo"><span>Contraseña</span><input class="inp" name="clave" type="password" autocomplete="current-password" required></label>
        <p class="error" role="alert"></p>
        <button class="btn pri ancho grande" type="submit">Entrar</button>
      </form>
      <button class="lnk" data-a="acc" data-m="olvido" style="justify-content:center">He olvidado mi contraseña</button>
      <button class="lnk" data-a="acc" data-m="registro" style="justify-content:center">Crear una cuenta</button>`,
    olvido: () => `<button class="ib" data-a="acc" data-m="entrar" aria-label="Atrás">${icono('atras')}</button>
      <h1 class="tit voz">¿Has olvidado tu contraseña?</h1>
      <p class="sub" style="margin:-4px 0 14px">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>
      <form data-form="olvido" novalidate>
        <label class="campo"><span>Correo</span><input class="inp" name="correo" type="email" inputmode="email" autocomplete="email" autocapitalize="off" value="${esc(correoPendiente)}" required></label>
        <p class="error" role="alert"></p>
        <button class="btn pri ancho grande" type="submit">Enviar enlace</button>
      </form>`,
    enviado: () => `<div class="mensaje"><span class="voz">Revisa tu correo</span><p>Si hay una cuenta con <b>${esc(correoPendiente)}</b>, te hemos enviado un enlace para crear una contraseña nueva.</p></div>
      <button class="btn sec ancho" data-a="acc" data-m="entrar">Volver a entrar</button>`,
    confirma: () => `<div class="mensaje"><span class="voz">Ya casi está</span><p>Te hemos enviado un correo a <b>${esc(correoPendiente)}</b>. Abre el enlace para confirmar tu cuenta y vuelve aquí para entrar.</p><p class="sub">Si no lo ves en unos minutos, mira en la carpeta de spam.</p></div>
      <button class="btn sec ancho" data-a="acc" data-m="entrar">Ya la he confirmado: entrar</button>`,
    'nueva-clave': () => `<h1 class="tit voz">Crea una contraseña nueva</h1>
      <form data-form="nueva-clave" novalidate>
        <label class="campo"><span>Nueva contraseña (mínimo 8 caracteres)</span><input class="inp" name="clave" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="error" role="alert"></p>
        <button class="btn pri ancho grande" type="submit">Guardar contraseña</button>
      </form>`,
    'sin-config': () => `<div class="bienv">${percha(90, 7)}<p class="marca">occasio</p></div>
      <div class="mensaje"><span class="voz">Falta conectar la base de datos</span><p>Abre <b>config.js</b> y escribe la dirección y la clave pública de tu proyecto de Supabase. Los pasos están en README.md.</p></div>`
  };
  el.innerHTML = `<div class="acceso-in">${vistas[modo]()}</div>`;
  const primero = $('input', el); if (primero && modo !== 'inicio') setTimeout(() => primero.focus(), 50);
}
const quitarAcceso = () => { const el = $('#acceso'); if (el) el.remove(); };

const FORMS = {
  registro: async f => {
    const nom = f.nombre.value.trim(), correo = f.correo.value.trim(), clave = f.clave.value;
    if (!nom) return errorForm(f, 'Escribe tu nombre.', f.nombre);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return errorForm(f, 'Ese correo no parece válido.', f.correo);
    if (clave.length < 8) return errorForm(f, 'La contraseña tiene que tener al menos 8 caracteres.', f.clave);
    if (!f.ok.checked) return errorForm(f, 'Para crear la cuenta tienes que tener 14 años o más y aceptar la política de privacidad.', f.ok);
    const inv = leerInvitacion();
    const { data, error } = await sb.auth.signUp({
      email: correo, password: clave,
      options: { data: { nombre: nom, mayor_14: true, acepta_privacidad: new Date().toISOString(), acepta_novedades: !!f.novedades.checked }, emailRedirectTo: urlBase() + (inv ? '?invita=' + encodeURIComponent(inv) : '') }
    });
    if (error) return errorForm(f, traducir(error));
    correoPendiente = correo;
    if (!data.session) mostrarAcceso('confirma');
  },
  entrar: async f => {
    const correo = f.correo.value.trim(), clave = f.clave.value;
    if (!correo || !clave) return errorForm(f, 'Escribe tu correo y tu contraseña.');
    correoPendiente = correo;
    const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
    if (error) return errorForm(f, traducir(error));
  },
  olvido: async f => {
    const correo = f.correo.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return errorForm(f, 'Ese correo no parece válido.', f.correo);
    const { error } = await sb.auth.resetPasswordForEmail(correo, { redirectTo: urlBase() });
    if (error) return errorForm(f, traducir(error));
    correoPendiente = correo;
    mostrarAcceso('enviado');
  },
  'nueva-clave': async f => {
    if (f.clave.value.length < 8) return errorForm(f, 'La contraseña tiene que tener al menos 8 caracteres.', f.clave);
    const { data, error } = await sb.auth.updateUser({ password: f.clave.value });
    if (error) return errorForm(f, traducir(error));
    recuperando = false;
    aviso('Contraseña cambiada');
    history.replaceState(null, '', location.pathname + location.search);
    if (yo && data && data.user && yo.id === data.user.id) { quitarAcceso(); render(); }
    else if (data && data.user) entrar(data.user);
  }
};
function errorForm(f, msg, campo) {
  $('.error', f).textContent = msg;
  if (campo) campo.focus();
}

/* ---------- Sesión ---------- */
let entrandoId = null;
async function entrar(user) {
  if (!user || entrandoId === user.id) return;
  entrandoId = user.id;
  yo = user;
  carga('Abriendo tu armario…');
  try {
    await sb.rpc('procesar_dias', { p_hoy: hoy() });
    await cargarTodo();
  } catch (e) {
    console.warn(e);
    sinCarga();
    entrandoId = null;
    aviso(traducir(e));
    return;
  }
  quitarAcceso();
  tab = 'hoy'; ui = uiInicial(); propHoy = null; ultimaTab = null;
  render();
  sinCarga();
  escuchar();
  let visto = null;
  try { visto = localStorage.getItem('occasio_bienvenida_' + UID()); } catch (_) { visto = '1'; }
  if (!visto && !misPrendas().length) mostrarBienvenida();
  else revisarInvitacion();
}
function salir() {
  if (canal) { sb.removeChannel(canal); canal = null; }
  yo = null; entrandoId = null; S = vacio(); URLS.clear();
  cerrarTodas();
  const onb = $('#onb'); if (onb) onb.remove();
  $('#vista').innerHTML = '';
  sinCarga();
  mostrarAcceso('inicio');
}

/* ---------- Tiempo real ---------- */
function escuchar() {
  if (canal) sb.removeChannel(canal);
  canal = sb.channel('occasio-' + UID())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, alCambioPrestamo)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'publicaciones' }, pl => {
      if (pl.new && pl.new.autora !== UID() && !S.posts.some(p => p.id === pl.new.id)) recargar(true);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'amistades' }, async pl => {
      const antes = new Set(S.amigas.map(a => a.id));
      await recargar(true);
      const nueva = S.amigas.find(a => !antes.has(a.id));
      if (nueva && pl.eventType === 'INSERT') notificar(`${nueva.nombre || 'Una amiga'} ya está en tus amigas`, 'nueva amiga');
    })
    .subscribe();
}
async function alCambioPrestamo(pl) {
  const n = pl.new;
  if (!n || !n.id) { recargar(true); return; }
  const i = S.prestamos.findIndex(x => x.id === n.id);
  const antes = i >= 0 ? S.prestamos[i] : null;
  if (i >= 0) S.prestamos[i] = n; else S.prestamos.unshift(n);
  if (!P(n.prenda)) { await recargar(true); }
  const p = P(n.prenda), nomP = p ? comillas(p.nombre) : 'una prenda';
  if (pl.eventType === 'INSERT' && n.de === UID()) notificar(`${nombre(n.a)} quiere que le prestes ${nomP}`, 'nueva petición');
  if (pl.eventType === 'UPDATE' && n.a === UID() && (!antes || antes.estado !== n.estado)) {
    if (n.estado === 'aceptada') notificar(`${nombre(n.de)} te presta ${nomP} 💌`, 'préstamo aceptado');
    if (n.estado === 'rechazada') notificar(`${nombre(n.de)} no puede prestarte ${nomP} esta vez`, 'préstamo');
  }
  if (pl.eventType === 'UPDATE' && n.de === UID() && n.estado === 'cancelada' && antes && antes.estado === 'pendiente')
    notificar(`${nombre(n.a)} ha cancelado su petición`, 'préstamo');
  refrescar();
}

/* ---------- Invitaciones ---------- */
const CLAVE_INV = 'occasio_invitacion';
function leerInvitacion() { try { return localStorage.getItem(CLAVE_INV) || ''; } catch (_) { return ''; } }
function borrarInvitacion() { try { localStorage.removeItem(CLAVE_INV); } catch (_) { /* nada */ } }
function guardarInvitacionDeURL() {
  const u = new URL(location.href);
  const c = u.searchParams.get('invita');
  if (!c) return;
  try { localStorage.setItem(CLAVE_INV, c.slice(0, 40)); } catch (_) { /* nada */ }
  u.searchParams.delete('invita');
  history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
}
const enlaceInvitacion = () => `${urlBase()}?invita=${encodeURIComponent((S.perfil && S.perfil.codigo) || '')}`;
async function revisarInvitacion() {
  const c = leerInvitacion();
  if (!c || !yo) return;
  if (S.perfil && c === S.perfil.codigo) { borrarInvitacion(); return; }
  const { data, error } = await sb.rpc('perfil_por_codigo', { p_codigo: c });
  const inv = data && data[0];
  if (error || !inv) { borrarInvitacion(); aviso('Ese enlace de invitación no es válido.'); return; }
  if (amigaDe(inv.id)) { borrarInvitacion(); return; }
  abrir('hoja', () => hojaCab('Invitación', `${esc(inv.nombre || 'Una amiga')} te ha invitado`) +
    `<p style="margin:-4px 0 18px">¿Os hacéis amigas en Occasio? Podréis ver vuestros armarios, pediros ropa prestada y ver los looks que publiquéis.</p>
    <div class="acciones"><button class="btn sec" data-a="inv-no">Ahora no</button><button class="btn pri" data-a="inv-si" data-c="${esc(c)}">Aceptar</button></div>`,
    { titulo: 'Invitación' });
}
async function invitar() {
  if (!S.perfil || !S.perfil.codigo) return aviso('Todavía no se ha creado tu enlace. Vuelve a probar en un momento.');
  const url = enlaceInvitacion();
  const texto = `${nombre(UID())} te invita a Occasio: tu armario, el suyo y el de vuestras amigas en el móvil.`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Occasio', text: texto, url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  copiarTexto(`${texto} ${url}`, 'Invitación copiada. Pégala en el chat de tus amigas.');
}
async function copiarTexto(txt, msg) {
  try { await navigator.clipboard.writeText(txt); aviso(msg); return; } catch (_) { /* sigue */ }
  const t = document.createElement('textarea');
  t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.appendChild(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  t.remove();
  if (ok) { aviso(msg); return; }
  // Si el navegador no deja copiar, se enseña el texto para copiarlo a mano
  abrir('hoja', () => hojaCab('', 'Copia tu enlace', false) +
    `<p class="sub" style="margin:-4px 0 12px">Mantén pulsado el texto, cópialo y pégalo en el chat de tus amigas.</p>
    <textarea class="area" readonly style="min-height:110px" onfocus="this.select()">${esc(txt)}</textarea>`, { titulo: 'Copia tu enlace' });
}

/* =====================================================================
   PANTALLAS
   ===================================================================== */
let tab = 'hoy';
const uiInicial = () => ({ modo: 'mio', amiga: 'todas', tipo: 'todo', color: null, temp: null, sinUsar: false, cal: 'semana', semana: 0, mes: 0, perfil: 'publicados' });
let ui = uiInicial();
let propHoy = null;

const tarjetaVacia = (tit, txt, boton) => `<div class="vacia"><span class="voz">${tit}</span><p>${txt}</p>${boton || ''}</div>`;
const invitarCard = () => tarjetaVacia('Invita a tus amigas', 'Lo que no tienes, quizá lo tiene tu amiga. Invítalas para ver sus armarios y pediros ropa.',
  `<button class="btn pri" data-a="invitar">${icono('compartir', 19)} Invitar a mis amigas</button>`);

/* ---------- Hoy ---------- */
function pHoy() {
  const h = hoy(), e = S.cal[h], l = e && e.look && Lk(e.look);
  let tarjeta;
  if (l) {
    tarjeta = ventana(slug(l.nombre) + '.jpg', collage(l.prendas, { duena: true })) +
      `<div class="tl-pie" style="padding:12px 2px 0"><div><p class="eti">Planeado para hoy</p><p class="tl-nom voz">${esc(l.nombre)}</p>${e.plan ? `<p class="tl-plan">${esc(e.plan)}</p>` : ''}</div><button class="btn sec peq" data-a="dia" data-f="${h}">Cambiar</button></div>`;
  } else if (!misPrendas().length) {
    tarjeta = tarjetaVacia('Tu armario está vacío', 'Sube fotos de tu ropa o empieza marcando los básicos que tienes, y te propondremos looks con lo que ya tienes.',
      `<button class="btn pri" data-a="opc-anadir">${icono('camara', 19)} Añadir prendas</button><button class="btn sec" data-a="catalogo">${icono('armario', 19)} Elegir del catálogo de básicos</button>`);
  } else {
    if (!propHoy || propHoy.some(id => !P(id))) propHoy = proponer();
    tarjeta = propHoy.length < 2
      ? tarjetaVacia('Faltan prendas para proponerte un look', 'Añade al menos una parte de arriba y una de abajo, o un vestido.', `<button class="btn sec" data-a="opc-anadir">Añadir prendas</button>`)
      : ventana('propuesta_de_hoy.jpg', collage(propHoy, { duena: true })) +
        `<p class="nota">${icono('chispa', 16)} Con prendas que hace tiempo que no te pones</p>
         <div class="acciones"><button class="btn pri" data-a="ponermelo">Ponérmelo</button><button class="btn sec" data-a="otra-hoy">${icono('otra', 18)} Otra combinación</button></div>`;
  }
  const resc = misPrendas().filter(p => sinUsar(p) && !prestadaA(p)).sort((a, b) => diasSin(b) - diasSin(a)).slice(0, 10);
  return cabecera(campana() + `<button class="ib borde" data-a="tab" data-t="perfil" aria-label="Tu perfil">${avatar(UID(), 's')}</button>`) +
  `<div class="pant">
    <div class="cab"><p class="eti">${larga(h)}</p><h1 class="tit voz">Hoy, con lo que ya tienes</h1></div>
    ${tarjeta}
    ${resc.length ? `<div class="sec-t"><div><h2>Rescata del armario</h2><p>Prendas que hace tiempo que no te pones</p></div></div>
      <div class="rescata">${resc.map(p => `<button class="pr" data-a="prenda" data-id="${p.id}">${sticker(p)}<span class="pr-nom">${esc(p.nombre)}</span><span class="pr-sub">${p.ultimo_uso ? haceTxt(p.ultimo_uso) : 'Sin estrenar'}</span></button>`).join('')}</div>` : ''}
    <div class="sec-t" id="feed"><div><h2>Looks del grupo</h2><p>Lo que os ponéis y de quién es cada prenda</p></div></div>
    ${S.amigas.length ? '' : invitarCard()}
    ${S.posts.map(pPost).join('') || (S.amigas.length ? '<p class="vacio-txt">Cuando tus amigas publiquen looks, aparecerán aquí.</p>' : '')}
  </div>`;
}
function accionPedir(p) {
  if (esMia(p)) return prestadaA(p) ? `<span class="etq-est">Prestada</span>` : '';
  if (!amigaDe(p.duena)) return '';
  if (tengo(p)) return `<span class="etq-est">La tienes</span>`;
  if (pedida(p)) return `<span class="etq-est">Pedida</span>`;
  return `<button class="btn mini pri" data-a="pedir" data-id="${p.id}" aria-label="Pedir prestada: ${esc(p.nombre)}, de ${esc(nombre(p.duena))}">Pedir</button>`;
}
const deQuien = p => esMia(p) ? 'de tu armario' : `de ${esc(nombre(p.duena))}`;
function pPost(f) {
  const l = Lk(f.look); if (!l) return '';
  const ps = visibles(l.prendas);
  const rs = reaccionesDe(f.id);
  return `<article class="post" aria-label="Look de ${esc(nombre(f.autora))}">
    <div class="post-cab">${avatar(f.autora)}<div><b>${esc(nombre(f.autora))}</b><span>${haceTxt(fechaDe(f.creado))}</span></div>
      ${f.autora === UID() ? `<button class="lnk" data-a="post-borrar" data-id="${f.id}" style="margin-left:auto">Borrar</button>` : ''}</div>
    ${ventana(slug(l.nombre) + '.jpg', collage(l.prendas, { duena: true, autora: f.autora }))}
    ${f.texto ? `<p class="post-txt">${esc(f.texto)}</p>` : ''}
    <ul class="etqs">${ps.map(p => `<li class="etq"><button class="etq-btn" data-a="prenda" data-id="${p.id}">${sticker(p)}<p><b>${esc(p.nombre)}</b> · ${deQuien(p)}</p></button>${accionPedir(p)}</li>`).join('')}</ul>
    <div class="reac">${['❤️', '🔥', '✨'].map(em => {
      const mia = rs.some(r => r.usuaria === UID() && r.emoji === em), total = rs.filter(r => r.emoji === em).length;
      return `<button data-a="reac" data-id="${f.id}" data-em="${em}" aria-pressed="${mia}" aria-label="Reaccionar con ${em}. ${total}">${em} <span>${total}</span></button>`;
    }).join('')}</div>
  </article>`;
}

/* ---------- Armario ---------- */
function filtrar(lst) {
  return lst.filter(p =>
    (ui.tipo === 'todo' || p.tipo === ui.tipo) &&
    (!ui.color || p.color === ui.color) &&
    (!ui.temp || p.temporada === ui.temp || p.temporada === 'todo') &&
    (!ui.sinUsar || sinUsar(p)));
}
function tile(p, modo) {
  let cinta = '';
  if (tengo(p)) cinta = `<span class="cinta">Prestada por ${esc(nombre(p.duena))}</span>`;
  else if (prestadaA(p)) cinta = `<span class="cinta">Prestada a ${esc(nombre(prestadaA(p).a))}</span>`;
  const sub = modo === 'amigas' ? `De ${esc(nombre(p.duena))}${pedida(p) ? ' · pedida' : ''}`
    : !esMia(p) ? `De ${esc(nombre(p.duena))}` : `Usada ${vez(p.usos)}`;
  return `<button class="pr" data-a="prenda" data-id="${p.id}">${sticker(p, { extra: cinta, duena: modo === 'amigas' })}<span class="pr-nom">${esc(p.nombre)}</span><span class="pr-sub">${sub}</span></button>`;
}
function pArmario() {
  const mio = ui.modo === 'mio';
  if (!mio && ui.amiga !== 'todas' && !amigaDe(ui.amiga)) ui.amiga = 'todas';
  const base = mio ? miArmario() : deAmigas().filter(p => ui.amiga === 'todas' || p.duena === ui.amiga);
  const lst = filtrar(base);
  const colorBtn = ui.color ? `<span class="pt" style="background:${COLORES[ui.color]}"></span>${cap(colorTxt(ui.color))}` : 'Color';
  let cuerpo;
  if (!mio && !S.amigas.length) cuerpo = invitarCard();
  else if (mio && !base.length) cuerpo = tarjetaVacia('Tu armario está vacío', 'Haz fotos a tu ropa o elígelas de la galería. También puedes empezar marcando los básicos que tienes.', `<button class="btn pri" data-a="opc-anadir">${icono('camara', 19)} Añadir prendas</button><button class="btn sec" data-a="catalogo">${icono('armario', 19)} Elegir del catálogo de básicos</button>`);
  else if (!lst.length) cuerpo = `<div class="vacio-txt"><span class="voz">Nada por aquí</span>${base.length ? 'Prueba con otros filtros.' : 'Tus amigas todavía no han subido prendas.'}</div>`;
  else cuerpo = `<div class="rejilla">${lst.map(p => tile(p, ui.modo)).join('')}</div>`;
  return cabecera() + `<div class="pant ancha">
    <div class="cab"><p class="eti">${lst.length} ${lst.length === 1 ? 'prenda' : 'prendas'}</p><h1 class="tit voz">${mio ? 'Tu armario' : 'Armario de amigas'}</h1></div>
    <div class="seg" role="group" aria-label="Qué armario ver"><button data-a="arm-modo" data-v="mio" aria-pressed="${mio}">Mi armario</button><button data-a="arm-modo" data-v="amigas" aria-pressed="${!mio}">Armario de amigas</button></div>
    ${mio || !S.amigas.length ? '' : `<div class="avf" role="group" aria-label="Filtrar por amiga">
      <button data-a="arm-amiga" data-v="todas" aria-pressed="${ui.amiga === 'todas'}"><span class="av todas" aria-hidden="true">${icono('armario', 22)}</span>Todas</button>
      ${S.amigas.map(a => `<button data-a="arm-amiga" data-v="${a.id}" aria-pressed="${ui.amiga === a.id}">${avatar(a.id)}${esc(a.nombre || 'Amiga')}</button>`).join('')}</div>`}
    ${base.length ? `<div class="filtros">
      <div class="fila-x" role="group" aria-label="Tipo de prenda"><button class="chip" data-a="arm-tipo" data-v="todo" aria-pressed="${ui.tipo === 'todo'}">Todo</button>${Object.entries(TIPO_FILTRO).map(([k, t]) => `<button class="chip" data-a="arm-tipo" data-v="${k}" aria-pressed="${ui.tipo === k}">${t}</button>`).join('')}</div>
      <div class="fila-x" role="group" aria-label="Más filtros">
        <button class="chip" data-a="arm-color" aria-pressed="${!!ui.color}">${colorBtn}</button>
        <button class="chip" data-a="arm-temp" aria-pressed="${!!ui.temp}">${ui.temp ? TEMP_TXT[ui.temp] : 'Temporada'}</button>
        <button class="chip" data-a="arm-sin" aria-pressed="${ui.sinUsar}">Sin usar en 30 días</button>
        ${(ui.color || ui.temp || ui.sinUsar || ui.tipo !== 'todo') ? `<button class="chip" data-a="arm-limpiar">Quitar filtros</button>` : ''}
      </div></div>` : ''}
    ${cuerpo}
  </div>`;
}

/* ---------- Calendario ---------- */
function pCalendario() {
  const h = hoy();
  let cuerpo;
  if (ui.cal === 'semana') {
    const ini = suma(lunes(h), ui.semana * 7), fin = suma(ini, 6);
    const rango = aFecha(ini).getMonth() === aFecha(fin).getMonth() ? `${aFecha(ini).getDate()} – ${corta(fin)}` : `${corta(ini)} – ${corta(fin)}`;
    cuerpo = `<div class="semana-nav"><button class="ib" data-a="sem" data-d="-1" aria-label="Semana anterior">${icono('izq')}</button>
      <div style="text-align:center"><b>${rango}</b>${ui.semana ? `<br><button class="lnk" data-a="cal-hoy" style="min-height:32px">Volver a esta semana</button>` : ''}</div>
      <button class="ib" data-a="sem" data-d="1" aria-label="Semana siguiente">${icono('der')}</button></div>
      ${[...Array(7)].map((_, i) => suma(ini, i)).map(f => {
        const e = S.cal[f], l = e && e.look && Lk(e.look), d = aFecha(f);
        const det = e && e.plan ? esc(e.plan) : f === h ? 'Hoy' : f < h ? '' : 'Toca para planificar';
        const ams = e ? (e.amigas || []).filter(amigaDe) : [];
        return `<button class="dia-f ${f === h ? 'es-hoy' : ''} ${f < h ? 'pasado' : ''}" data-a="dia" data-f="${f}" aria-label="${larga(f)}${l ? ': ' + esc(l.nombre) : ''}">
          <span class="fecha"><small>${DIAC[d.getDay()]}</small><b>${d.getDate()}</b></span>
          ${l ? `<span class="mini">${collage(l.prendas)}</span>` : `<span class="hueco">${icono('mas', 18)}</span>`}
          <span class="txt"><b>${l ? esc(l.nombre) : f < h ? 'Sin apuntar' : 'Sin look'}</b><span>${det}</span>${ams.length ? `<span class="avs">${ams.map(a => avatar(a, 's')).join('')}</span>` : ''}</span>
        </button>`;
      }).join('')}`;
  } else {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + ui.mes);
    const y = base.getFullYear(), m = base.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
    const celdas = [...Array(lead)].map(() => `<span class="mc fuera"></span>`).concat([...Array(total)].map((_, i) => {
      const f = iso(new Date(y, m, i + 1)), e = S.cal[f], l = e && e.look && Lk(e.look), pid = l && principal(l.prendas);
      return `<button class="mc ${f === h ? 'es-hoy' : ''}" data-a="dia" data-f="${f}" aria-label="${larga(f)}${l ? ': ' + esc(l.nombre) : ''}"><span>${i + 1}</span>${pid ? sticker(P(pid)) : e && e.plan ? '<i class="pd"></i>' : ''}</button>`;
    }));
    cuerpo = `<div class="mes"><div class="mes-nav"><button class="ib" data-a="mes-nav" data-d="-1" aria-label="Mes anterior">${icono('izq')}</button><b>${MESL[m]} ${y}</b><button class="ib" data-a="mes-nav" data-d="1" aria-label="Mes siguiente">${icono('der')}</button></div>
      <div class="mes-g">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="dn" aria-hidden="true">${d}</span>`).join('')}${celdas.join('')}</div></div>
      <p class="leyenda">Toca un día para ver o cambiar su look</p>`;
  }
  return cabecera() + `<div class="pant">
    <div class="cab"><p class="eti">Planifica sin repetir</p><h1 class="tit voz">Calendario de looks</h1></div>
    <div class="seg" role="group" aria-label="Vista del calendario"><button data-a="cal-modo" data-v="semana" aria-pressed="${ui.cal === 'semana'}">Semana</button><button data-a="cal-modo" data-v="mes" aria-pressed="${ui.cal === 'mes'}">Mes</button></div>
    ${cuerpo}
  </div>`;
}

/* ---------- Perfil ---------- */
function pPerfil() {
  const mias = misPrendas();
  const pubs = S.posts.filter(f => f.autora === UID());
  let cont;
  if (ui.perfil === 'publicados') {
    cont = pubs.length
      ? `<div class="grid2">${pubs.map(f => { const l = Lk(f.look); return l ? `<div>${ventana(slug(l.nombre) + '.jpg', collage(l.prendas))}<p>${haceTxt(fechaDe(f.creado))}${f.texto ? ' · ' + esc(f.texto) : ''}</p></div>` : ''; }).join('')}</div>`
      : `<div class="vacio-txt"><span class="voz">Aún no has publicado ningún look</span><button class="btn sec peq" data-a="opc-publicar" style="margin-top:12px">Publicar un look</button></div>`;
  } else cont = estadisticas(mias);
  return cabecera(campana() + `<button class="ib borde" data-a="ajustes" aria-label="Ajustes">${icono('ajustes')}</button>`) + `<div class="pant">
    <div class="perfil-cab">${avatar(UID(), 'xl')}<div><h1 class="voz">${esc(nombre(UID()))}</h1><button class="lnk" data-a="editar-perfil" style="min-height:36px">Editar perfil</button></div></div>
    <div class="cuentas"><div><b>${mias.length}</b><span>${mias.length === 1 ? 'prenda' : 'prendas'}</span></div><div><b>${misLooks().length}</b><span>${misLooks().length === 1 ? 'look' : 'looks'}</span></div><div><b>${S.amigas.length}</b><span>${S.amigas.length === 1 ? 'amiga' : 'amigas'}</span></div></div>
    <div class="amigas-f">${S.amigas.length ? `<span class="avs">${S.amigas.slice(0, 4).map(a => avatar(a.id)).join('')}</span><button class="nombres" data-a="ver-amigas" style="text-align:left"><b>Tus amigas</b>${esc(lista(S.amigas.slice(0, 3).map(a => a.nombre || 'Amiga')))}${S.amigas.length > 3 ? ` y ${S.amigas.length - 3} más` : ''}</button>`
      : `<span class="nombres"><b>Todavía no tienes amigas</b>Invítalas para ver sus armarios</span>`}<button class="btn mini pri" data-a="invitar">Invitar</button></div>
    <div class="seg" role="group" aria-label="Qué ver"><button data-a="perfil-tab" data-v="publicados" aria-pressed="${ui.perfil === 'publicados'}">Mis looks publicados</button><button data-a="perfil-tab" data-v="stats" aria-pressed="${ui.perfil === 'stats'}">Estadísticas</button></div>
    ${cont}
  </div>`;
}
function estadisticas(mias) {
  if (!mias.length) return `<div class="vacio-txt"><span class="voz">Sin datos todavía</span>Sube prendas y apunta tus looks en el calendario: aquí verás cuánto usas tu armario.</div>`;
  const mes = hoy().slice(0, 7);
  const usadasMes = mias.filter(p => p.ultimo_uso && p.ultimo_uso.startsWith(mes)).length;
  const pct = Math.round(usadasMes / mias.length * 100);
  const top = [...mias].filter(p => p.usos > 0).sort((a, b) => b.usos - a.usos).slice(0, 5);
  const olvidadas = mias.filter(sinUsar).sort((a, b) => diasSin(b) - diasSin(a));
  const conPrecio = mias.filter(p => Number(p.precio) > 0).map(p => [p, Number(p.precio) / Math.max(1, p.usos)]).sort((a, b) => a[1] - b[1]);
  const recibidos = S.prestamos.filter(x => x.a === UID() && ['aceptada', 'devuelta'].includes(x.estado)).length;
  const hechos = S.prestamos.filter(x => x.de === UID() && ['aceptada', 'devuelta'].includes(x.estado)).length;
  const fila = (p, der) => `<li>${sticker(p)}<span>${esc(p.nombre)}</span><b>${der}</b></li>`;
  return `
    <div class="stat"><h3>Armario usado este mes</h3><p class="grande">${pct} %</p><p class="sub">${usadasMes} de ${mias.length} prendas</p><div class="barra" role="img" aria-label="${pct} por ciento"><i style="width:${pct}%"></i></div></div>
    <div class="stat"><h3>Las que más te pones</h3>${top.length ? `<ul class="lista">${top.map(p => fila(p, vez(p.usos))).join('')}</ul>` : '<p class="sub">Cuando pasen los días que tengas apuntados en el calendario, aquí verás tus favoritas.</p>'}</div>
    <div class="stat"><h3>Sin usar en 30 días</h3><p class="grande">${olvidadas.length}</p><p class="sub" style="margin-bottom:10px">prendas esperando su momento</p><ul class="lista">${olvidadas.slice(0, 5).map(p => fila(p, p.ultimo_uso ? haceTxt(p.ultimo_uso) : 'Sin estrenar')).join('')}</ul></div>
    <div class="stat"><h3>Coste por puesta</h3>${conPrecio.length ? `<ul class="lista">${conPrecio.map(([p, c]) => fila(p, eur(c))).join('')}</ul>`
      : `<p class="sub">Añade lo que te costó una prenda desde su ficha y aquí verás cuánto te sale cada vez que te la pones.</p>`}</div>
    <div class="stat"><h3>Préstamos</h3><div class="datos" style="margin:0"><div class="dato"><b>${recibidos}</b><span>recibidos</span></div><div class="dato"><b>${hechos}</b><span>hechos</span></div></div></div>`;
}

const PANT = { hoy: pHoy, armario: pArmario, calendario: pCalendario, perfil: pPerfil };
let ultimaTab = null;
function render() {
  if (!yo) return;
  const v = $('#vista');
  const y = ultimaTab === tab ? v.scrollTop : 0;
  v.innerHTML = PANT[tab]();
  v.scrollTop = y;
  ultimaTab = tab;
  $$('.tab').forEach(b => b.dataset.t === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
}
function irA(t, opts = {}) {
  tab = t; ultimaTab = null; render();
  if (opts.ancla) { const a = $('#' + opts.ancla); a && a.scrollIntoView({ block: 'start' }); }
}

/* =====================================================================
   LÓGICA
   ===================================================================== */
function temporadaActual() { const m = new Date().getMonth(); return (m === 11 || m <= 1) ? 'invierno' : (m >= 5 && m <= 7) ? 'verano' : 'entretiempo'; }
const valeTemporada = (p, t) => p.temporada === 'todo' || p.temporada === t || (t !== 'verano' && (p.temporada === 'invierno' || p.temporada === 'entretiempo'));
function proponer(excluir = []) {
  const t = temporadaActual(), h = hoy();
  const disp = miArmario().filter(p => !prestadaA(p) && !excluir.includes(p.id));
  const elegir = tipo => {
    let c = disp.filter(p => p.tipo === tipo && valeTemporada(p, t));
    if (!c.length) c = disp.filter(p => p.tipo === tipo);
    if (!c.length) return null;
    const punt = p => (p.usos || 0) + (p.ultimo_uso && dif(h, p.ultimo_uso) < 7 ? 40 : 0) + Math.random() * 8;
    return c.map(p => [punt(p), p]).sort((a, b) => a[0] - b[0])[0][1].id;
  };
  const ids = [];
  const hayVestido = disp.some(p => p.tipo === 'vestido');
  const hayDos = disp.some(p => p.tipo === 'arriba') && disp.some(p => p.tipo === 'abajo');
  if (hayVestido && (!hayDos || Math.random() < 0.3)) ids.push(elegir('vestido'));
  else { ids.push(elegir('arriba')); ids.push(elegir('abajo')); }
  if (t !== 'verano') ids.push(elegir('abrigo'));
  ids.push(elegir('calzado'));
  if (Math.random() < 0.6) ids.push(elegir('accesorio'));
  return ids.filter(Boolean);
}
function repeticion(f, lookId, prendas, amigas) {
  if (!amigas.length) return null;
  const pr = principal(prendas), desde = suma(f, -30);
  let res = null;
  Object.entries(S.cal).forEach(([g, e]) => {
    if (g >= f || g < desde || !e.look) return;
    const comunes = (e.amigas || []).filter(a => amigas.includes(a) && amigaDe(a));
    if (!comunes.length) return;
    const l = Lk(e.look); if (!l) return;
    const mismo = e.look === lookId;
    if ((mismo || (pr && principal(l.prendas) === pr)) && (!res || g > res.f)) res = { f: g, amigas: comunes, look: l, mismo, prenda: pr, plan: e.plan };
  });
  return res;
}
function excluirPara(f, amigas) {
  const desde = suma(f, -30), out = [];
  Object.entries(S.cal).forEach(([g, e]) => {
    if (g >= f || g < desde || !e.look || !(e.amigas || []).some(a => amigas.includes(a))) return;
    const l = Lk(e.look), pr = l && principal(l.prendas); if (pr) out.push(pr);
  });
  return out;
}
async function guardarDia(f, cambios) {
  const actual = S.cal[f] || { duena: UID(), fecha: f, look: null, plan: '', amigas: [], contado: false };
  const e = { ...actual, ...cambios, duena: UID(), fecha: f };
  S.cal[f] = e;
  await q(sb.from('calendario').upsert(e, { onConflict: 'duena,fecha' }));
  if (f < hoy() && e.look && !e.contado) {
    await q(sb.rpc('procesar_dias', { p_hoy: hoy() }));
    S.prendas = await q(sb.from('prendas').select('*').order('creado', { ascending: false }));
    S.cal[f].contado = true;
  }
}
async function crearLook(ids, nom) {
  const l = await q(sb.from('looks').insert({ nombre: nom.slice(0, 60), prendas: ids }).select().single());
  S.looks.unshift(l);
  return l;
}
async function asignarConAviso(f, lookId, alTerminar) {
  const l = Lk(lookId);
  const amigas = (S.cal[f] && S.cal[f].amigas) || [];
  const rep = repeticion(f, lookId, l.prendas, amigas);
  const ok = async () => { await guardarDia(f, { look: lookId }); alTerminar && alTerminar(); refrescar(); };
  if (!rep) return ok();
  abrirAvisoRep(rep, {
    otro: async () => {
      const ids = proponer(excluirPara(f, amigas));
      if (ids.length < 2) { aviso('No hay más prendas para proponerte otro look.'); return; }
      const nuevo = await crearLook(ids, `Propuesta para ${diaTxt(f)}`);
      await asignarConAviso(f, nuevo.id, alTerminar);
    },
    igual: ok
  });
}

/* =====================================================================
   HOJAS Y PÁGINAS
   ===================================================================== */
function abrirMas() {
  abrir('hoja', () => hojaCab('', '¿Qué quieres hacer?') + `<div class="opciones">
    <button class="opc" data-a="opc-anadir"><span class="ic">${icono('camara')}</span><span><b>Añadir prendas</b><span>Sube varias fotos de golpe</span></span></button>
    <button class="opc" data-a="catalogo"><span class="ic">${icono('armario')}</span><span><b>Catálogo de básicos</b><span>Marca las prendas básicas que tienes</span></span></button>
    <button class="opc" data-a="opc-crear"><span class="ic">${icono('prenda')}</span><span><b>Crear look</b><span>Combina tu ropa y la de tus amigas</span></span></button>
    <button class="opc" data-a="opc-publicar"><span class="ic">${icono('publicar')}</span><span><b>Publicar look</b><span>Que tus amigas lo vean en su inicio</span></span></button>
  </div>`, { titulo: 'Crear' });
}
const botonesSubir = () => `<div class="subir">
  <label class="btn pri ancho grande">${icono('galeria')} Elegir de la galería<input class="sr" type="file" accept="image/*" multiple data-in="fotos"></label>
  <label class="btn sec ancho grande">${icono('camara')} Hacer una foto<input class="sr" type="file" accept="image/*" capture="environment" data-in="fotos"></label>
</div>`;
/* ---------- Catálogo de básicos: «Lo tengo» y pasa al armario ---------- */
const CATALOGO = window.OCCASIO_CATALOGO || [];
const enArmario = item => misPrendas().some(p => p.foto_path === item.foto);
function abrirCatalogo(desdeOnb) {
  abrir('pag', el => {
    const lst = CATALOGO.filter(it => el._tipo === 'todo' || it.tipo === el._tipo);
    const n = el._sel.size;
    return `<header class="top borde"><button class="ib" data-a="cerrar" aria-label="Volver">${icono('atras')}</button><b>Catálogo de básicos</b><span style="width:44px"></span></header>
    <div class="pant ancha">
      <div class="cab" style="padding-top:12px"><p class="eti">Empieza por lo básico</p><h1 class="tit voz">¿Cuáles tienes?</h1>
        <p class="sub">Toca las prendas que tienes o que se parecen a las tuyas. Pasarán a tu armario y podrás usarlas en tus looks hasta que subas tus propias fotos.</p></div>
      <div class="fila-x" role="group" aria-label="Tipo de prenda" style="margin-bottom:14px"><button class="chip" data-a="cat-tipo" data-v="todo" aria-pressed="${el._tipo === 'todo'}">Todo</button>${Object.entries(TIPO_FILTRO).map(([k, t]) => `<button class="chip" data-a="cat-tipo" data-v="${k}" aria-pressed="${el._tipo === k}">${t}</button>`).join('')}</div>
      <div class="sel-grid cat-grid">${lst.map(it => {
        const ya = enArmario(it), on = el._sel.has(it.id);
        return `<div class="pr cat-item ${ya ? 'ya' : ''} ${on ? 'on' : ''}">
          <span class="st"><button class="cat-ver" data-a="cat-ver" data-id="${it.id}" aria-label="Ver en grande: ${esc(it.nombre)}"><img class="entera" src="${esc(it.foto)}" alt="${esc(it.nombre)}" loading="lazy"></button>
            ${ya ? '' : `<button class="cat-check" data-a="cat-sel" data-id="${it.id}" aria-pressed="${on}" aria-label="Lo tengo: ${esc(it.nombre)}">${icono('ok', 16)}</button>`}</span>
          <button class="cat-txt" data-a="cat-sel" data-id="${it.id}" ${ya ? 'disabled' : ''} aria-pressed="${on}"><span class="pr-nom">${esc(it.nombre)}</span><span class="pr-sub">${ya ? 'Ya en tu armario' : on ? 'Lo tengo ✓' : TIPO_TXT[it.tipo]}</span></button></div>`;
      }).join('')}</div>
      <p class="sub" style="margin-top:18px;text-align:center">Fotos de ejemplo de Pexels. Tus amigas verán estas prendas en tu armario como «básico».</p>
    </div>
    <div class="pie-fijo"><button class="btn pri ancho grande" data-a="cat-guardar" ${n ? '' : 'disabled'}>${n ? `Añadir ${n} ${n === 1 ? 'prenda' : 'prendas'} a mi armario` : 'Toca las prendas que tienes'}</button></div>`;
  }, { titulo: 'Catálogo de básicos', props: { _tipo: 'todo', _sel: new Set(), _onb: !!desdeOnb } });
}

/* Foto ampliada del catálogo, con «Lo tengo» y flechas para pasar de prenda */
function abrirZoomCatalogo(capaCat, id) {
  const ids = CATALOGO.filter(it => capaCat._tipo === 'todo' || it.tipo === capaCat._tipo).map(it => it.id);
  abrir('zoom', el => {
    const it = CATALOGO.find(x => x.id === ids[el._i]); if (!it) return '';
    const ya = enArmario(it), on = capaCat._sel.has(it.id), n = ids.length;
    return `<button class="ib zoom-x" data-a="cerrar" aria-label="Cerrar">${icono('cerrar')}</button>
      <div class="zoom-foto"><img class="entera" src="${esc(it.foto)}" alt="${esc(it.nombre)}">
        ${n > 1 ? `<button class="zoom-nav izq" data-a="zoom-nav" data-d="-1" aria-label="Prenda anterior">${icono('izq')}</button><button class="zoom-nav der" data-a="zoom-nav" data-d="1" aria-label="Prenda siguiente">${icono('der')}</button>` : ''}</div>
      <div class="zoom-pie"><div><p class="voz zoom-nom">${esc(it.nombre)}</p><p class="sub">${TIPO_TXT[it.tipo]} · ${cap(colorTxt(it.color, FEM_TIPO[it.tipo]))} · ${TEMP_TXT[it.temporada] || 'Todo el año'}</p></div>
        <span class="zoom-num" aria-hidden="true">${el._i + 1}/${n}</span></div>
      ${it.descripcion ? `<p class="zoom-desc">${esc(it.descripcion)}</p>` : ''}
      ${ya ? `<button class="btn sec ancho" disabled>Ya está en tu armario</button>`
        : `<button class="btn ${on ? 'sec' : 'pri'} ancho grande" data-a="zoom-sel" data-id="${it.id}" aria-pressed="${on}">${on ? `${icono('ok', 18)} Lo tengo · tocar para quitar` : 'Lo tengo'}</button>`}`;
  }, { titulo: 'Prenda del catálogo', props: { _i: Math.max(0, ids.indexOf(id)), _ids: ids, _cat: capaCat } });
}

function abrirAnadir() {
  abrir('hoja', () => hojaCab('', 'Añadir prendas') +
    `<p class="sub" style="margin:-4px 0 18px">Elige varias fotos a la vez. Después les pones tipo y color con un toque.</p>${botonesSubir()}`, { titulo: 'Añadir prendas' });
}
async function procesarFotos(input) {
  const files = [...(input.files || [])].filter(f => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)).slice(0, 30);
  input.value = '';
  if (!files.length) return;
  aviso(files.length === 1 ? 'Preparando la foto…' : `Preparando ${files.length} fotos…`);
  const fotos = [];
  for (const f of files) { try { fotos.push(await leerFoto(f)); } catch (_) { /* se salta */ } }
  if (!fotos.length) { aviso('No se ha podido leer ninguna foto.'); return; }
  const desdeOnb = !!input.closest('#onb');
  const origen = input.closest('.capa');
  if (origen) cerrar(origen);
  abrirEtiquetado(fotos, desdeOnb);
}
const nombreAuto = it => `${TIPO_TXT[it.tipo]}${it.color ? ' ' + colorTxt(it.color, FEM_TIPO[it.tipo]) : ''}`;
function abrirEtiquetado(fotos, desdeOnb) {
  abrir('pag', el => {
    const its = el._items, n = its.length, faltan = its.filter(i => !i.tipo || !i.color).length;
    return `<header class="top borde"><button class="ib" data-a="cerrar" aria-label="Volver">${icono('atras')}</button><b>Etiqueta tus prendas</b><span style="width:44px"></span></header>
    <div class="pant"><p class="sub" style="margin:8px 0 16px">Toca el tipo y el color de cada una. Sin escribir nada.</p>
    ${its.map((it, i) => `<section class="etq-card" aria-label="Prenda ${i + 1} de ${n}">
      <div class="foto"><img src="${it.src}" alt="Foto de la prenda ${i + 1}"><div><b>Prenda ${i + 1} de ${n}</b><span>${it.tipo ? esc(nombreAuto(it)) : 'Sin etiquetar'}</span></div></div>
      <p class="lbl">Tipo</p><div class="chips">${TIPOS.map(([k, t]) => `<button class="chip" data-a="et-tipo" data-i="${i}" data-v="${k}" aria-pressed="${it.tipo === k}">${t}</button>`).join('')}</div>
      <p class="lbl">Color</p><div class="sws">${Object.keys(COLORES).map(c => `<button class="sw" data-a="et-color" data-i="${i}" data-v="${c}" aria-pressed="${it.color === c}" aria-label="${cap(colorTxt(c))}" title="${cap(colorTxt(c))}"><i style="background:${COLORES[c]}"></i></button>`).join('')}</div>
      ${n > 1 ? `<button class="lnk" data-a="et-todas" data-i="${i}" ${it.tipo || it.color ? '' : 'disabled'}>Aplicar a todas</button>` : ''}
    </section>`).join('')}
    </div>
    <div class="pie-fijo"><button class="btn pri ancho grande" data-a="et-guardar" ${faltan ? 'disabled' : ''}>${faltan ? `Faltan ${faltan} por etiquetar` : `Guardar ${n} ${n === 1 ? 'prenda' : 'prendas'}`}</button></div>`;
  }, { titulo: 'Etiqueta tus prendas', props: { _items: fotos.map(f => ({ ...f, tipo: null, color: null })), _onb: desdeOnb } });
}

function abrirFicha(id) {
  abrir('hoja', () => {
    const p = P(id); if (!p) return hojaCab('', 'Esta prenda ya no está disponible');
    const mia = esMia(p), presto = tengo(p), pend = pedida(p), aQuien = prestadaA(p), piden = mia ? S.prestamos.filter(x => x.prenda === p.id && x.de === UID() && x.estado === 'pendiente') : [];
    const fem = FEM_TIPO[p.tipo];
    const looks = misLooks().filter(l => l.prendas.includes(p.id));
    let estado = '', accion = '';
    if (aQuien) estado = `<div class="estado">${icono('sobre', 20)}<span>Se la has prestado a <b>${esc(nombre(aQuien.a))}</b> hasta el ${corta(aQuien.hasta)}.</span></div>`;
    piden.forEach(x => { estado += peticionHTML(x); });
    if (presto) {
      estado = `<div class="estado">${icono('sobre', 20)}<span>Prestada por <b>${esc(nombre(p.duena))}</b> hasta el ${corta(presto.hasta)}.</span></div>`;
      accion = `<button class="btn sec ancho" data-a="devolver" data-id="${presto.id}">La he devuelto</button>`;
    } else if (!mia && pend) {
      estado = `<div class="estado">${icono('sobre', 20)}<span>Petición enviada a ${esc(nombre(p.duena))}. Te avisaremos cuando conteste.</span></div>`;
      accion = `<button class="btn sec ancho" data-a="cancelar-pet" data-id="${pend.id}">Cancelar la petición</button>`;
    } else if (!mia && amigaDe(p.duena)) {
      accion = `<button class="btn pri ancho grande" data-a="pedir" data-id="${p.id}">Pedir prestada</button>`;
    }
    const usos = `<div class="datos"><div class="dato"><b>${p.usos || 0}</b><span>${p.usos === 1 ? 'vez usada' : 'veces usada'}</span></div><div class="dato"><b style="font-size:20px;line-height:1.45">${p.ultimo_uso ? haceTxt(p.ultimo_uso) : 'Aún no'}</b><span>última vez</span></div></div>`;
    let coste = '';
    if (mia) {
      coste = Number(p.precio) > 0
        ? `<h3 class="h3">Coste por puesta</h3><div class="dato" style="margin-bottom:6px"><b>${eur(Number(p.precio) / Math.max(1, p.usos))}</b><span>cada vez que te la pones · te costó ${eur(p.precio)}</span></div><button class="lnk" data-a="precio-cambiar" data-id="${p.id}">Cambiar el precio</button>`
        : `<h3 class="h3">Coste por puesta</h3><p class="sub" style="margin:-4px 0 10px">Escribe lo que te costó y verás cuánto te sale cada vez que te la pones.</p>
           <div class="cpp"><input class="inp" id="precio-${p.id}" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Precio en €" aria-label="Lo que te costó, en euros"><button class="btn pri peq" data-a="precio" data-id="${p.id}">Guardar</button></div>`;
    }
    return hojaCab(mia ? 'Tu prenda' : presto ? 'Prestada' : `Armario de ${esc(nombre(p.duena))}`, esc(p.nombre)) +
      `<div class="ficha-st">${sticker(p)}</div>
      ${mia ? '' : `<p class="ficha-de">${avatar(p.duena, 's')} Es de ${esc(nombre(p.duena))}</p>`}
      <div class="tag"><dl><dt>Tipo</dt><dd>${TIPO_TXT[p.tipo]}</dd><dt>Color</dt><dd>${cap(colorTxt(p.color, fem))}</dd><dt>Temporada</dt><dd>${TEMP_TXT[p.temporada] || 'Todo el año'}</dd></dl></div>
      ${estado}
      ${mia ? usos : ''}
      ${looks.length ? `<h3 class="h3">Aparece en ${looks.length} ${looks.length === 1 ? 'look' : 'looks'}</h3><div class="mini-looks">${looks.map(l => `<div class="mini-look">${ventana(slug(l.nombre), collage(l.prendas))}<p>${esc(l.nombre)}</p></div>`).join('')}</div>` : (mia ? `<p class="sub" style="margin-bottom:12px">Todavía no aparece en ningún look.</p>` : '')}
      ${coste}
      ${accion ? `<div style="margin-top:16px">${accion}</div>` : ''}
      ${mia ? `<div class="acciones" style="margin-top:18px"><button class="btn sec" data-a="editar-prenda" data-id="${p.id}">Editar</button><button class="btn sec" data-a="borrar-prenda" data-id="${p.id}">Borrar</button></div>` : ''}`;
  }, { titulo: P(id) ? P(id).nombre : 'Prenda' });
}

function abrirEditarPrenda(id) {
  const p = P(id); if (!p) return;
  abrir('hoja', el => {
    const e = el._e;
    return hojaCab('Editar', esc(p.nombre)) +
      `<label class="campo"><span>Nombre</span><input class="inp" data-in="ep-nombre" value="${esc(e.nombre)}" maxlength="60"></label>
      <p class="lbl" style="font-size:13px;font-weight:500;margin-bottom:6px">Tipo</p><div class="chips" style="margin-bottom:14px">${TIPOS.map(([k, t]) => `<button class="chip" data-a="ep-set" data-k="tipo" data-v="${k}" aria-pressed="${e.tipo === k}">${t}</button>`).join('')}</div>
      <p class="lbl" style="font-size:13px;font-weight:500;margin-bottom:6px">Color</p><div class="sws" style="margin-bottom:14px">${Object.keys(COLORES).map(c => `<button class="sw" data-a="ep-set" data-k="color" data-v="${c}" aria-pressed="${e.color === c}" aria-label="${cap(colorTxt(c))}"><i style="background:${COLORES[c]}"></i></button>`).join('')}</div>
      <p class="lbl" style="font-size:13px;font-weight:500;margin-bottom:6px">Temporada</p><div class="chips" style="margin-bottom:18px">${TEMPORADAS.map(([k, t]) => `<button class="chip" data-a="ep-set" data-k="temporada" data-v="${k}" aria-pressed="${e.temporada === k}">${t}</button>`).join('')}</div>
      <button class="btn pri ancho grande" data-a="ep-guardar" data-id="${p.id}">Guardar</button>`;
  }, { titulo: 'Editar prenda', props: { _e: { nombre: p.nombre, tipo: p.tipo, color: p.color, temporada: p.temporada } } });
}

function confirmar(tit, txt, boton, alAceptar) {
  abrir('hoja', () => hojaCab('', tit, false) + `<p style="margin:-4px 0 18px">${txt}</p>
    <div class="acciones"><button class="btn sec" data-a="cerrar">Cancelar</button><button class="btn pri" data-a="confirmar-ok">${boton}</button></div>`,
    { titulo: tit, props: { _ok: alAceptar } });
}

function abrirPedir(id) {
  const p = P(id); if (!p) return;
  const amiga = nombre(p.duena);
  abrir('hoja', () => hojaCab(`A ${esc(amiga)}`, 'Pedir prestada') +
    `<div class="etq" style="margin-bottom:16px">${sticker(p)}<p><b>${esc(p.nombre)}</b> · de ${esc(amiga)}</p></div>
    <div class="fechas"><label class="campo"><span>Desde</span><input class="inp" type="date" id="pd-desde" value="${hoy()}" min="${hoy()}"></label>
    <label class="campo"><span>Hasta</span><input class="inp" type="date" id="pd-hasta" value="${suma(hoy(), 3)}" min="${hoy()}"></label></div>
    <label class="campo"><span>Mensaje</span><textarea class="area" id="pd-msg" maxlength="300">¡Hola ${esc(amiga)}! ¿Me dejas ${esc(comillas(p.nombre))}? Te lo devuelvo genial 💛</textarea></label>
    <button class="btn pri ancho grande" data-a="enviar-pedir" data-id="${p.id}">Enviar petición</button>`, { titulo: 'Pedir prestada' });
}

function peticionHTML(x) {
  const p = P(x.prenda); if (!p) return '';
  const fechas = `del ${corta(x.desde)} al ${corta(x.hasta)}`;
  if (x.de === UID() && x.estado === 'pendiente') return `<div class="peti"><div class="fila">${sticker(p)}<p><b>${esc(nombre(x.a))}</b> te pide ${esc(comillas(p.nombre))}<small>${fechas}</small></p></div>${x.mensaje ? `<p class="msg">${esc(x.mensaje)}</p>` : ''}
    <div class="acciones"><button class="btn sec" data-a="responder" data-id="${x.id}" data-v="no">No puedo</button><button class="btn pri" data-a="responder" data-id="${x.id}" data-v="si">Prestársela</button></div></div>`;
  if (x.a === UID() && x.estado === 'pendiente') return `<div class="peti"><div class="fila">${sticker(p)}<p>Has pedido ${esc(comillas(p.nombre))} a <b>${esc(nombre(x.de))}</b><small>${fechas} · esperando respuesta</small></p></div>
    <div class="acciones"><button class="btn sec" data-a="cancelar-pet" data-id="${x.id}">Cancelar</button></div></div>`;
  if (x.de === UID() && x.estado === 'aceptada') return `<div class="peti"><div class="fila">${sticker(p)}<p><b>${esc(nombre(x.a))}</b> tiene tu ${esc(comillas(p.nombre))}<small>hasta el ${corta(x.hasta)}</small></p></div>
    <div class="acciones"><button class="btn sec" data-a="devolver" data-id="${x.id}">Ya me la ha devuelto</button></div></div>`;
  if (x.a === UID() && x.estado === 'aceptada') return `<div class="peti"><div class="fila">${sticker(p)}<p>Tienes ${esc(comillas(p.nombre))} de <b>${esc(nombre(x.de))}</b><small>hasta el ${corta(x.hasta)}</small></p></div>
    <div class="acciones"><button class="btn sec" data-a="devolver" data-id="${x.id}">La he devuelto</button></div></div>`;
  return '';
}
function abrirPeticiones() {
  abrir('hoja', () => {
    const vivos = S.prestamos.filter(x => ['pendiente', 'aceptada'].includes(x.estado) && P(x.prenda));
    const te = vivos.filter(x => x.de === UID() && x.estado === 'pendiente');
    const has = vivos.filter(x => x.a === UID() && x.estado === 'pendiente');
    const act = vivos.filter(x => x.estado === 'aceptada');
    return hojaCab('Préstamos', 'Peticiones y préstamos') +
      (te.length ? `<p class="h-sec">Te piden</p>${te.map(peticionHTML).join('')}` : '') +
      (act.length ? `<p class="h-sec">Prestadas ahora</p>${act.map(peticionHTML).join('')}` : '') +
      (has.length ? `<p class="h-sec">Has pedido</p>${has.map(peticionHTML).join('')}` : '') +
      (!vivos.length ? `<p class="vacio-txt">No tienes peticiones ni préstamos activos.</p>` : '');
  }, { titulo: 'Préstamos' });
}

function abrirSelector(capaEd, slot) {
  const tipos = slot === 'abajo' ? ['abajo', 'vestido'] : [slot];
  abrir('hoja', el => {
    const ed = el._ed._ed;
    const mias = miArmario().filter(p => tipos.includes(p.tipo) && !prestadaA(p));
    const ams = deAmigas().filter(p => !tengo(p) && tipos.includes(p.tipo));
    const lst = el._pest === 'mias' ? mias : ams;
    const actual = ed.slots[slot];
    return hojaCab('Crear look', `Elige: ${SLOTS.find(s => s[0] === slot)[1].toLowerCase()}`, false) +
      `<div class="seg" role="group" aria-label="De quién"><button data-a="sel-pest" data-v="mias" aria-pressed="${el._pest === 'mias'}">Mías</button><button data-a="sel-pest" data-v="amigas" aria-pressed="${el._pest === 'amigas'}">De amigas</button></div>
      ${lst.length ? `<div class="sel-grid">${lst.map(p => `<button class="pr" data-a="sel-elegir" data-id="${p.id}" aria-pressed="${actual === p.id}">${sticker(p, { duena: true })}<span class="pr-nom">${esc(p.nombre)}</span><span class="pr-sub">${esMia(p) ? `Usada ${vez(p.usos)}` : tengo(p) ? `Prestada por ${esc(nombre(p.duena))}` : `De ${esc(nombre(p.duena))}`}</span></button>`).join('')}</div>`
        : el._pest === 'mias' ? `<p class="vacio-txt">No tienes prendas de este tipo.</p><button class="btn sec ancho" data-a="opc-anadir">Añadir prendas</button>`
        : `<p class="vacio-txt">${S.amigas.length ? 'Tus amigas no tienen prendas de este tipo.' : 'Invita a tus amigas para usar su ropa en tus looks.'}</p>`}
      ${actual ? `<button class="btn sec ancho" data-a="sel-quitar" style="margin-top:16px">Dejar este hueco vacío</button>` : ''}`;
  }, { titulo: 'Elegir prenda', props: { _ed: capaEd, _slot: slot, _pest: 'mias' } });
}

function abrirCrear(pre = {}) {
  const ed = { slots: { arriba: null, abajo: null, abrigo: null, calzado: null, accesorio: null }, nombre: '', dia: pre.dia || null, publicar: false, texto: '', nota: '' };
  if (pre.prendas) ponerEnSlots(ed, pre.prendas);
  abrir('pag', el => {
    const e = el._ed, ids = Object.values(e.slots).filter(Boolean), h = hoy();
    const planDia = e.dia && S.cal[e.dia];
    return `<header class="top borde"><button class="ib" data-a="cerrar" aria-label="Volver">${icono('atras')}</button><b>Crear look</b><span style="width:44px"></span></header>
    <div class="pant">
      <div class="cab" style="padding-top:12px"><p class="eti">Crear look</p><h1 class="tit voz">¿Y si hoy lo combinas distinto?</h1></div>
      ${ventana('nuevo_look.jpg', collage(ids, { duena: true, vacio: 'Toca un hueco para elegir prenda o pide una propuesta.' }))}
      <button class="btn sec ancho" data-a="ed-proponer" style="margin-top:12px">${icono('chispa', 18)} Proponme uno</button>
      ${e.nota ? `<p class="nota">${icono('chispa', 16)} ${esc(e.nota)}</p>` : ''}
      <div class="slots">${SLOTS.map(([k, t]) => {
        const p = e.slots[k] && P(e.slots[k]);
        return `<button class="slot ${p ? '' : 'vacio'} ${k === 'accesorio' ? 'ancho' : ''}" data-a="slot" data-s="${k}" aria-label="${t}: ${p ? esc(p.nombre) : 'vacío'}">
          ${p ? sticker(p, { duena: true }) : `<span class="vac">${icono('mas', 20)}</span>`}
          <span><small>${t}</small><b>${p ? esc(p.nombre) : 'Elegir'}</b>${p && !esMia(p) ? `<small style="text-transform:none;letter-spacing:0">${tengo(p) ? 'Prestada por ' : 'De '}${esc(nombre(p.duena))}</small>` : ''}</span></button>`;
      }).join('')}</div>
      <label class="campo"><span>Nombre del look</span><input class="inp" data-in="ed-nombre" value="${esc(e.nombre)}" placeholder="Ej. Cena con las de clase" maxlength="40"></label>
      <div class="campo"><span>¿Para qué día? (opcional)</span>
        <div class="dias" role="group" aria-label="Día del calendario">
          <button class="dia-ch" data-a="ed-dia" data-f="" aria-pressed="${!e.dia}"><b>—</b>Sin día</button>
          ${[...Array(14)].map((_, i) => suma(h, i)).map(f => { const d = aFecha(f), n = dif(f, h); return `<button class="dia-ch" data-a="ed-dia" data-f="${f}" aria-pressed="${e.dia === f}" aria-label="${larga(f)}"><span>${n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : DIAC[d.getDay()]}</span><b>${d.getDate()}</b></button>`; }).join('')}
        </div>
        ${planDia && (planDia.plan || (planDia.amigas || []).length) ? `<p class="plan-dia">${esc(planDia.plan || 'Plan')} ${(planDia.amigas || []).filter(amigaDe).length ? '· con ' + esc(lista(planDia.amigas.filter(amigaDe).map(nombre))) : ''}${planDia.look ? ' · ya tiene un look, se cambiará' : ''}</p>` : ''}
      </div>
      <label class="interr">Publicarlo para tus amigas<input type="checkbox" data-in="ed-publicar" ${e.publicar ? 'checked' : ''}></label>
      ${e.publicar ? `<label class="campo"><span>Texto (opcional)</span><textarea class="area" data-in="ed-texto" placeholder="Cuenta algo de tu look" maxlength="200">${esc(e.texto)}</textarea></label>` : ''}
    </div>
    <div class="pie-fijo"><button class="btn pri ancho grande" data-a="ed-guardar">Guardar look</button></div>`;
  }, { titulo: 'Crear look', props: { _ed: ed } });
}
function ponerEnSlots(ed, ids) {
  Object.keys(ed.slots).forEach(k => { ed.slots[k] = null; });
  ids.forEach(id => { const p = P(id); if (!p) return; const k = p.tipo === 'vestido' ? 'abajo' : p.tipo; if (k in ed.slots && !ed.slots[k]) ed.slots[k] = id; });
}
async function guardarLookEditor(capa, b) {
  const ed = capa._ed;
  const ids = Object.values(ed.slots).filter(Boolean);
  if (ids.length < 2) { aviso('Elige al menos dos prendas para tu look.'); return; }
  const nom = ed.nombre.trim() || (ed.dia ? `Look para ${diaTxt(ed.dia)}` : `Look del ${corta(hoy())}`);
  const terminar = () => intenta(b, async () => {
    const look = await crearLook(ids, nom);
    if (ed.dia) await guardarDia(ed.dia, { look: look.id });
    if (ed.publicar) S.posts.unshift(await q(sb.from('publicaciones').insert({ look: look.id, texto: ed.texto.trim().slice(0, 200) }).select().single()));
    cerrar(capa);
    const porPedir = visibles(ids).filter(p => !esMia(p) && !tengo(p) && !pedida(p) && amigaDe(p.duena));
    if (ed.dia) { ui.cal = 'semana'; ui.semana = Math.floor(dif(lunes(ed.dia), lunes(hoy())) / 7); irA('calendario'); }
    else if (ed.publicar) irA('hoy', { ancla: 'feed' });
    aviso(`Look guardado${ed.dia ? ' para ' + diaTxt(ed.dia) : ''}${ed.publicar ? ' y publicado' : ''}`);
    if (porPedir.length) setTimeout(() => ofrecerPedir(porPedir.map(p => p.id)), 450);
  });
  if (ed.dia) {
    const amigas = (S.cal[ed.dia] && S.cal[ed.dia].amigas) || [];
    const rep = repeticion(ed.dia, null, ids, amigas);
    if (rep) {
      abrirAvisoRep(rep, {
        otro: () => { ponerEnSlots(ed, proponer(excluirPara(ed.dia, amigas))); ed.nota = 'Propuesta sin repetir con quien vas ese día'; repinta(capa); },
        igual: terminar, textoIgual: 'Guardarlo igual'
      });
      return;
    }
  }
  await terminar();
}
function ofrecerPedir(ids) {
  abrir('hoja', () => {
    const ps = ids.map(P).filter(Boolean);
    return hojaCab('Tu look lleva ropa de tus amigas', ps.length === 1 ? '¿Se la pides?' : '¿Se las pides?') +
      `<p class="sub" style="margin:-4px 0 14px">Todavía no te ${ps.length === 1 ? 'la han' : 'las han'} prestado.</p>
      <ul class="etqs">${ps.map(p => `<li class="etq">${sticker(p)}<p><b>${esc(p.nombre)}</b> · de ${esc(nombre(p.duena))}</p>${accionPedir(p)}</li>`).join('')}</ul>
      <button class="btn sec ancho" data-a="cerrar" style="margin-top:14px">Ahora no</button>`;
  }, { titulo: 'Pedir prendas' });
}
function abrirPublicar() {
  abrir('hoja', el => {
    const mis = misLooks();
    return hojaCab('', 'Publicar look') +
      `<p class="sub" style="margin:-4px 0 14px">Elige uno de tus looks. Tus amigas lo verán en su inicio con cada prenda etiquetada.</p>
      <div class="grid2" role="group" aria-label="Tus looks">${mis.map(l => `<button data-a="pub-sel" data-id="${l.id}" aria-pressed="${el._sel === l.id}" style="text-align:left;border-radius:16px;padding:4px;${el._sel === l.id ? 'box-shadow:0 0 0 2.5px var(--cafe)' : ''}">${ventana(slug(l.nombre) + '.jpg', collage(l.prendas))}<p class="voz" style="font-size:14px;color:var(--cafe)">${esc(l.nombre)}</p></button>`).join('')}</div>
      <label class="campo" style="margin-top:16px"><span>Texto (opcional)</span><textarea class="area" data-in="pub-texto" placeholder="Cuenta algo de tu look" maxlength="200">${esc(el._txt)}</textarea></label>
      <button class="btn pri ancho grande" data-a="pub-ok" ${el._sel ? '' : 'disabled'}>Publicar</button>`;
  }, { titulo: 'Publicar look', props: { _sel: null, _txt: '' } });
}
function abrirDia(f) {
  abrir('hoja', () => {
    const e = S.cal[f] || { look: null, plan: '', amigas: [] };
    const l = e.look && Lk(e.look);
    return hojaCab(larga(f), l ? esc(l.nombre) : 'Sin look') +
      ventana(l ? slug(l.nombre) + '.jpg' : 'sin_look.jpg', l ? collage(l.prendas, { duena: true }) : `<div class="collage vacio">Todavía no hay look para este día.</div>`) +
      (l && f < hoy() ? `<p class="nota">${icono('ok', 16)} Llevado: sus prendas ya suman una puesta.</p>` : '') +
      `<div class="acciones" style="margin:12px 0 18px"><button class="btn ${l ? 'sec' : 'pri'}" data-a="dia-cambiar" data-f="${f}">${l ? 'Cambiar el look' : 'Elegir look'}</button>${l ? `<button class="btn sec" data-a="dia-quitar" data-f="${f}">Quitar</button>` : ''}</div>
      <label class="campo"><span>Plan</span><input class="inp" data-in="dia-plan" data-f="${f}" value="${esc(e.plan)}" placeholder="Cena con las de clase" maxlength="80"></label>
      <div class="campo"><span>¿Quién va?</span>${S.amigas.length ? `<div class="chips">${S.amigas.map(a => `<button class="chip" data-a="dia-amiga" data-f="${f}" data-id="${a.id}" aria-pressed="${(e.amigas || []).includes(a.id)}">${avatar(a.id, 's')} ${esc(a.nombre || 'Amiga')}</button>`).join('')}</div>` : `<p class="sub">Invita a tus amigas para apuntar con quién vas y que Occasio te avise si repites look.</p>`}</div>`;
  }, { titulo: larga(f) });
}
function abrirElegirLook(f) {
  abrir('hoja', () => {
    const mis = misLooks();
    return hojaCab(larga(f), 'Elige un look') +
      `<div class="acciones" style="margin-bottom:16px"><button class="btn sec" data-a="el-proponer" data-f="${f}">${icono('chispa', 18)} Proponme uno</button><button class="btn sec" data-a="el-crear" data-f="${f}">Crear uno</button></div>
      ${mis.length ? `<div class="grid2">${mis.map(l => `<button data-a="el-look" data-f="${f}" data-id="${l.id}" style="text-align:left">${ventana(slug(l.nombre) + '.jpg', collage(l.prendas))}<p class="voz" style="font-size:14px;color:var(--cafe)">${esc(l.nombre)}</p></button>`).join('')}</div>` : '<p class="vacio-txt">Todavía no tienes looks guardados.</p>'}`;
  }, { titulo: 'Elegir look' });
}
function abrirAvisoRep(rep, cb) {
  const p = P(rep.prenda);
  const quien = lista(rep.amigas.map(nombre));
  const tit = rep.mismo || !p ? `Ya lo llevaste con ${esc(quien)} el ${corta(rep.f)}` : `Ya llevaste ${esc(comillas(p.nombre))} con ${esc(quien)} el ${corta(rep.f)}`;
  abrir('hoja', () => hojaCab('Aviso de repetición', '¿Repites?') +
    `<div class="rep"><span class="voz">${tit}</span><p>Fue en ${esc(comillas(rep.plan || rep.look.nombre))}. ¿Y si esta vez lo combinas distinto?</p></div>
    <div class="acciones"><button class="btn pri" data-a="rep-otro">${icono('chispa', 18)} Proponme otro</button><button class="btn sec" data-a="rep-igual">${cb.textoIgual || 'Ponérmelo igual'}</button></div>`,
    { titulo: 'Aviso de repetición', props: { _otro: cb.otro, _igual: cb.igual } });
}
function abrirAjustes() {
  abrir('hoja', () => hojaCab('Perfil', 'Ajustes', false) + `<div class="opciones">
    <button class="opc" data-a="editar-perfil"><span class="ic">${icono('perfil')}</span><span><b>Editar perfil</b><span>Tu nombre y tu foto</span></span></button>
    <button class="opc" data-a="peticiones"><span class="ic">${icono('sobre')}</span><span><b>Préstamos</b><span>Peticiones y prendas prestadas</span></span></button>
    ${instalada() ? '' : `<button class="opc" data-a="instalar"><span class="ic">${icono('publicar')}</span><span><b>Instalar Occasio en tu móvil</b><span>Ábrela a pantalla completa, como una app</span></span></button>`}
    ${S.admin ? `<button class="opc" data-a="admin"><span class="ic">${icono('filtro')}</span><span><b>Panel de administración</b><span>Solo lo ves tú: usuarias, actividad y lista para el CRM</span></span></button>` : ''}
    <label class="opc interr" style="cursor:pointer"><span class="ic">${icono('sobre')}</span><span style="flex:1"><b>Novedades por correo</b><span>Recibir correos de Occasio con novedades</span></span><input type="checkbox" data-in="novedades" ${S.perfil && S.perfil.acepta_novedades ? 'checked' : ''}></label>
    <a class="opc" href="privacidad.html" target="_blank" rel="noopener"><span class="ic">${icono('ok')}</span><span><b>Política de privacidad</b><span>Qué datos guardamos y para qué</span></span></a>
    <button class="opc" data-a="cerrar-sesion"><span class="ic">${icono('atras')}</span><span><b>Cerrar sesión</b><span>${esc((yo && yo.email) || '')}</span></span></button>
    <button class="opc" data-a="borrar-cuenta"><span class="ic">${icono('cerrar')}</span><span><b>Borrar mi cuenta</b><span>Se borran tu armario, tus looks y tus fotos</span></span></button>
  </div>`, { titulo: 'Ajustes' });
}
/* ---------- Instalar como app (pantalla completa) ---------- */
let avisoInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); avisoInstalar = e; });
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function instalarApp() {
  if (avisoInstalar) {
    avisoInstalar.prompt();
    const r = await avisoInstalar.userChoice.catch(() => null);
    avisoInstalar = null;
    if (r && r.outcome === 'accepted') aviso('Occasio instalada: ábrela desde tu pantalla de inicio');
    return;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  abrir('hoja', () => hojaCab('Pantalla completa', 'Instala Occasio en tu móvil') +
    `<p style="margin:-4px 0 16px">Así se abre a pantalla completa, sin la barra del navegador, como cualquier otra app.</p>
    ${ios ? `<ol class="pasos"><li>Abre esta página en <b>Safari</b>.</li><li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li><li>Elige <b>«Añadir a pantalla de inicio»</b> y toca <b>Añadir</b>.</li></ol>`
      : `<ol class="pasos"><li>Abre esta página en <b>Chrome</b>.</li><li>Toca el menú <b>⋮</b> (arriba a la derecha).</li><li>Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li></ol>`}
    <p class="sub" style="margin-top:12px">Después, abre Occasio desde el icono de la percha en tu pantalla de inicio.</p>`, { titulo: 'Instalar Occasio' });
}

/* ---------- Panel de administración (solo cuentas de la tabla «admins») ---------- */
const FILTROS_ADMIN = [['todas', 'Todas'], ['activas', 'Activas 7 días'], ['novedades', 'Aceptan novedades'], ['vacias', 'Sin prendas']];
const fechaHora = ts => ts ? new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const haceTs = ts => ts ? haceTxt(fechaDe(ts)) : 'Nunca';
function filasAdmin(el) {
  const q = (el._q || '').trim().toLowerCase(), h = hoy();
  return (el._filas || []).filter(u =>
    (!q || (u.nombre || '').toLowerCase().includes(q) || (u.correo || '').toLowerCase().includes(q)) &&
    (el._f !== 'activas' || (u.ultima_actividad && dif(h, fechaDe(u.ultima_actividad)) <= 7)) &&
    (el._f !== 'novedades' || u.acepta_novedades) &&
    (el._f !== 'vacias' || !u.prendas));
}
function listaAdmin(el) {
  const fs = filasAdmin(el);
  if (!fs.length) return `<p class="vacio-txt">No hay usuarias con ese filtro.</p>`;
  return `<p class="h-sec">${fs.length} ${fs.length === 1 ? 'usuaria' : 'usuarias'}</p>` + fs.map(u => `<div class="peti adm">
    <div class="adm-cab"><div><b>${esc(u.nombre || 'Sin nombre')}</b><small>${esc(u.correo || '')}</small></div>${u.acepta_novedades ? '<span class="adm-tag">Novedades ✓</span>' : ''}</div>
    <small>Alta: ${esc(fechaHora(u.alta))} · Último acceso: ${esc(haceTs(u.ultimo_acceso))} · Última actividad: ${esc(haceTs(u.ultima_actividad))}</small>
    <div class="adm-nums"><span><b>${u.prendas}</b> prendas</span><span><b>${u.looks}</b> looks</span><span><b>${u.amigas}</b> amigas</span><span><b>${u.publicaciones}</b> publicadas</span><span><b>${u.prestamos_pedidos}</b> pedidos</span><span><b>${u.prestamos_hechos}</b> prestados</span><span><b>${u.dias_planificados}</b> días planificados</span></div>
  </div>`).join('');
}
function abrirAdmin() {
  const el = abrir('pag', el => {
    const fs = el._filas || [], h = hoy();
    const dias = (ts, n) => ts && dif(h, fechaDe(ts)) <= n;
    const suma = k => fs.reduce((t, u) => t + (u[k] || 0), 0);
    const cifras = [
      ['Usuarias', fs.length], ['Nuevas (7 días)', fs.filter(u => dias(u.alta, 7)).length],
      ['Activas (7 días)', fs.filter(u => dias(u.ultima_actividad, 7)).length], ['Aceptan novedades', fs.filter(u => u.acepta_novedades).length],
      ['Prendas subidas', suma('prendas')], ['Préstamos pedidos', suma('prestamos_pedidos')]
    ];
    return `<header class="top borde"><button class="ib" data-a="cerrar" aria-label="Volver">${icono('atras')}</button><b>Administración</b><button class="ib" data-a="admin-recargar" aria-label="Actualizar">${icono('otra', 20)}</button></header>
    <div class="pant">
      <div class="cab" style="padding-top:12px"><p class="eti">Solo lo ves tú</p><h1 class="tit voz">Panel de Occasio</h1></div>
      ${el._error ? `<div class="vacia"><span class="voz">No se ha podido cargar</span><p>${esc(el._error)}</p></div>` : !el._filas ? `<p class="vacio-txt">Cargando usuarias…</p>` : `
      <div class="adm-cifras">${cifras.map(([t, n]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>
      <button class="btn pri ancho" data-a="admin-csv" style="margin-bottom:6px">${icono('publicar', 18)} Descargar lista para el CRM (Excel / Google Sheets)</button>
      <p class="sub" style="margin-bottom:16px">Descarga las usuarias del filtro que tengas elegido. Para enviar correos comerciales, usa solo las que aceptan novedades.</p>
      <label class="campo"><span class="sr">Buscar por nombre o correo</span><input class="inp" data-in="adm-buscar" value="${esc(el._q || '')}" placeholder="Buscar por nombre o correo" autocomplete="off"></label>
      <div class="fila-x" role="group" aria-label="Filtrar usuarias" style="margin-bottom:6px">${FILTROS_ADMIN.map(([k, t]) => `<button class="chip" data-a="admin-filtro" data-v="${k}" aria-pressed="${el._f === k}">${t}</button>`).join('')}</div>
      <div id="adm-lista">${listaAdmin(el)}</div>`}
    </div>`;
  }, { titulo: 'Administración', props: { _filas: null, _q: '', _f: 'todas', _error: '' } });
  cargarAdmin(el);
}
async function cargarAdmin(el) {
  const { data, error } = await sb.rpc('admin_usuarias');
  el._error = error ? traducir(error) : '';
  el._filas = data || [];
  repinta(el);
}
function descargarCSV(el) {
  const fs = filasAdmin(el);
  if (!fs.length) { aviso('No hay usuarias para descargar con ese filtro.'); return; }
  const cab = ['Nombre', 'Correo', 'Fecha de alta', 'Último acceso', 'Última actividad', 'Acepta novedades', 'Prendas', 'Looks', 'Amigas', 'Publicaciones', 'Préstamos pedidos', 'Préstamos hechos', 'Días planificados'];
  const celda = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const filas = fs.map(u => [u.nombre, u.correo, fechaHora(u.alta), fechaHora(u.ultimo_acceso), fechaHora(u.ultima_actividad), u.acepta_novedades ? 'Sí' : 'No',
    u.prendas, u.looks, u.amigas, u.publicaciones, u.prestamos_pedidos, u.prestamos_hechos, u.dias_planificados]);
  const csv = '﻿' + [cab, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `occasio-usuarias-${hoy()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  aviso(`Descargada la lista con ${fs.length} ${fs.length === 1 ? 'usuaria' : 'usuarias'}`);
}

function abrirEditarPerfil() {
  abrir('hoja', el => hojaCab('Perfil', 'Editar perfil', false) +
    `<label class="foto-perfil" aria-label="Cambiar foto de perfil">${el._src ? `<img src="${el._src}" alt="Tu foto">` : urlFoto(S.perfil.foto_path) ? `<img src="${esc(urlFoto(S.perfil.foto_path))}" alt="Tu foto">` : icono('perfil', 40)}<span class="mas">${icono('camara', 16)}</span><input class="sr" type="file" accept="image/*" data-in="perfil-foto"></label>
    <label class="campo" style="margin-top:14px"><span>Tu nombre</span><input class="inp" data-in="perfil-nombre" value="${esc(el._nombre)}" maxlength="40" autocomplete="given-name"></label>
    <button class="btn pri ancho grande" data-a="perfil-guardar">Guardar</button>`,
    { titulo: 'Editar perfil', props: { _nombre: S.perfil.nombre || '', _src: '', _blob: null } });
}
function abrirAmigas() {
  abrir('hoja', () => hojaCab('Perfil', 'Tus amigas') +
    `<ul class="lista-amigas">${S.amigas.map(a => `<li><button data-a="amiga" data-id="${a.id}">${avatar(a.id)}<span><b>${esc(a.nombre || 'Amiga')}</b><br><span class="sub">${deAmigas().filter(p => p.duena === a.id).length} prendas</span></span></button></li>`).join('')}</ul>
    <button class="btn pri ancho" data-a="invitar" style="margin-top:14px">${icono('compartir', 19)} Invitar a más amigas</button>`, { titulo: 'Tus amigas' });
}
function abrirAmiga(id) {
  const a = amigaDe(id); if (!a) return;
  abrir('hoja', () => hojaCab('Amiga', esc(a.nombre || 'Amiga')) +
    `<div style="display:grid;justify-items:center;margin-bottom:18px">${avatar(id, 'xl')}</div>
    <button class="btn pri ancho" data-a="ver-armario" data-id="${id}" style="margin-bottom:10px">Ver su armario</button>
    <button class="btn sec ancho" data-a="quitar-amiga" data-id="${id}">Quitar de mis amigas</button>`, { titulo: a.nombre || 'Amiga' });
}

/* =====================================================================
   BIENVENIDA (tras crear la cuenta)
   ===================================================================== */
let paso = 0;
function mostrarBienvenida() {
  let el = $('#onb');
  if (!el) { el = document.createElement('section'); el.className = 'onb'; el.id = 'onb'; el.setAttribute('aria-label', 'Bienvenida'); $('#app').insertBefore(el, $('#capas')); }
  el.classList.remove('sale');
  paso = 0;
  pintaBienvenida();
}
function pintaBienvenida() {
  const el = $('#onb'); if (!el) return;
  const foto = el._src || urlFoto(S.perfil.foto_path);
  const pasos = [
    () => `<div><p class="eti">Bienvenida</p><h1 class="tit voz" style="margin:6px 0 18px">¡Hola${S.perfil.nombre ? ', ' + esc(S.perfil.nombre) : ''}!</h1>
      <label class="foto-perfil" aria-label="Elegir foto de perfil">${foto ? `<img src="${esc(foto)}" alt="Tu foto de perfil">` : icono('perfil', 40)}<span class="mas">${icono('camara', 16)}</span><input class="sr" type="file" accept="image/*" data-in="onb-foto"></label>
      <p class="sub" style="margin-top:12px">Pon una foto para que tus amigas te reconozcan. Puedes hacerlo más tarde.</p></div>`,
    () => `<div><p class="eti">Tu armario</p><h1 class="tit voz" style="margin:6px 0 10px">Sube tus primeras prendas</h1>
      <p style="margin-bottom:22px">Elige varias fotos a la vez. Luego les pones tipo y color con un toque.</p>${botonesSubir()}
      <p class="sub" style="margin:18px 0 10px;text-align:center">¿Sin fotos ahora? Empieza marcando lo que tienes:</p>
      <button class="btn sec ancho" data-a="catalogo" data-onb="1">${icono('armario', 19)} Elegir del catálogo de básicos</button></div>`,
    () => `<div class="invita"><span class="avs"><span class="av" style="background:var(--lino);color:var(--cafe);box-shadow:inset 0 0 0 1.5px var(--borde)" aria-hidden="true">${icono('mas', 20)}</span></span>
      <p class="eti">Invita a tus amigas</p><h1 class="tit voz">Lo que no tienes, quizá lo tiene tu amiga.</h1>
      <p>Invítalas para ver sus armarios, pediros ropa prestada y saber qué lleváis cada una.</p>
      <button class="btn pri ancho grande" data-a="invitar">${icono('compartir', 20)} Invitar a mis amigas</button>
      <button class="btn sec ancho" data-a="copiar-inv">${icono('copiar', 18)} Copiar mi enlace</button></div>`
  ];
  const pies = [
    `<button class="btn pri ancho grande" data-a="onb-sig">Continuar</button>`,
    `<button class="btn sec ancho" data-a="onb-sig">Ahora no</button>`,
    `<button class="btn sec ancho" data-a="onb-fin">Entrar en Occasio</button>`
  ];
  el.innerHTML = `<div class="onb-top">${paso ? `<button class="ib" data-a="onb-atras" aria-label="Atrás">${icono('atras')}</button>` : '<span></span>'}
    <div class="puntos" aria-label="Paso ${paso + 1} de 3">${[0, 1, 2].map(i => `<i class="${i === paso ? 'on' : ''}"></i>`).join('')}</div>
    ${paso < 2 ? `<button class="lnk" data-a="onb-fin">Saltar</button>` : '<span style="width:44px"></span>'}</div>
    <div class="onb-c">${pasos[paso]()}</div><div class="onb-pie">${pies[paso]}</div>`;
}
function cerrarBienvenida() {
  try { localStorage.setItem('occasio_bienvenida_' + UID(), '1'); } catch (_) { /* nada */ }
  const el = $('#onb'); if (!el) return;
  el.classList.add('sale');
  setTimeout(() => el.remove(), 360);
  render();
  revisarInvitacion();
}
async function cambiarFotoPerfil(blob) {
  const viejo = S.perfil.foto_path;
  const path = await subirFoto(blob, 'perfil-');
  await q(sb.from('perfiles').update({ foto_path: path }).eq('id', UID()));
  S.perfil.foto_path = path;
  await firmar([path]);
  if (viejo) sb.storage.from('fotos').remove([viejo]);
}

/* =====================================================================
   ACCIONES
   ===================================================================== */
const capaDe = b => b.closest('.capa');
const ACC = {
  /* Acceso */
  acc: b => mostrarAcceso(b.dataset.m),

  tab: b => { cerrarTodas(); tab = b.dataset.t; ultimaTab = null; render(); },
  mas: () => abrirMas(),
  cerrar: b => cerrar(capaDe(b)),
  'confirmar-ok': b => { const c = capaDe(b); intenta(b, async () => { await c._ok(); cerrar(c); }); },

  /* Hoy */
  ponermelo: b => intenta(b, async () => {
    const l = await crearLook([...propHoy], 'Look de hoy');
    await asignarConAviso(hoy(), l.id, () => { propHoy = null; aviso('Apuntado en tu calendario: hoy llevas este look'); });
  }),
  'otra-hoy': () => { propHoy = proponer(propHoy && propHoy.length ? [principal(propHoy)] : []); render(); },
  reac: async b => {
    const id = b.dataset.id, em = b.dataset.em;
    const mia = S.reac.find(r => r.publicacion === id && r.usuaria === UID() && r.emoji === em);
    if (mia) S.reac = S.reac.filter(r => r !== mia); else S.reac.push({ publicacion: id, usuaria: UID(), emoji: em });
    render();
    const { error } = mia
      ? await sb.from('reacciones').delete().match({ publicacion: id, usuaria: UID(), emoji: em })
      : await sb.from('reacciones').insert({ publicacion: id, emoji: em });
    if (error) { aviso(traducir(error)); recargar(true); }
  },
  'post-borrar': b => confirmar('¿Borrar la publicación?', 'Dejará de verse en el inicio de tus amigas. El look sigue guardado.', 'Borrar', async () => {
    await q(sb.from('publicaciones').delete().eq('id', b.dataset.id));
    S.posts = S.posts.filter(p => p.id !== b.dataset.id);
    render(); aviso('Publicación borrada');
  }),

  /* Prendas y préstamos */
  prenda: b => abrirFicha(b.dataset.id),
  pedir: b => abrirPedir(b.dataset.id),
  'enviar-pedir': b => {
    const capa = capaDe(b), p = P(b.dataset.id);
    const desde = $('#pd-desde', capa).value || hoy(), hasta = $('#pd-hasta', capa).value || suma(hoy(), 3);
    if (hasta < desde) { aviso('La fecha de vuelta tiene que ser después de la de salida.'); return; }
    intenta(b, async () => {
      const x = await q(sb.from('prestamos').insert({ prenda: p.id, de: p.duena, desde, hasta, mensaje: $('#pd-msg', capa).value.trim().slice(0, 300) }).select().single());
      if (!S.prestamos.some(y => y.id === x.id)) S.prestamos.unshift(x);
      cerrar(capa);
      aviso(`Petición enviada a ${nombre(p.duena)}. Te avisaremos cuando conteste.`);
      refrescar();
    });
  },
  responder: b => intenta(b, async () => {
    const si = b.dataset.v === 'si';
    await q(sb.rpc('responder_prestamo', { p_id: b.dataset.id, p_acepta: si }));
    const x = S.prestamos.find(y => y.id === b.dataset.id); if (x) x.estado = si ? 'aceptada' : 'rechazada';
    aviso(si ? `Hecho: ${nombre(x.a)} verá que se la prestas` : 'Le diremos que esta vez no puedes');
    refrescar();
  }),
  devolver: b => intenta(b, async () => {
    await q(sb.rpc('devolver_prestamo', { p_id: b.dataset.id }));
    const x = S.prestamos.find(y => y.id === b.dataset.id); if (x) x.estado = 'devuelta';
    const c = capaDe(b); if (c && !c.querySelector('.h-sec')) cerrar(c);
    aviso('Marcada como devuelta');
    refrescar();
  }),
  'cancelar-pet': b => intenta(b, async () => {
    await q(sb.rpc('cancelar_prestamo', { p_id: b.dataset.id }));
    const x = S.prestamos.find(y => y.id === b.dataset.id); if (x) x.estado = 'cancelada';
    aviso('Petición cancelada');
    refrescar();
  }),
  peticiones: () => abrirPeticiones(),
  precio: b => {
    const capa = capaDe(b), v = parseFloat(($('#precio-' + b.dataset.id, capa).value || '').replace(',', '.'));
    if (!(v > 0)) { aviso('Escribe un precio mayor que cero.'); return; }
    intenta(b, async () => {
      const r = await q(sb.from('prendas').update({ precio: Math.round(v * 100) / 100 }).eq('id', b.dataset.id).select().single());
      Object.assign(P(b.dataset.id), r); repinta(capa); render();
    });
  },
  'precio-cambiar': b => intenta(b, async () => {
    await q(sb.from('prendas').update({ precio: null }).eq('id', b.dataset.id));
    P(b.dataset.id).precio = null; repinta(capaDe(b));
  }),
  'editar-prenda': b => abrirEditarPrenda(b.dataset.id),
  'ep-set': b => { const c = capaDe(b); c._e[b.dataset.k] = b.dataset.v; repinta(c); },
  'ep-guardar': b => {
    const c = capaDe(b), e = c._e;
    if (!e.nombre.trim()) { aviso('Escribe un nombre para la prenda.'); return; }
    intenta(b, async () => {
      const r = await q(sb.from('prendas').update({ nombre: e.nombre.trim().slice(0, 60), tipo: e.tipo, color: e.color, temporada: e.temporada }).eq('id', b.dataset.id).select().single());
      Object.assign(P(b.dataset.id), r);
      cerrar(c); refrescar(); aviso('Prenda guardada');
    });
  },
  'borrar-prenda': b => {
    const p = P(b.dataset.id); if (!p) return;
    confirmar('¿Borrar esta prenda?', `${esc(comillas(p.nombre))} desaparecerá de tu armario y de tus looks. No se puede deshacer.`, 'Borrar', async () => {
      await q(sb.from('prendas').delete().eq('id', p.id));
      if (p.foto_path && !esCatalogo(p.foto_path)) sb.storage.from('fotos').remove([p.foto_path]);
      S.prendas = S.prendas.filter(x => x.id !== p.id);
      cerrarTodas(); render(); aviso('Prenda borrada');
    });
  },

  /* Armario */
  'arm-modo': b => { ui.modo = b.dataset.v; render(); },
  'arm-amiga': b => { ui.amiga = b.dataset.v; render(); },
  'arm-tipo': b => { ui.tipo = b.dataset.v; render(); },
  'arm-sin': () => { ui.sinUsar = !ui.sinUsar; render(); },
  'arm-limpiar': () => { Object.assign(ui, { tipo: 'todo', color: null, temp: null, sinUsar: false }); render(); },
  'arm-color': () => abrir('hoja', () => hojaCab('Filtrar', 'Color', false) +
    `<div class="chips"><button class="chip" data-a="f-color" data-v="" aria-pressed="${!ui.color}">Todos</button>${Object.keys(COLORES).map(c => `<button class="chip" data-a="f-color" data-v="${c}" aria-pressed="${ui.color === c}"><span class="pt" style="background:${COLORES[c]}"></span>${cap(colorTxt(c))}</button>`).join('')}</div>`, { titulo: 'Filtrar por color' }),
  'f-color': b => { ui.color = b.dataset.v || null; cerrar(capaDe(b)); },
  'arm-temp': () => abrir('hoja', () => hojaCab('Filtrar', 'Temporada', false) +
    `<div class="chips"><button class="chip" data-a="f-temp" data-v="" aria-pressed="${!ui.temp}">Todas</button>${TEMPORADAS.filter(t => t[0] !== 'todo').map(([k, t]) => `<button class="chip" data-a="f-temp" data-v="${k}" aria-pressed="${ui.temp === k}">${t}</button>`).join('')}</div>`, { titulo: 'Filtrar por temporada' }),
  'f-temp': b => { ui.temp = b.dataset.v || null; cerrar(capaDe(b)); },

  /* Menú + */
  'opc-anadir': b => { const c = capaDe(b); c && cerrar(c); abrirAnadir(); },
  catalogo: b => { const c = capaDe(b); c && cerrar(c); abrirCatalogo(!!b.dataset.onb); },
  'cat-tipo': b => { const c = capaDe(b); c._tipo = b.dataset.v; repinta(c); },
  'cat-sel': b => { const c = capaDe(b), id = b.dataset.id; c._sel.has(id) ? c._sel.delete(id) : c._sel.add(id); repinta(c); },
  'cat-ver': b => abrirZoomCatalogo(capaDe(b), b.dataset.id),
  'zoom-nav': b => { const z = capaDe(b), n = z._ids.length; z._i = (z._i + +b.dataset.d + n) % n; repinta(z); },
  'zoom-sel': b => {
    const z = capaDe(b), c = z._cat, id = b.dataset.id;
    c._sel.has(id) ? c._sel.delete(id) : c._sel.add(id);
    repinta(c); repinta(z);
  },
  'cat-guardar': b => {
    const c = capaDe(b);
    const elegidas = CATALOGO.filter(it => c._sel.has(it.id) && !enArmario(it));
    if (!elegidas.length) return;
    intenta(b, async () => {
      const nuevas = await q(sb.from('prendas').insert(elegidas.map(it => ({ nombre: it.nombre, tipo: it.tipo, color: it.color, temporada: it.temporada, foto_path: it.foto }))).select());
      S.prendas.unshift(...nuevas);
      cerrar(c);
      const n = nuevas.length;
      if (c._onb && $('#onb')) { paso = 2; pintaBienvenida(); }
      else { Object.assign(ui, { modo: 'mio', tipo: 'todo', color: null, temp: null, sinUsar: false }); propHoy = null; irA('armario'); }
      aviso(`${n} ${n === 1 ? 'básico añadido' : 'básicos añadidos'} a tu armario`);
    });
  },
  'opc-crear': b => {
    const c = capaDe(b); c && cerrar(c);
    if (!miArmario().length && !deAmigas().length) { aviso('Primero añade algunas prendas.'); abrirAnadir(); return; }
    abrirCrear();
  },
  'opc-publicar': b => {
    const c = capaDe(b); c && cerrar(c);
    if (!misLooks().length) { aviso('Primero crea un look.'); return; }
    abrirPublicar();
  },

  /* Etiquetado y subida */
  'et-tipo': b => { const c = capaDe(b); c._items[+b.dataset.i].tipo = b.dataset.v; repinta(c); },
  'et-color': b => { const c = capaDe(b); c._items[+b.dataset.i].color = b.dataset.v; repinta(c); },
  'et-todas': b => {
    const c = capaDe(b), src = c._items[+b.dataset.i];
    c._items.forEach(it => { if (src.tipo) it.tipo = src.tipo; if (src.color) it.color = src.color; });
    repinta(c);
  },
  'et-guardar': b => {
    const c = capaDe(b), its = c._items;
    intenta(b, async () => {
      const filas = [];
      for (let i = 0; i < its.length; i++) {
        b.lastChild.textContent = ` Subiendo ${i + 1} de ${its.length}…`;
        const path = await subirFoto(its[i].blob);
        URLS.set(path, { url: its[i].src, exp: Infinity });
        filas.push({ nombre: nombreAuto(its[i]), tipo: its[i].tipo, color: its[i].color, temporada: 'todo', foto_path: path });
      }
      const nuevas = await q(sb.from('prendas').insert(filas).select());
      S.prendas.unshift(...nuevas);
      cerrar(c);
      const n = nuevas.length;
      if (c._onb) { paso = 2; pintaBienvenida(); }
      else { Object.assign(ui, { modo: 'mio', tipo: 'todo', color: null, temp: null, sinUsar: false }); irA('armario'); }
      aviso(`${n} ${n === 1 ? 'prenda añadida' : 'prendas añadidas'} a tu armario`);
    });
  },

  /* Crear look */
  slot: b => abrirSelector(capaDe(b), b.dataset.s),
  'sel-pest': b => { const c = capaDe(b); c._pest = b.dataset.v; repinta(c); },
  'sel-elegir': b => { const c = capaDe(b); c._ed._ed.slots[c._slot] = b.dataset.id; c._ed._ed.nota = ''; repinta(c._ed); cerrar(c); },
  'sel-quitar': b => { const c = capaDe(b); c._ed._ed.slots[c._slot] = null; repinta(c._ed); cerrar(c); },
  'ed-proponer': b => {
    const c = capaDe(b), ed = c._ed, ids = Object.values(ed.slots).filter(Boolean);
    const amigas = ed.dia && S.cal[ed.dia] ? (S.cal[ed.dia].amigas || []) : [];
    const nuevo = proponer([...(ids.length ? [principal(ids)] : []), ...(ed.dia ? excluirPara(ed.dia, amigas) : [])]);
    if (nuevo.length < 2) { aviso('Añade más prendas para que podamos proponerte looks.'); return; }
    ponerEnSlots(ed, nuevo);
    ed.nota = 'Para esta temporada, con prendas que hace tiempo que no te pones';
    repinta(c);
  },
  'ed-dia': b => { const c = capaDe(b); c._ed.dia = b.dataset.f || null; repinta(c); },
  'ed-guardar': b => guardarLookEditor(capaDe(b), b),

  /* Publicar */
  'pub-sel': b => { const c = capaDe(b); c._sel = b.dataset.id; repinta(c); },
  'pub-ok': b => {
    const c = capaDe(b); if (!c._sel) return;
    intenta(b, async () => {
      S.posts.unshift(await q(sb.from('publicaciones').insert({ look: c._sel, texto: (c._txt || '').trim().slice(0, 200) }).select().single()));
      cerrar(c);
      irA('hoy', { ancla: 'feed' });
      aviso('Publicado: tus amigas ya lo ven en su inicio');
    });
  },

  /* Calendario */
  'cal-modo': b => { ui.cal = b.dataset.v; render(); },
  sem: b => { ui.semana += +b.dataset.d; render(); },
  'cal-hoy': () => { ui.semana = 0; render(); },
  'mes-nav': b => { ui.mes += +b.dataset.d; render(); },
  dia: b => abrirDia(b.dataset.f),
  'dia-amiga': b => {
    const f = b.dataset.f, actual = ((S.cal[f] && S.cal[f].amigas) || []).slice();
    const i = actual.indexOf(b.dataset.id);
    i >= 0 ? actual.splice(i, 1) : actual.push(b.dataset.id);
    intenta(null, async () => { await guardarDia(f, { amigas: actual }); repinta(capaDe(b)); render(); });
    if (S.cal[f]) { S.cal[f].amigas = actual; repinta(capaDe(b)); }
  },
  'dia-cambiar': b => abrirElegirLook(b.dataset.f),
  'dia-quitar': b => intenta(b, async () => { await guardarDia(b.dataset.f, { look: null }); repinta(capaDe(b)); render(); aviso('Look quitado de ese día'); }),
  'el-look': b => {
    const c = capaDe(b), f = b.dataset.f;
    intenta(b, () => asignarConAviso(f, b.dataset.id, () => { cerrar(c); aviso(`Look apuntado para ${diaTxt(f)}`); }));
  },
  'el-proponer': b => {
    const c = capaDe(b), f = b.dataset.f, amigas = (S.cal[f] && S.cal[f].amigas) || [];
    const ids = proponer(excluirPara(f, amigas));
    if (ids.length < 2) { aviso('Añade más prendas para que podamos proponerte looks.'); return; }
    intenta(b, async () => {
      const l = await crearLook(ids, `Propuesta para ${diaTxt(f)}`);
      await asignarConAviso(f, l.id, () => { cerrar(c); aviso(`Propuesta apuntada para ${diaTxt(f)}`); });
    });
  },
  'el-crear': b => { const f = b.dataset.f; cerrar(capaDe(b)); abrirCrear({ dia: f }); },
  'rep-otro': b => { const c = capaDe(b); cerrar(c); intenta(null, c._otro); },
  'rep-igual': b => { const c = capaDe(b); cerrar(c); intenta(null, c._igual); },

  /* Perfil y amigas */
  'perfil-tab': b => { ui.perfil = b.dataset.v; render(); },
  ajustes: () => abrirAjustes(),
  'editar-perfil': b => { const c = capaDe(b); c && cerrar(c); abrirEditarPerfil(); },
  'perfil-guardar': b => {
    const c = capaDe(b);
    intenta(b, async () => {
      if (c._blob) await cambiarFotoPerfil(c._blob);
      const nom = (c._nombre || '').trim().slice(0, 40);
      if (nom !== (S.perfil.nombre || '')) { await q(sb.from('perfiles').update({ nombre: nom }).eq('id', UID())); S.perfil.nombre = nom; }
      cerrar(c); render(); aviso('Perfil guardado');
    });
  },
  'ver-amigas': () => abrirAmigas(),
  amiga: b => abrirAmiga(b.dataset.id),
  'ver-armario': b => { cerrarTodas(); Object.assign(ui, { modo: 'amigas', amiga: b.dataset.id, tipo: 'todo', color: null, temp: null, sinUsar: false }); irA('armario'); },
  'quitar-amiga': b => {
    const id = b.dataset.id, a = amigaDe(id);
    confirmar(`¿Quitar a ${esc((a && a.nombre) || 'esta amiga')}?`, 'Dejaréis de ver vuestros armarios y vuestros looks. Podéis volver a ser amigas con un enlace de invitación.', 'Quitar', async () => {
      const [x, y] = [UID(), id].sort();
      await q(sb.from('amistades').delete().eq('a', x).eq('b', y));
      cerrarTodas(); await cargarTodo(); render(); aviso('Ya no sois amigas en Occasio');
    });
  },
  'cerrar-sesion': b => intenta(b, async () => { await sb.auth.signOut(); salir(); }),
  admin: b => { const c = capaDe(b); c && cerrar(c); abrirAdmin(); },
  instalar: b => { const c = capaDe(b); c && cerrar(c); instalarApp(); },
  'admin-recargar': b => { const c = capaDe(b); c._filas = null; repinta(c); cargarAdmin(c); },
  'admin-filtro': b => { const c = capaDe(b); c._f = b.dataset.v; repinta(c); },
  'admin-csv': b => descargarCSV(capaDe(b)),
  'borrar-cuenta': () => confirmar('¿Borrar tu cuenta?', 'Se borrarán para siempre tu armario, tus fotos, tus looks, tu calendario y tus publicaciones. No se puede deshacer.', 'Borrar mi cuenta', async () => {
    const mias = await q(sb.storage.from('fotos').list(UID(), { limit: 1000 }));
    if (mias && mias.length) await sb.storage.from('fotos').remove(mias.map(f => `${UID()}/${f.name}`));
    await q(sb.rpc('borrar_cuenta'));
    try { localStorage.removeItem('occasio_bienvenida_' + UID()); } catch (_) { /* nada */ }
    await sb.auth.signOut({ scope: 'local' });
    salir();
    aviso('Tu cuenta y tus datos se han borrado.');
  }),
  invitar: () => invitar(),
  'copiar-inv': () => copiarTexto(enlaceInvitacion(), 'Enlace copiado. Pégalo en el chat de tus amigas.'),
  'inv-si': b => intenta(b, async () => {
    await q(sb.rpc('aceptar_invitacion', { p_codigo: b.dataset.c }));
    borrarInvitacion();
    cerrar(capaDe(b));
    await cargarTodo(); render();
    aviso('¡Ya sois amigas! Ahora podéis ver vuestros armarios.');
  }),
  'inv-no': b => { borrarInvitacion(); cerrar(capaDe(b)); },

  /* Bienvenida */
  'onb-sig': b => intenta(b, async () => {
    const el = $('#onb');
    if (paso === 0 && el && el._blob) { await cambiarFotoPerfil(el._blob); el._blob = null; }
    paso = Math.min(2, paso + 1); pintaBienvenida();
  }),
  'onb-atras': () => { paso = Math.max(0, paso - 1); pintaBienvenida(); },
  'onb-fin': () => cerrarBienvenida()
};

const IN = {
  'ed-nombre': t => { capaDe(t)._ed.nombre = t.value; },
  'ed-texto': t => { capaDe(t)._ed.texto = t.value; },
  'pub-texto': t => { capaDe(t)._txt = t.value; },
  'ep-nombre': t => { capaDe(t)._e.nombre = t.value; },
  'adm-buscar': t => { const c = capaDe(t); c._q = t.value; const l = $('#adm-lista', c); if (l) l.innerHTML = listaAdmin(c); },
  'perfil-nombre': t => { capaDe(t)._nombre = t.value; },
  'dia-plan': t => {
    const f = t.dataset.f;
    if (S.cal[f]) S.cal[f].plan = t.value;
    clearTimeout(t._t);
    t._t = setTimeout(() => intenta(null, () => guardarDia(f, { plan: t.value.slice(0, 80) })), 600);
  }
};
const CH = {
  fotos: t => procesarFotos(t),
  'onb-foto': async t => {
    const f = t.files && t.files[0]; t.value = '';
    if (!f) return;
    try { const r = await leerFoto(f, 320); const el = $('#onb'); el._src = r.src; el._blob = r.blob; pintaBienvenida(); }
    catch (e) { aviso(traducir(e)); }
  },
  'perfil-foto': async t => {
    const f = t.files && t.files[0]; t.value = '';
    if (!f) return;
    try { const r = await leerFoto(f, 320); const c = capaDe(t); c._src = r.src; c._blob = r.blob; repinta(c); }
    catch (e) { aviso(traducir(e)); }
  },
  'ed-publicar': t => { const c = capaDe(t); c._ed.publicar = t.checked; repinta(c); },
  novedades: t => intenta(null, async () => {
    const v = t.checked;
    await q(sb.from('perfiles').update({ acepta_novedades: v }).eq('id', UID()));
    S.perfil.acepta_novedades = v;
    aviso(v ? 'Recibirás novedades de Occasio por correo' : 'Ya no recibirás novedades por correo');
  })
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const fn = ACC[b.dataset.a];
  if (fn) { e.preventDefault(); fn(b, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f || !FORMS[f.dataset.form]) return;
  e.preventDefault();
  const b = $('button[type=submit]', f);
  $('.error', f).textContent = '';
  intenta(b, () => FORMS[f.dataset.form](f));
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.in; if (k && IN[k]) IN[k](e.target); });
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.in; if (k && CH[k]) CH[k](e.target); });
document.addEventListener('keydown', e => {
  const top = $('#capas').lastElementChild;
  if (e.key === 'Escape' && top) cerrar();
  if (top && $('.zoom', top) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const b = $(`[data-a=zoom-nav][data-d="${e.key === 'ArrowLeft' ? -1 : 1}"]`, top); if (b) b.click();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !yo || Date.now() - ultimaCarga < 30e3) return;
  sb.rpc('procesar_dias', { p_hoy: hoy() }).then(() => recargar(true));
});
// Por si algún aviso en tiempo real no llega: refresco suave cada minuto con la app a la vista
setInterval(() => {
  if (document.hidden || !yo || Date.now() - ultimaCarga < 55e3 || $('#capas').childElementCount) return;
  recargar(true);
}, 60e3);

/* =====================================================================
   ARRANQUE
   ===================================================================== */
$$('[data-ico]').forEach(s => { s.outerHTML = icono(s.dataset.ico, s.dataset.ico === 'mas' ? 26 : 23); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
guardarInvitacionDeURL();
if (/type=recovery/.test(location.hash)) recuperando = true;
if (!configurado) { sinCarga(); mostrarAcceso('sin-config'); return; }

sb.auth.onAuthStateChange((evento, sesion) => {
  // No se llama a Supabase dentro de este aviso (lo recomienda su documentación)
  setTimeout(() => {
    if (evento === 'PASSWORD_RECOVERY') { recuperando = true; sinCarga(); mostrarAcceso('nueva-clave'); return; }
    if (evento === 'SIGNED_OUT') { if (yo) salir(); return; }
    if (sesion && sesion.user && !recuperando && (!yo || yo.id !== sesion.user.id)) entrar(sesion.user);
  }, 0);
});
sb.auth.getSession().then(({ data }) => {
  if (recuperando) { sinCarga(); mostrarAcceso('nueva-clave'); return; }
  if (data && data.session) entrar(data.session.user);
  else { sinCarga(); if (!$('#acceso')) mostrarAcceso(leerInvitacion() ? 'registro' : 'inicio'); }
});
})();

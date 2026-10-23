// elita.js
// Pantallas de Elita: el inicio y la sesión guiada, una cosa por pantalla.
// Inicio → (permiso, solo la primera vez) → ¿cómo te sentís? → preparación →
// por cada ejercicio: presentación → EMPEZAR → 3, 2, 1 → trabajo / cambio de lado / descanso
// → final con "¿Cómo te sentiste?". Máximo una sesión por día.
import { bloquesDeSesion, duracionEstimadaSeg, SEGUNDOS_CUENTA_ATRAS, DIAS_POR_SEMANA, FASES } from "./plan-retina.js?v=2";
import { diasHechosSemana, numeroDeDia, TOTAL_DIAS } from "./progreso-plan.js?v=2";
import {
  tramosDeBloque,
  puntoDeRetomar,
  textoCambioDeLado,
  textoResumen,
  textoReloj,
  minutosRedondeados,
  POSICIONES,
} from "./sesion.js?v=2";
import { hablar, callar, configurarVoz, desbloquearAudio, sonarAlarma, sonarFanfarria, sonarTic, sonarYa } from "./voz.js?v=2";
import { mostrarDialogo, confirmar } from "./dialogo.js?v=2";
import { abrirVideos, videosDelEjercicio } from "./videos.js?v=2";
import { diagramaPies } from "./dibujos.js?v=2";

// Lo que viene de app.js: { obtenerPlan, actualizarPlan, guardarSesion, hoyISO, mostrarProgreso, modoPrueba }
let dep = null;
// En modo prueba (?prueba=1) todos los tiempos se dividen por 10.
let factor = 1;

const CLAVE_EN_CURSO = "mis-ejercicios-sesion-en-curso-elita";

const AVISO_JUAN_ANTES = "Hola Juan, hoy no me siento bien y no hice los ejercicios. — Elita";
const AVISO_JUAN_DURANTE = "Hola Juan, me sentí mal mientras hacía los ejercicios y paré. — Elita";

const SENALES_HTML = `
  <div class="senales">
    <div class="senal-bloque">
      <p class="senal-titulo">👁️ Del ojo — llamar al oftalmólogo HOY:</p>
      <ul>
        <li>destellos de luz</li>
        <li>muchas "moscas" o puntos nuevos</li>
        <li>una sombra o cortina en la vista</li>
        <li>ver peor de golpe</li>
        <li>dolor fuerte en el ojo</li>
      </ul>
    </div>
    <div class="senal-bloque">
      <p class="senal-titulo">❤️ Del cuerpo — parar y sentarse; si no pasa en unos minutos, pedir ayuda médica:</p>
      <ul>
        <li>dolor u opresión en el pecho</li>
        <li>mareo</li>
        <li>falta de aire que no deja hablar</li>
        <li>palpitaciones</li>
        <li>náuseas</li>
        <li>sudor frío</li>
      </ul>
    </div>
  </div>
`;

const PREPARACION = [
  ["🪑", "Silla firme con apoyabrazos, contra la pared"],
  ["👟", "Zapatos cerrados"],
  ["💧", "Agua cerca"],
  ["🤚", "Mesada o respaldo libre para agarrarte"],
  ["📱", "Celular apoyado a la altura de tus ojos"],
];

// --- Estado de la sesión en curso ---
// sesion: { fecha, semana, version, comoEstaba, inicio, bloque, tramo, hechos, saltados, acumuladoMs }
let sesion = null;
let bloques = [];
// reloj: { bl, pasos, k, fin, pausaRestante, ultimoSeg, mitadDicha }
let reloj = null;
let intervalo = null;
// Desde cuándo está corriendo el temporizador (para sumar los minutos reales de ejercicio).
let activoDesde = null;
let wakeLock = null;

const $ = (id) => document.getElementById(id);

function esc(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function plan() {
  return dep.obtenerPlan();
}

function hoy() {
  return dep.hoyISO();
}

export function configurarElita(dependencias) {
  dep = dependencias;
  factor = dep.modoPrueba ? 0.1 : 1;
  $("btn-me-siento-mal").addEventListener("click", meSientoMal);
  document.addEventListener("visibilitychange", () => {
    if (!sesion) return;
    if (document.visibilityState === "visible") {
      pedirWakeLock(); // el celular la suelta al pasar a segundo plano
      tick();
    } else {
      guardarEnCurso();
    }
  });
}

export function estaEnSesion() {
  return !$("sesion").hidden;
}

// --- Ajustes (voz y tamaño de letra) ---
export function aplicarAjustes() {
  const ajustes = plan().ajustes;
  configurarVoz(ajustes.voz !== false);
  document.documentElement.classList.toggle("letra-muy-grande", ajustes.letra === "muy-grande");
}

export function quitarAjustes() {
  document.documentElement.classList.remove("letra-muy-grande");
  callar();
}

// --- Sesión guardada en el celular (para retomar el mismo día) ---
function leerEnCurso() {
  try {
    const datos = localStorage.getItem(CLAVE_EN_CURSO);
    return datos ? JSON.parse(datos) : null;
  } catch (e) {
    return null;
  }
}

function acumuladoAhora() {
  return sesion.acumuladoMs + (activoDesde ? Date.now() - activoDesde : 0);
}

function guardarEnCurso() {
  if (!sesion) return;
  try { localStorage.setItem(CLAVE_EN_CURSO, JSON.stringify({ ...sesion, acumuladoMs: acumuladoAhora() })); } catch (e) {}
}

function borrarEnCurso() {
  try { localStorage.removeItem(CLAVE_EN_CURSO); } catch (e) {}
}

function marcarActivo() {
  if (!activoDesde) activoDesde = Date.now();
}

function marcarInactivo() {
  if (activoDesde) {
    sesion.acumuladoMs += Date.now() - activoDesde;
    activoDesde = null;
  }
}

function sesionCerrada(datos, estado, { esfuerzo = null, malestarDurante = false, fin = Date.now() } = {}) {
  return {
    semana: datos.semana,
    version: datos.version,
    estado,
    comoEstaba: datos.comoEstaba,
    esfuerzo,
    malestarDurante,
    inicio: datos.inicio,
    fin,
    duracionMs: Math.round(datos.acumuladoMs),
    hechos: [...datos.hechos],
    saltados: [...datos.saltados],
  };
}

// Una sesión que quedó a medias otro día se guarda como "parcial" (no se pierde lo hecho).
function cerrarSesionesViejas() {
  if (sesion) return;
  const enCurso = leerEnCurso();
  if (!enCurso) return;
  const p = plan();
  if (enCurso.fecha === hoy() && !p.sesiones[enCurso.fecha]) return;
  if (enCurso.fecha !== hoy() && !p.sesiones[enCurso.fecha] && enCurso.hechos.length > 0) {
    dep.guardarSesion(enCurso.fecha, sesionCerrada(enCurso, "parcial", { fin: enCurso.inicio + enCurso.acumuladoMs }));
  }
  borrarEnCurso();
}

// --- Pantalla de inicio ---
export function mostrarInicio() {
  cerrarPantallaSesion();
  dep.mostrarInicioElita();
  renderInicio();
}

export function renderInicio() {
  const cont = $("elita-inicio");
  if (!cont) return;
  cerrarSesionesViejas();
  aplicarAjustes();
  const p = plan();
  const h = hoy();
  const sesionHoy = p.sesiones[h];
  const enCurso = leerEnCurso();
  const permiso = p.ajustes.permisoOftalmologo;
  const { dia, mantenimiento } = numeroDeDia(p, h);
  const hechos = Math.min(DIAS_POR_SEMANA, diasHechosSemana(p));
  const minutos = Math.round(duracionEstimadaSeg(p.semanaActual) / 60);
  const circulos = Array.from({ length: DIAS_POR_SEMANA }, (_, i) => `<span class="circulo${i < hechos ? " lleno" : ""}"></span>`).join("");

  let accion;
  if (sesionHoy && sesionHoy.estado === "malestar") {
    accion = `
      <div class="tarjeta-hecho tarjeta-descanso">💙 Hoy descansamos. ¡Mañana seguimos!</div>`;
  } else if (sesionHoy) {
    accion = `
      <div class="tarjeta-hecho">✓ Hoy ya hiciste tus ejercicios. ¡Mañana seguimos!</div>
      <p class="texto-suave-grande">Si querés, salí a caminar un ratito por un lugar plano.</p>`;
  } else if (enCurso && enCurso.fecha === h) {
    accion = `
      <p class="pregunta">¿Seguimos donde quedaste?</p>
      <button type="button" id="btn-seguir" class="btn-grande btn-accion">▶ SÍ, SEGUIR</button>
      <button type="button" id="btn-terminar-hoy" class="btn-grande btn-secundario-grande">Terminar por hoy</button>`;
  } else if (permiso && permiso.ok === false) {
    accion = `
      <div class="tarjeta-hecho tarjeta-descanso">Esperemos el permiso del oftalmólogo 💙</div>
      <button type="button" id="btn-ya-permiso" class="btn-grande btn-secundario-grande">El oftalmólogo ya me dio permiso</button>`;
  } else {
    accion = `<button type="button" id="btn-empezar" class="btn-grande btn-accion btn-enorme">▶ EMPEZAR MIS EJERCICIOS</button>`;
  }

  cont.innerHTML = `
    <div class="tarjeta-plan">
      <p class="plan-semana">Semana ${p.semanaActual} · ${mantenimiento ? "Mantenimiento" : `Día ${dia} de ${TOTAL_DIAS}`}</p>
      <div class="circulos" aria-hidden="true">${circulos}</div>
      <p class="plan-detalle">${hechos} de ${DIAS_POR_SEMANA} días hechos esta semana</p>
      <p class="plan-detalle">⏱️ Unos ${minutos} minutos</p>
    </div>
    ${accion}
    <button type="button" id="btn-mi-progreso" class="btn-grande btn-secundario-grande">📅 Mi progreso</button>
    <div class="ajustes-fila">
      <button type="button" id="ajuste-voz" class="btn-grande btn-ajuste">${p.ajustes.voz !== false ? "🔊 Voz: Sí" : "🔇 Voz: No"}</button>
      <button type="button" id="ajuste-letra" class="btn-grande btn-ajuste">🔠 Letra: ${p.ajustes.letra === "muy-grande" ? "Muy grande" : "Grande"}</button>
    </div>
  `;

  $("btn-empezar")?.addEventListener("click", empezarFlujo);
  $("btn-seguir")?.addEventListener("click", retomarSesion);
  $("btn-terminar-hoy")?.addEventListener("click", async () => {
    if (!(await confirmar("¿Terminamos por hoy?", "Lo que hiciste queda guardado.", "SÍ, TERMINAR", "NO"))) return;
    const guardada = leerEnCurso();
    if (guardada) dep.guardarSesion(guardada.fecha, sesionCerrada(guardada, "parcial"));
    borrarEnCurso();
    renderInicio();
  });
  $("btn-ya-permiso")?.addEventListener("click", pantallaPermiso);
  $("btn-mi-progreso").addEventListener("click", dep.mostrarProgreso);
  $("ajuste-voz").addEventListener("click", () => {
    dep.actualizarPlan({ ajustes: { voz: plan().ajustes.voz === false } });
    renderInicio();
  });
  $("ajuste-letra").addEventListener("click", () => {
    dep.actualizarPlan({ ajustes: { letra: plan().ajustes.letra === "muy-grande" ? "grande" : "muy-grande" } });
    renderInicio();
  });
}

// --- Pantallas de la sesión (ocupan toda la pantalla) ---
// pie: botón principal que queda fijo abajo, siempre a la vista (arriba de "Me siento mal").
function mostrarEnSesion(html, { barra = true, tema = "", pie = "" } = {}) {
  const contenedor = $("sesion");
  contenedor.className = `sesion ${tema}`.trim();
  contenedor.hidden = false;
  $("sesion-contenido").innerHTML = `<div class="sesion-cuerpo">${html}</div>`;
  $("sesion-pie").innerHTML = pie;
  $("sesion-barra").hidden = !barra;
  $("sesion-contenido").scrollTop = 0;
}

function cerrarPantallaSesion() {
  $("sesion").hidden = true;
  $("sesion-contenido").innerHTML = "";
}

function alClic(id, fn) {
  const el = $(id);
  if (el) el.addEventListener("click", fn);
}

function empezarFlujo() {
  const permiso = plan().ajustes.permisoOftalmologo;
  if (!permiso || !permiso.ok) pantallaPermiso();
  else pantallaChequeo();
}

function pantallaPermiso() {
  mostrarEnSesion(`
    <p class="icono-grande" aria-hidden="true">👁️</p>
    <h1 class="titulo-sesion">¿Tu oftalmólogo ya te dio permiso para hacer ejercicio suave?</h1>
    <button type="button" id="permiso-si" class="btn-grande btn-accion">SÍ</button>
    <button type="button" id="permiso-no" class="btn-grande btn-secundario-grande">TODAVÍA NO</button>
  `, { barra: false });
  alClic("permiso-si", () => {
    dep.actualizarPlan({ ajustes: { permisoOftalmologo: { ok: true, fecha: hoy() } } });
    pantallaChequeo();
  });
  alClic("permiso-no", () => {
    dep.actualizarPlan({ ajustes: { permisoOftalmologo: { ok: false, fecha: hoy() } } });
    mostrarEnSesion(`
      <p class="icono-grande" aria-hidden="true">💙</p>
      <h1 class="titulo-sesion">Esperemos el permiso del oftalmólogo 💙</h1>
      <p class="texto-sesion">Hoy no hacemos ejercicio. Cuando te dé permiso, avisale a Juan.</p>
      <button type="button" id="volver-inicio" class="btn-grande btn-accion">Volver al inicio</button>
    `, { barra: false });
    alClic("volver-inicio", mostrarInicio);
  });
}

function pantallaChequeo() {
  mostrarEnSesion(`
    <h1 class="titulo-sesion">¿Cómo te sentís hoy?</h1>
    <button type="button" class="btn-grande btn-opcion" data-como="bien">😊 Bien</button>
    <button type="button" class="btn-grande btn-opcion" data-como="regular">😐 Más o menos</button>
    <button type="button" class="btn-grande btn-opcion btn-opcion-mal" data-como="mal">😟 Mal o algo en el ojo</button>
    <button type="button" id="chequeo-volver" class="btn-link">← Volver</button>
  `, { barra: false });
  document.querySelectorAll("[data-como]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const como = btn.dataset.como;
      if (como === "mal") {
        const ahora = Date.now();
        dep.guardarSesion(hoy(), sesionCerrada(
          { semana: plan().semanaActual, version: "normal", comoEstaba: "mal", inicio: ahora, acumuladoMs: 0, hechos: [], saltados: [] },
          "malestar",
          { fin: ahora }
        ));
        pantallaMalestar(false);
      } else {
        pantallaPreparacion(como === "regular" ? "corta" : "normal", como);
      }
    });
  });
  alClic("chequeo-volver", mostrarInicio);
}

function pantallaPreparacion(version, comoEstaba) {
  mostrarEnSesion(`
    ${version === "corta" ? `<div class="recuadro-aviso">Hoy hacemos la versión corta. Está perfecto.</div>` : ""}
    <h1 class="titulo-sesion">Antes de empezar, fijate que tengas:</h1>
    <ul class="lista-preparacion">
      ${PREPARACION.map(([icono, texto]) => `<li><span class="prep-icono" aria-hidden="true">${icono}</span><span>${texto}</span></li>`).join("")}
    </ul>
    <button type="button" id="estoy-lista" class="btn-grande btn-accion">ESTOY LISTA</button>
    <button type="button" id="prep-volver" class="btn-link">← Volver</button>
  `, { barra: false });
  alClic("estoy-lista", () => {
    desbloquearAudio(); // en iPhone, el audio y la voz se habilitan con este toque
    iniciarSesionNueva(version, comoEstaba);
  });
  alClic("prep-volver", pantallaChequeo);
}

function iniciarSesionNueva(version, comoEstaba) {
  sesion = {
    fecha: hoy(),
    semana: plan().semanaActual,
    version,
    comoEstaba,
    inicio: Date.now(),
    bloque: 0,
    tramo: 0,
    hechos: [],
    saltados: [],
    acumuladoMs: 0,
  };
  bloques = bloquesDeSesion(sesion.semana, version);
  guardarEnCurso();
  pedirWakeLock();
  pantallaPresentacion();
}

function retomarSesion() {
  sesion = leerEnCurso();
  if (!sesion) {
    renderInicio();
    return;
  }
  bloques = bloquesDeSesion(sesion.semana, sesion.version);
  desbloquearAudio();
  pedirWakeLock();
  if (sesion.bloque >= bloques.length) pantallaFinal();
  else pantallaPresentacion();
}

function pantallaPresentacion() {
  detenerReloj();
  const bl = bloques[sesion.bloque];
  const ej = bl.ejercicio;
  const tramos = tramosDeBloque(bl);
  const retomar = sesion.tramo > 0 ? tramos[puntoDeRetomar(tramos, sesion.tramo)] : null;
  const ajustes = plan().ajustes;
  const videos = videosDelEjercicio(ej, ajustes.videosPropios[bl.ej]);
  const primeraVez = !ajustes.videosVistos[bl.ej];
  const botonVideo = videos.length === 0 ? "" : primeraVez
    ? `<button type="button" id="ver-video" class="btn-grande btn-secundario-grande latido">▶ Mirá cómo se hace (es la primera vez)</button>`
    : `<button type="button" id="ver-video" class="btn-grande btn-secundario-grande">▶ VER CÓMO SE HACE</button>`;
  mostrarEnSesion(`
    <p class="sesion-paso">Ejercicio ${sesion.bloque + 1} de ${bloques.length} · ${FASES[bl.fase]}</p>
    <h1 class="ej-titulo"><span aria-hidden="true">${ej.icono}</span> ${esc(ej.corto)}</h1>
    <p class="chip-posicion">${POSICIONES[ej.posicion] || ""}</p>
    ${ej.diagrama ? diagramaPies(ej.diagrama) : ""}
    <ol class="ej-pasos">${ej.pasos.map((paso) => `<li>${esc(paso)}</li>`).join("")}</ol>
    <div class="recuadro-cuidado">⚠️ ${esc(ej.cuidado)}</div>
    ${ej.tipo === "fuerza" ? `<p class="recordatorio-aire">🌬️ Soltá el aire al hacer fuerza, nunca lo aguantes.</p>` : ""}
    <p class="ej-resumen">${esc(textoResumen(bl))}</p>
    ${retomar ? `<div class="recuadro-aviso">Seguimos donde quedaste: vez ${retomar.serie} de ${bl.series}${retomar.lado !== null ? `, ${esc(bl.lados[retomar.lado].toLowerCase())}` : ""}.</div>` : ""}
    ${botonVideo}
    <button type="button" id="btn-saltar-ej" class="btn-link">Saltar este ejercicio</button>
  `, { pie: `<button type="button" id="btn-empezar-ej" class="btn-grande btn-accion">▶ EMPEZAR</button>` });
  alClic("ver-video", () => {
    pausarSiCorre(); // el temporizador no corre mientras se ve el video
    if (primeraVez) dep.actualizarPlan({ ajustes: { videosVistos: { [bl.ej]: hoy() } } });
    abrirVideos({
      titulo: ej.corto,
      lista: videos,
      pasos: ej.pasos,
      alCerrar: () => { if (sesion && !reloj && bloques[sesion.bloque] === bl) pantallaPresentacion(); },
    });
  });
  alClic("btn-empezar-ej", empezarBloque);
  alClic("btn-saltar-ej", async () => {
    if (!(await confirmar("¿Saltamos este ejercicio?", "No pasa nada, seguimos con el próximo.", "SÍ, SALTAR", "NO, LO HAGO"))) return;
    if (!sesion.saltados.includes(bl.id)) sesion.saltados.push(bl.id);
    siguienteBloque();
  });
}

function siguienteBloque() {
  sesion.bloque++;
  sesion.tramo = 0;
  guardarEnCurso();
  if (sesion.bloque >= bloques.length) pantallaFinal();
  else pantallaPresentacion();
}

// --- Temporizador ---
// Cada paso tiene una hora de fin; lo que falta se calcula siempre como fin − ahora, así
// no se atrasa aunque el celular se trabe o la pantalla pase un rato a segundo plano.
function empezarBloque() {
  const bl = bloques[sesion.bloque];
  const tramos = tramosDeBloque(bl);
  const desde = puntoDeRetomar(tramos, sesion.tramo);
  const pasos = [];
  for (let j = desde; j < tramos.length; j++) {
    const t = tramos[j];
    if (t.tipo === "trabajo" && (j === desde || tramos[j - 1].tipo !== "cambio")) {
      pasos.push({ tipo: "cuenta", tramo: j, t, ms: SEGUNDOS_CUENTA_ATRAS * 1000 * factor });
    }
    pasos.push({ tipo: t.tipo, tramo: j, t, ms: t.seg * 1000 * factor });
  }
  reloj = { bl, pasos, k: -1, fin: 0, pausaRestante: null, ultimoSeg: null, mitadDicha: false };
  marcarActivo();
  entrarPaso(0, Date.now());
  intervalo = setInterval(tick, 250);
}

function entrarPaso(k, desde) {
  reloj.k = k;
  const paso = reloj.pasos[k];
  reloj.fin = desde + paso.ms;
  reloj.ultimoSeg = null;
  reloj.mitadDicha = false;
  if (paso.tipo !== "cuenta") {
    sesion.tramo = paso.tramo;
    guardarEnCurso();
  }
  // Si el paso ya terminó mientras la pantalla estaba en segundo plano, no se anuncia.
  if (reloj.fin > Date.now()) {
    anunciarPaso(paso);
    pantallaPaso(paso);
  }
}

function tick() {
  if (!reloj || reloj.pausaRestante !== null) return;
  const ahora = Date.now();
  while (reloj && ahora >= reloj.fin) {
    if (!pasarAlSiguiente(reloj.fin)) return;
  }
  if (reloj) actualizarNumero(ahora);
}

// Devuelve false si terminó el ejercicio.
function pasarAlSiguiente(desde) {
  if (reloj.k + 1 >= reloj.pasos.length) {
    terminarBloque();
    return false;
  }
  entrarPaso(reloj.k + 1, desde);
  return true;
}

function terminarPasoAhora() {
  if (!reloj || reloj.pausaRestante !== null) return;
  if (pasarAlSiguiente(Date.now()) && reloj) actualizarNumero(Date.now());
}

function anunciarPaso(paso) {
  const bl = reloj.bl;
  const ej = bl.ejercicio;
  const t = paso.t;
  if (paso.tipo === "cuenta") {
    hablar(t.serie === 1 ? `Empezamos: ${ej.corto}` : `Vez ${t.serie} de ${bl.series}`);
  } else if (paso.tipo === "trabajo") {
    sonarYa();
    if (ej.tipo === "fuerza") hablar("Soltá el aire al hacer fuerza");
  } else if (paso.tipo === "cambio") {
    sonarAlarma();
    hablar(`Ahora, ${bl.lados[t.lado].toLowerCase()}`);
  } else if (paso.tipo === "descanso") {
    sonarAlarma();
    hablar("¡Muy bien! Descansá");
  }
}

const NUMEROS = ["uno", "dos", "tres"];

function actualizarNumero(ahora) {
  const paso = reloj.pasos[reloj.k];
  const restanteMs = Math.max(0, reloj.fin - ahora);
  actualizarRespiracion(paso, restanteMs);
  // Se muestran segundos "reales" del plan aunque en modo prueba el tiempo corra más rápido.
  const seg = Math.ceil(restanteMs / (1000 * factor));
  if (seg === reloj.ultimoSeg) return;
  reloj.ultimoSeg = seg;
  const numero = $("reloj-numero");
  if (numero) numero.textContent = paso.tipo === "cuenta" ? String(Math.max(1, seg)) : textoReloj(seg);
  if (paso.tipo === "cuenta" && seg >= 1) {
    sonarTic();
  } else if (paso.tipo === "trabajo") {
    if (seg >= 1 && seg <= 3 && paso.t.seg > 5) {
      sonarTic();
      hablar(NUMEROS[seg - 1]);
    } else if (!reloj.mitadDicha && !reloj.bl.ejercicio.guiaRespiracion && paso.t.seg >= 20 && restanteMs <= paso.ms / 2) {
      reloj.mitadDicha = true;
      hablar(reloj.bl.ejercicio.vozMitad || "Vas por la mitad");
    }
  }
}

// Respiración: el círculo crece al tomar aire (3 s) y se achica al soltarlo (5 s).
function actualizarRespiracion(paso, restanteMs) {
  const guia = reloj.bl.ejercicio.guiaRespiracion;
  const circulo = $("respiracion-circulo");
  if (!guia || paso.tipo !== "trabajo" || !circulo) return;
  const inhalarMs = guia.inhalar * 1000 * factor;
  const cicloMs = (guia.inhalar + guia.exhalar) * 1000 * factor;
  const enCiclo = (paso.ms - restanteMs) % cicloMs;
  const inhalando = enCiclo < inhalarMs;
  const fase = inhalando ? "inhalar" : "exhalar";
  if (circulo.dataset.fase === fase) return;
  const quedaEnFase = inhalando ? inhalarMs - enCiclo : cicloMs - enCiclo;
  if (!circulo.dataset.fase) void circulo.offsetWidth; // recién dibujado: que la transición arranque desde chico
  circulo.style.transitionDuration = `${Math.round(quedaEnFase)}ms`;
  circulo.dataset.fase = fase;
  $("respiracion-texto").textContent = inhalando ? "Tomá aire…" : "Soltá el aire…";
  // Al final se cuenta "tres, dos, uno": ahí no se pisa con la guía.
  if (restanteMs > 4000 * factor) hablar(inhalando ? "Tomá aire" : "Soltá el aire, despacito");
}

function terminarBloque() {
  const bl = reloj.bl;
  detenerReloj();
  sonarAlarma();
  hablar("¡Muy bien! Descansá");
  if (!sesion.hechos.includes(bl.id)) sesion.hechos.push(bl.id);
  siguienteBloque();
}

function detenerReloj() {
  if (intervalo) clearInterval(intervalo);
  intervalo = null;
  if (sesion) marcarInactivo();
  reloj = null;
}

function botonSaltarPrueba() {
  return dep.modoPrueba ? `<button type="button" id="btn-saltar-prueba" class="btn-link">Saltar (modo prueba)</button>` : "";
}

function pantallaPaso(paso) {
  const bl = reloj.bl;
  const ej = bl.ejercicio;
  const t = paso.t;
  const lado = t.lado != null && bl.lados ? bl.lados[t.lado].toUpperCase() : "";
  const vez = bl.series > 1 ? `Vez ${t.serie} de ${bl.series}` : "";
  const cabecera = `
    <p class="reloj-ejercicio">${esc(ej.corto)}</p>
    ${lado ? `<p class="reloj-lado">${esc(lado)}</p>` : ""}
    ${vez ? `<p class="reloj-vez">${vez}</p>` : ""}`;

  if (paso.tipo === "trabajo" && ej.guiaRespiracion) {
    mostrarEnSesion(`
      <div class="pantalla-reloj">
        <p class="reloj-ejercicio">${esc(ej.corto)}</p>
        <p class="respiracion-texto" id="respiracion-texto" aria-live="polite"></p>
        <div class="respiracion-zona">
          <div class="respiracion-circulo" id="respiracion-circulo" aria-hidden="true"></div>
          <p class="reloj-numero" id="reloj-numero"></p>
        </div>
        <button type="button" id="btn-pausa" class="btn-grande btn-accion">⏸️ PAUSA</button>
        <button type="button" id="btn-termine" class="btn-grande btn-secundario-grande">✓ Terminé</button>
        ${botonSaltarPrueba()}
      </div>
    `, { tema: "tema-trabajo" });
  } else if (paso.tipo === "cuenta" || paso.tipo === "trabajo") {
    mostrarEnSesion(`
      <div class="pantalla-reloj">
        ${cabecera}
        <p class="reloj-etiqueta">${paso.tipo === "cuenta" ? "Preparate…" : "¡Ya!"}</p>
        <p class="reloj-numero" id="reloj-numero"></p>
        ${ej.tipo === "fuerza" ? `<p class="reloj-aire">🌬️ Soltá el aire al hacer fuerza</p>` : ""}
        <button type="button" id="btn-pausa" class="btn-grande btn-accion">⏸️ PAUSA</button>
        ${paso.tipo === "trabajo" ? `<button type="button" id="btn-termine" class="btn-grande btn-secundario-grande">✓ Terminé</button>` : ""}
        ${botonSaltarPrueba()}
      </div>
    `, { tema: "tema-trabajo" });
  } else if (paso.tipo === "cambio") {
    mostrarEnSesion(`
      <div class="pantalla-reloj">
        <p class="reloj-titulo">${esc(textoCambioDeLado(bl.lados))}</p>
        <p class="reloj-lado">${esc(lado)}</p>
        <p class="reloj-numero" id="reloj-numero"></p>
        <button type="button" id="btn-pausa" class="btn-grande btn-blanco">⏸️ PAUSA</button>
        ${botonSaltarPrueba()}
      </div>
    `, { tema: "tema-cambio" });
  } else {
    mostrarEnSesion(`
      <div class="pantalla-reloj">
        <p class="reloj-titulo">DESCANSO</p>
        <p class="reloj-numero" id="reloj-numero"></p>
        <p class="reloj-texto">Tomá aire. Si querés, tomá agua.</p>
        <p class="reloj-texto">Sigue: vez ${t.serie + 1} de ${bl.series}</p>
        <button type="button" id="btn-lista" class="btn-grande btn-blanco">✓ Estoy lista</button>
        <button type="button" id="btn-mas15" class="btn-grande btn-borde-blanco">+15 segundos</button>
        ${botonSaltarPrueba()}
      </div>
    `, { tema: "tema-descanso" });
  }
  alClic("btn-pausa", pausar);
  alClic("btn-termine", terminarPasoAhora);
  alClic("btn-lista", terminarPasoAhora);
  alClic("btn-saltar-prueba", terminarPasoAhora);
  alClic("btn-mas15", () => {
    if (!reloj) return;
    reloj.fin += 15000 * factor;
    actualizarNumero(Date.now());
  });
  actualizarNumero(Date.now());
}

function pausar() {
  if (!reloj || reloj.pausaRestante !== null) return;
  reloj.pausaRestante = Math.max(0, reloj.fin - Date.now());
  marcarInactivo();
  callar();
  guardarEnCurso();
  pantallaPausa();
}

function reanudar() {
  if (!reloj || reloj.pausaRestante === null) return;
  reloj.fin = Date.now() + reloj.pausaRestante;
  reloj.pausaRestante = null;
  reloj.ultimoSeg = null;
  marcarActivo();
  pantallaPaso(reloj.pasos[reloj.k]);
}

// Si el temporizador estaba corriendo, se pausa mientras se ve un video.
function pausarSiCorre() {
  if (reloj && reloj.pausaRestante === null) {
    pausar();
    return true;
  }
  return false;
}

function pantallaPausa() {
  mostrarEnSesion(`
    <div class="pantalla-reloj">
      <p class="reloj-titulo">PAUSA</p>
      <p class="reloj-texto">Cuando quieras, seguimos.</p>
      <button type="button" id="btn-reanudar" class="btn-grande btn-accion">▶ SEGUIR</button>
      <button type="button" id="btn-terminar-pausa" class="btn-grande btn-secundario-grande">Terminar por hoy</button>
    </div>
  `);
  alClic("btn-reanudar", reanudar);
  alClic("btn-terminar-pausa", async () => {
    if (!(await confirmar("¿Terminamos por hoy?", "Lo que hiciste queda guardado.", "SÍ, TERMINAR", "NO, SEGUIR"))) return;
    terminarPorHoy();
  });
}

function terminarPorHoy() {
  detenerReloj();
  dep.guardarSesion(sesion.fecha, sesionCerrada(sesion, "parcial"));
  finSesion();
  mostrarInicio();
}

function meSientoMal() {
  if (!sesion) return;
  detenerReloj();
  dep.guardarSesion(sesion.fecha, sesionCerrada(sesion, "parcial", { malestarDurante: true }));
  finSesion();
  pantallaMalestar(true);
}

function finSesion() {
  sesion = null;
  reloj = null;
  activoDesde = null;
  borrarEnCurso();
  liberarWakeLock();
}

function botonAvisarJuan(texto) {
  const numero = String(plan().ajustes.whatsappJuan || "").replace(/\D/g, "");
  if (!numero) return `<p class="llamar-juan">📞 Llamá a Juan</p>`;
  const enlace = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  return `<a class="btn-grande btn-accion" href="${enlace}" target="_blank" rel="noopener">💬 Avisarle a Juan</a>`;
}

function pantallaMalestar(durante) {
  callar();
  mostrarEnSesion(`
    <h1 class="titulo-sesion">${durante ? "Paramos acá. Sentate y descansá." : "Hoy no hacemos ejercicio. Descansá."}</h1>
    ${SENALES_HTML}
    ${botonAvisarJuan(durante ? AVISO_JUAN_DURANTE : AVISO_JUAN_ANTES)}
    <button type="button" id="malestar-inicio" class="btn-grande btn-secundario-grande">Volver al inicio</button>
  `, { barra: false });
  alClic("malestar-inicio", mostrarInicio);
}

function pantallaFinal() {
  detenerReloj();
  const fecha = sesion.fecha;
  const cerrada = sesionCerrada(sesion, sesion.version === "corta" ? "corta" : "completa");
  // Se guarda ya (por si cierra la app sin contestar); el esfuerzo se suma después.
  const evento = dep.guardarSesion(fecha, cerrada);
  finSesion();
  hablar("¡Terminaste! Muy bien.");
  const minutos = minutosRedondeados(cerrada.duracionMs);
  mostrarEnSesion(`
    <h1 class="titulo-final">¡TERMINASTE! 🎉</h1>
    <p class="texto-sesion">Hoy hiciste ${minutos} ${minutos === 1 ? "minuto" : "minutos"} de ejercicio.</p>
    <p class="pregunta">¿Cómo te sentiste?</p>
    <button type="button" class="btn-grande btn-opcion" data-esfuerzo="muy-suave">🙂 Muy suave</button>
    <button type="button" class="btn-grande btn-opcion" data-esfuerzo="un-poco-cansada">😌 Un poco cansada</button>
    <button type="button" class="btn-grande btn-opcion" data-esfuerzo="muy-duro">😓 Muy duro</button>
  `, { barra: false });
  document.querySelectorAll("[data-esfuerzo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      dep.guardarSesion(fecha, { ...cerrada, esfuerzo: btn.dataset.esfuerzo });
      sonarFanfarria();
      pantallaDiaCerrado(fecha, evento);
    });
  });
}

function pantallaDiaCerrado(fecha, evento) {
  const { dia, mantenimiento } = numeroDeDia(plan(), fecha);
  mostrarEnSesion(`
    <div class="tarjeta-hecho">Hoy ya terminaste ✓ — ${mantenimiento ? "Mantenimiento" : `Día ${dia} de ${TOTAL_DIAS}`}</div>
    <p class="texto-suave-grande">Si querés, salí a caminar un ratito por un lugar plano.</p>
    <button type="button" id="final-inicio" class="btn-grande btn-accion">Volver al inicio</button>
  `, { barra: false });
  alClic("final-inicio", mostrarInicio);
  if (evento && evento.tipo === "semana") {
    mostrarDialogo({ titulo: `¡Completaste la Semana ${evento.completada}! Mañana empieza la Semana ${evento.siguiente} 💪`, botones: [{ texto: "¡VAMOS!", valor: true, clase: "btn-accion" }] });
  } else if (evento && evento.tipo === "mes") {
    mostrarDialogo({ titulo: "¡Completaste el mes! 🎉 Seguimos con la Semana 4 para mantener lo que lograste.", botones: [{ texto: "¡VAMOS!", valor: true, clase: "btn-accion" }] });
  }
}

// --- Pantalla siempre encendida durante la sesión ---
async function pedirWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener?.("release", () => { wakeLock = null; });
    }
  } catch (e) {
    wakeLock = null;
  }
}

function liberarWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}

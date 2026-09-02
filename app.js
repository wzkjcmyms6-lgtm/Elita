// --- Configuración fija ---
const ID_ELITA = "elita";
const CLAVE_JUAN = "1925";
const CLAVE_PERFILES = "mis-ejercicios-perfiles";
const CLAVE_PERFIL_ACTIVO = "mis-ejercicios-perfil-activo";

function hoyISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

// --- Almacenamiento ---
function cargarPerfiles() {
  const datos = localStorage.getItem(CLAVE_PERFILES);
  return datos ? JSON.parse(datos) : [];
}

function guardarPerfiles(lista) {
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(lista));
}

function asegurarPerfilElita() {
  let elita = perfiles.find((p) => p.id === ID_ELITA);
  if (!elita) {
    elita = { id: ID_ELITA, nombre: "Elita" };
    perfiles.push(elita);
    guardarPerfiles(perfiles);
  }
  return elita;
}

function ejercicioInicial(nombre, detalle, categoria) {
  return { id: crypto.randomUUID(), nombre, detalle, categoria };
}

function semana1Inicial() {
  return [
    // Calentamiento (todos los días, 8 min)
    ejercicioInicial("Círculos de cuello", "30 seg, sentada, movimientos suaves", "calentamiento"),
    ejercicioInicial("Círculos de hombros", "1 min, adelante y atrás", "calentamiento"),
    ejercicioInicial("Marcha en el lugar", "2 min, sostenida de la silla", "calentamiento"),
    ejercicioInicial("Círculos de cadera", "1 min, de pie apoyada en silla", "calentamiento"),
    ejercicioInicial("Círculos de tobillo", "30 seg por lado, sentada", "calentamiento"),
    // Bloque principal (2 series x 8-10, descanso 60 seg)
    ejercicioInicial("Sentadilla asistida en silla", "2x8 · piernas y glúteos", "principal"),
    ejercicioInicial("Puente de glúteo", "2x8 · glúteos y core", "principal"),
    ejercicioInicial("Remo sentada con banda", "2x10 · espalda", "principal"),
    ejercicioInicial("Elevación lateral de brazos", "2x10 · hombros", "principal"),
    ejercicioInicial("Báscula pélvica", "2x10 · core y espalda baja", "principal"),
    ejercicioInicial("Elevación de talones", "2x10 · pantorrillas, apoyada en silla", "principal"),
    ejercicioInicial("Extensión de tríceps con banda", "2x10 · brazos, sentada", "principal"),
    ejercicioInicial("Equilibrio en un pie", "2x10 seg por lado · equilibrio, apoyo en silla", "principal"),
    ejercicioInicial("Rodillas al pecho alternadas", "2x6 por lado · cadera y espalda", "principal"),
    // Estiramiento final (8-10 min)
    ejercicioInicial("Estiramiento de cadera", "20 seg por lado, echada", "estiramiento"),
    ejercicioInicial("Estiramiento de gemelos", "20 seg por lado, apoyada en pared", "estiramiento"),
    ejercicioInicial("Estiramiento de hombros", "20 seg por lado, sentada", "estiramiento"),
    ejercicioInicial("Respiración profunda", "2 min, echada con rodillas flexionadas", "estiramiento"),
  ];
}

function normalizarEjercicio(ej) {
  if (typeof ej.detalle === "string") return ej;
  // Formato anterior: series/reps numéricos -> se combinan en un solo texto libre.
  const series = ej.series || 1;
  const reps = ej.reps !== undefined ? ej.reps : "";
  return { id: ej.id, nombre: ej.nombre, detalle: `${series} series × ${reps}`, categoria: ej.categoria || "principal" };
}

function cargarSemanasDe(perfilId) {
  const datos = localStorage.getItem(`mis-ejercicios-datos-${perfilId}`);
  if (datos) {
    let analizado = JSON.parse(datos);
    if (Array.isArray(analizado)) {
      // Formato anterior: una sola lista de ejercicios -> pasa a ser la Semana 1.
      analizado = { 1: analizado, 2: [], 3: [], 4: [] };
    }
    let cambio = false;
    [1, 2, 3, 4].forEach((n) => {
      analizado[n] = (analizado[n] || []).map((ej) => {
        const normalizado = normalizarEjercicio(ej);
        if (normalizado !== ej) cambio = true;
        return normalizado;
      });
    });
    if (cambio) localStorage.setItem(`mis-ejercicios-datos-${perfilId}`, JSON.stringify(analizado));
    return analizado;
  }
  const iniciales = { 1: semana1Inicial(), 2: [], 3: [], 4: [] };
  localStorage.setItem(`mis-ejercicios-datos-${perfilId}`, JSON.stringify(iniciales));
  return iniciales;
}

function guardarSemanas() {
  localStorage.setItem(`mis-ejercicios-datos-${perfilActivo.id}`, JSON.stringify(semanas));
}

function cargarSemanaActualDe(perfilId) {
  const n = Number(localStorage.getItem(`mis-ejercicios-semana-actual-${perfilId}`));
  return n >= 1 && n <= 4 ? n : 1;
}

function guardarSemanaActual() {
  localStorage.setItem(`mis-ejercicios-semana-actual-${perfilActivo.id}`, String(semanaActual));
}

function todosLosEjercicios() {
  return [1, 2, 3, 4].flatMap((n) => semanas[n] || []);
}

function cargarRegistroDe(perfilId) {
  const datos = localStorage.getItem(`mis-ejercicios-registro-${perfilId}`);
  return datos ? JSON.parse(datos) : {};
}

function guardarRegistro(registro) {
  localStorage.setItem(`mis-ejercicios-registro-${perfilActivo.id}`, JSON.stringify(registro));
}

let perfiles = cargarPerfiles();
let perfilActivo = null;
let semanas = { 1: [], 2: [], 3: [], 4: [] };
let semanaActual = 1;
let registro = {};
let mesVisible = new Date();

// --- Íconos y colores por ejercicio ---
const ICONOS_POR_PALABRA = [
  [/camin|marcha/i, "🚶"],
  [/correr|trote|running/i, "🏃"],
  [/yoga/i, "🧘"],
  [/sentadilla|pierna|cuadríceps/i, "🏋️"],
  [/puente|glúteo/i, "🏋️"],
  [/pesa|fuerza|brazo|tríceps|triceps/i, "💪"],
  [/bici|ciclismo/i, "🚴"],
  [/nada|natación|piscina/i, "🏊"],
  [/estira|flexibilidad|estiramiento/i, "🤸"],
  [/equilibrio|balance/i, "🧘"],
  [/respira/i, "🌬️"],
  [/baile|bailar|zumba/i, "💃"],
  [/cuello|hombro/i, "🙆"],
  [/cadera|talon|pantorrilla|tobillo/i, "🦵"],
  [/rodilla/i, "🦵"],
  [/remo/i, "🚣"],
];

function iconoEjercicio(nombre) {
  const encontrado = ICONOS_POR_PALABRA.find(([regex]) => regex.test(nombre));
  return encontrado ? encontrado[1] : "💪";
}

const TILES = ["tile-teal", "tile-coral", "tile-oro"];

function tileEjercicio(id) {
  let suma = 0;
  for (let i = 0; i < id.length; i++) suma += id.charCodeAt(i);
  return TILES[suma % TILES.length];
}

const NOMBRES_CATEGORIA = {
  calentamiento: "Calentamiento",
  principal: "Ejercicios principales",
  estiramiento: "Estiramiento final",
};

function agruparPorCategoria(lista) {
  return ["calentamiento", "principal", "estiramiento"]
    .map((cat) => ({
      cat,
      nombre: NOMBRES_CATEGORIA[cat],
      items: lista.filter((ej) => (ej.categoria || "principal") === cat),
    }))
    .filter((g) => g.items.length > 0);
}

// --- Series individuales por ejercicio (ej. "2x8" -> Serie 1 y Serie 2 marcables por separado) ---
function contarSeries(ej) {
  const coincidencia = /^(\d+)\s*[x×]/i.exec(ej.detalle || "");
  const n = coincidencia ? parseInt(coincidencia[1], 10) : 1;
  return n > 1 ? n : 1;
}

function clavesSerie(ej) {
  const n = contarSeries(ej);
  if (n <= 1) return [ej.id];
  return Array.from({ length: n }, (_, i) => `${ej.id}#${i + 1}`);
}

function idBaseDeClave(clave) {
  return clave.split("#")[0];
}

// --- Anillos SVG ---
function crearAnillo(porcentaje, radio, grosor, colorInicio, colorFin, idGrad) {
  const centro = radio + grosor / 2 + 2;
  const tam = centro * 2;
  const circunferencia = 2 * Math.PI * radio;
  const p = Math.max(0, Math.min(100, porcentaje));
  const offset = circunferencia * (1 - p / 100);
  return `
    <svg viewBox="0 0 ${tam} ${tam}">
      <defs>
        <linearGradient id="${idGrad}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorInicio}"/>
          <stop offset="100%" stop-color="${colorFin}"/>
        </linearGradient>
      </defs>
      <circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="#e7eeec" stroke-width="${grosor}"/>
      <circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="url(#${idGrad})"
        stroke-width="${grosor}" stroke-linecap="round"
        stroke-dasharray="${circunferencia}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${centro} ${centro})"/>
    </svg>
  `;
}

function crearAnillosConcentricos(anillos) {
  const radioMax = 54;
  const grosor = 11;
  const espacio = 3;
  const centro = radioMax + grosor / 2 + 2;
  const tam = centro * 2;
  let svg = `<svg viewBox="0 0 ${tam} ${tam}"><defs></defs>`;
  anillos.forEach((a, i) => {
    const radio = radioMax - i * (grosor + espacio);
    const circunferencia = 2 * Math.PI * radio;
    const p = Math.max(0, Math.min(100, a.porcentaje));
    const offset = circunferencia * (1 - p / 100);
    svg += `
      <circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="#e7eeec" stroke-width="${grosor}"/>
      <circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="${a.color}"
        stroke-width="${grosor}" stroke-linecap="round"
        stroke-dasharray="${circunferencia}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${centro} ${centro})"/>
    `;
  });
  svg += `</svg>`;
  return svg;
}

function iniciales(nombre) {
  return nombre.trim().charAt(0).toUpperCase() || "?";
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// --- Pantallas de acceso ---
function mostrarPantallaPerfil() {
  document.getElementById("app-contenido").hidden = true;
  document.getElementById("app-juan").hidden = true;
  document.getElementById("pantalla-clave").hidden = true;
  document.getElementById("pantalla-perfil").hidden = false;
}

function mostrarPantallaClave() {
  document.getElementById("input-clave").value = "";
  document.getElementById("clave-error").hidden = true;
  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("pantalla-clave").hidden = false;
  setTimeout(() => document.getElementById("input-clave").focus(), 100);
}

document.getElementById("btn-perfil-elita").addEventListener("click", () => {
  asegurarPerfilElita();
  localStorage.setItem(CLAVE_PERFIL_ACTIVO, ID_ELITA);
  iniciarApp(ID_ELITA);
});

document.getElementById("btn-perfil-juan").addEventListener("click", () => {
  mostrarPantallaClave();
});

document.getElementById("volver-selector").addEventListener("click", () => {
  mostrarPantallaPerfil();
});

document.getElementById("form-clave").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input-clave");
  if (input.value.trim() === CLAVE_JUAN) {
    iniciarJuan();
  } else {
    document.getElementById("clave-error").hidden = false;
    input.value = "";
    input.focus();
  }
});

document.getElementById("cerrar-sesion-elita").addEventListener("click", () => {
  localStorage.removeItem(CLAVE_PERFIL_ACTIVO);
  mostrarPantallaPerfil();
});

document.getElementById("cerrar-sesion-juan").addEventListener("click", () => {
  mostrarPantallaPerfil();
});

// --- App de Elita ---
function iniciarApp(id) {
  perfilActivo = perfiles.find((p) => p.id === id);
  if (!perfilActivo) {
    mostrarPantallaPerfil();
    return;
  }
  semanas = cargarSemanasDe(id);
  semanaActual = cargarSemanaActualDe(id);
  registro = cargarRegistroDe(id);
  mesVisible = new Date();
  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("pantalla-clave").hidden = true;
  document.getElementById("app-juan").hidden = true;
  document.getElementById("app-contenido").hidden = false;
  document.getElementById("saludo-usuario").textContent = `Hola, ${perfilActivo.nombre} 👋`;
  document.getElementById("avatar-header").textContent = iniciales(perfilActivo.nombre);
  document.getElementById("fecha-hoy").textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.getElementById("semana-destino").value = String(semanaActual);
  renderSugerencias();
  renderTodo();
}

// --- Navegación por pestañas (Elita) ---
function irATab(nombreTab) {
  document.querySelectorAll("#app-contenido .nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#app-contenido .tab-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector(`#app-contenido .nav-btn[data-tab="${nombreTab}"]`).classList.add("active");
  document.getElementById(`tab-${nombreTab}`).classList.add("active");
  if (nombreTab === "progreso") renderProgreso();
  if (nombreTab === "perfil") renderPerfil();
}

document.querySelectorAll("#app-contenido .nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => irATab(btn.dataset.tab));
});

// --- Pestaña Hoy ---
function renderHoy() {
  const contenedor = document.getElementById("lista-hoy");
  const mensajeVacio = document.getElementById("sin-ejercicios-msg");
  const listaActual = semanas[semanaActual] || [];
  contenedor.innerHTML = "";

  document.getElementById("semana-actual-pill").textContent = `Semana ${semanaActual}`;

  const clave = hoyISO();
  const hechosHoy = registro[clave] || [];

  if (listaActual.length === 0) {
    mensajeVacio.hidden = false;
  } else {
    mensajeVacio.hidden = true;
    const grupos = agruparPorCategoria(listaActual);
    grupos.forEach((grupo) => {
      if (grupos.length > 1) {
        const titulo = document.createElement("p");
        titulo.className = "categoria-titulo";
        titulo.textContent = grupo.nombre;
        contenedor.appendChild(titulo);
      }
      grupo.items.forEach((ej) => {
        const claves = clavesSerie(ej);
        const card = document.createElement("div");

        if (claves.length > 1) {
          const todasHechas = claves.every((clave) => hechosHoy.includes(clave));
          card.className = "ejercicio-card multi-serie" + (todasHechas ? " hecho" : "");
          const botonesSeries = claves
            .map((clave, i) => {
              const hecha = hechosHoy.includes(clave);
              return `<button type="button" class="serie-btn${hecha ? " hecha" : ""}" data-clave="${clave}">${hecha ? "✓ " : ""}Serie ${i + 1}</button>`;
            })
            .join("");
          card.innerHTML = `
            <span class="ejercicio-icono ${tileEjercicio(ej.id)}">${iconoEjercicio(ej.nombre)}</span>
            <div class="ejercicio-info">
              <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
              <span class="ejercicio-detalle">${escapeHtml(ej.detalle)}</span>
              <div class="series-fila">${botonesSeries}</div>
            </div>
          `;
          card.querySelectorAll(".serie-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              const marcada = toggleCompletado(btn.dataset.clave);
              if (marcada) iniciarTemporizador(60);
            });
          });
        } else {
          const hecho = hechosHoy.includes(ej.id);
          card.className = "ejercicio-card" + (hecho ? " hecho" : "");
          card.innerHTML = `
            <span class="ejercicio-icono ${tileEjercicio(ej.id)}">${iconoEjercicio(ej.nombre)}</span>
            <div class="ejercicio-info">
              <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
              <span class="ejercicio-detalle">${escapeHtml(ej.detalle)}</span>
            </div>
            <button class="check-btn" aria-label="Marcar completado">✓</button>
          `;
          card.querySelector(".check-btn").addEventListener("click", () => {
            const marcada = toggleCompletado(ej.id);
            if (marcada) iniciarTemporizador(60);
          });
        }
        contenedor.appendChild(card);
      });
    });
  }

  const total = listaActual.length;
  const hechos = listaActual.filter((ej) => clavesSerie(ej).every((clave) => hechosHoy.includes(clave))).length;
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  document.getElementById("anillo-hoy-wrap").innerHTML =
    crearAnillo(porcentaje, 46, 12, "#2f9e8f", "#1f6f63", "gradAnilloHoy") +
    `<div class="anillo-porcentaje">${porcentaje}%</div>`;
  document.getElementById("anillo-hoy-detalle").textContent = `${hechos} de ${total} ejercicios`;

  renderGraficoSemana("semana-grafico");
}

function contarCompletadosAlgunaVez(lista) {
  const completados = new Set();
  Object.values(registro).forEach((ids) => ids.forEach((id) => completados.add(id)));
  return lista.filter((ej) => clavesSerie(ej).every((clave) => completados.has(clave))).length;
}

function verificarProgresionSemana() {
  const lista = semanas[semanaActual] || [];
  if (lista.length === 0) return;
  if (contarCompletadosAlgunaVez(lista) < lista.length) return;

  if (semanaActual < 4) {
    const completada = semanaActual;
    semanaActual++;
    guardarSemanaActual();
    document.getElementById("semana-destino").value = String(semanaActual);
    alert(`¡Felicitaciones! Completaste la Semana ${completada}. Ahora te toca la Semana ${semanaActual} 💪`);
  } else {
    semanaActual = 1;
    guardarSemanaActual();
    document.getElementById("semana-destino").value = String(semanaActual);
    alert("¡Felicitaciones! Completaste las 4 semanas de rutina. ¡Volvés a empezar en la Semana 1! 🎉");
  }
}

function toggleCompletado(id) {
  const clave = hoyISO();
  const hechosHoy = registro[clave] || [];
  const index = hechosHoy.indexOf(id);
  let marcada;
  if (index >= 0) {
    hechosHoy.splice(index, 1);
    marcada = false;
  } else {
    hechosHoy.push(id);
    marcada = true;
  }
  if (hechosHoy.length > 0) {
    registro[clave] = hechosHoy;
  } else {
    delete registro[clave];
  }
  guardarRegistro(registro);
  verificarProgresionSemana();
  renderTodo();
  return marcada;
}

function diaCompletado(fechaISO) {
  return !!(registro[fechaISO] && registro[fechaISO].length > 0);
}

function calcularRachaActual() {
  let racha = 0;
  let fecha = new Date();
  while (true) {
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (diaCompletado(iso)) {
      racha++;
      fecha.setDate(fecha.getDate() - 1);
    } else {
      break;
    }
  }
  return racha;
}

function calcularMejorRacha() {
  const dias = Object.keys(registro).filter((f) => registro[f].length > 0).sort();
  if (dias.length === 0) return 0;
  let mejor = 1;
  let actual = 1;
  for (let i = 1; i < dias.length; i++) {
    const anterior = new Date(dias[i - 1]);
    const actualFecha = new Date(dias[i]);
    const diff = (actualFecha - anterior) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      actual++;
    } else {
      actual = 1;
    }
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

function renderGraficoSemana(contenedorId) {
  const grafico = document.getElementById(contenedorId);
  grafico.innerHTML = "";
  const letras = ["D", "L", "M", "M", "J", "V", "S"];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const activo = diaCompletado(iso);

    const wrap = document.createElement("div");
    wrap.className = "dia-barra-wrap";
    wrap.innerHTML = `
      <div class="dia-barra ${activo ? "activo" : ""}" style="height:${activo ? "100%" : "10%"}"></div>
      <span class="dia-letra">${letras[fecha.getDay()]}</span>
    `;
    grafico.appendChild(wrap);
  }
}

// --- Resumen / calendario (reutilizado por Elita y por la vista de Juan Manolo) ---
function calcularResumenSemana() {
  let contadorSemana = 0;
  let ejerciciosSemana = 0;
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (diaCompletado(iso)) {
      contadorSemana++;
      const basesUnicas = new Set(registro[iso].map(idBaseDeClave));
      ejerciciosSemana += basesUnicas.size;
    }
  }
  return { contadorSemana, ejerciciosSemana };
}

function renderResumenStats(prefijo) {
  document.getElementById(`${prefijo}total-dias`).textContent = Object.keys(registro).filter(
    (f) => registro[f].length > 0
  ).length;
  document.getElementById(`${prefijo}mejor-racha`).textContent = calcularMejorRacha();
  const { contadorSemana } = calcularResumenSemana();
  document.getElementById(`${prefijo}total-semana`).textContent = contadorSemana;
}

function renderCalendarioEn(contenedorId, mesActualId) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  const año = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();

  document.getElementById(mesActualId).textContent = mesVisible.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const primerDia = new Date(año, mes, 1);
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const inicioSemana = primerDia.getDay();
  const isoHoy = hoyISO();

  for (let i = 0; i < inicioSemana; i++) {
    contenedor.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(año, mes, dia);
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const celda = document.createElement("div");
    celda.className = "cal-celda";
    if (diaCompletado(iso)) celda.classList.add("dia-completado");
    if (iso === isoHoy) celda.classList.add("hoy");
    celda.textContent = dia;
    contenedor.appendChild(celda);
  }
}

// --- Pestaña Progreso (Elita) ---
function renderProgreso() {
  renderResumenStats("");

  const { contadorSemana, ejerciciosSemana } = calcularResumenSemana();
  const racha = calcularRachaActual();
  const metaEjercicios = Math.max(1, (semanas[semanaActual] || []).length * 7);

  const anillos = [
    { porcentaje: (contadorSemana / 7) * 100, color: "#2f9e8f" },
    { porcentaje: (ejerciciosSemana / metaEjercicios) * 100, color: "#ef8a5f" },
    { porcentaje: (Math.min(racha, 7) / 7) * 100, color: "#c99a4a" },
  ];
  document.getElementById("anillos-semana-wrap").innerHTML = crearAnillosConcentricos(anillos);

  document.getElementById("anillos-leyenda").innerHTML = `
    <div class="leyenda-fila"><span class="leyenda-punto" style="background:#2f9e8f"></span><span class="leyenda-texto">Días activos</span><span class="leyenda-valor">${contadorSemana}/7</span></div>
    <div class="leyenda-fila"><span class="leyenda-punto" style="background:#ef8a5f"></span><span class="leyenda-texto">Ejercicios hechos</span><span class="leyenda-valor">${ejerciciosSemana}</span></div>
    <div class="leyenda-fila"><span class="leyenda-punto" style="background:#c99a4a"></span><span class="leyenda-texto">Racha actual</span><span class="leyenda-valor">${racha} días</span></div>
  `;

  renderCalendarioEn("calendario", "mes-actual");
}

document.getElementById("mes-anterior").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() - 1);
  renderCalendarioEn("calendario", "mes-actual");
});
document.getElementById("mes-siguiente").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() + 1);
  renderCalendarioEn("calendario", "mes-actual");
});

// --- Pestaña Ejercicios ---
const SUGERENCIAS = [
  { nombre: "Yoga", detalle: "1x15" },
  { nombre: "Bicicleta", detalle: "1x20" },
  { nombre: "Pesas ligeras", detalle: "3x12" },
  { nombre: "Equilibrio", detalle: "2x10 seg" },
  { nombre: "Respiración", detalle: "1x10" },
  { nombre: "Natación", detalle: "1x20" },
];

function renderSugerencias() {
  const contenedor = document.getElementById("sugerencias");
  contenedor.innerHTML = "";
  SUGERENCIAS.forEach((s) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sugerencia-chip";
    chip.textContent = `+ ${s.nombre}`;
    chip.addEventListener("click", () => {
      const semanaDestino = Number(document.getElementById("semana-destino").value);
      const categoria = document.getElementById("categoria-ejercicio").value;
      agregarEjercicio(s.nombre, s.detalle, categoria, semanaDestino);
    });
    contenedor.appendChild(chip);
  });
}

function agregarEjercicio(nombre, detalle, categoria, semanaDestino) {
  if (!semanas[semanaDestino]) semanas[semanaDestino] = [];
  semanas[semanaDestino].push({
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    detalle: detalle.trim(),
    categoria: categoria || "principal",
  });
  guardarSemanas();
  renderTodo();
  const acordeon = document.querySelector(`.semana-acordeon[data-semana="${semanaDestino}"]`);
  if (acordeon) acordeon.open = true;
}

document.getElementById("form-ejercicio").addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nombre-ejercicio").value;
  const detalle = document.getElementById("detalle-ejercicio").value;
  const categoria = document.getElementById("categoria-ejercicio").value;
  const semanaDestino = Number(document.getElementById("semana-destino").value);
  if (!nombre.trim() || !detalle.trim()) return;
  agregarEjercicio(nombre, detalle, categoria, semanaDestino);
  e.target.reset();
  document.getElementById("semana-destino").value = String(semanaDestino);
  document.getElementById("categoria-ejercicio").value = "principal";
});

function renderSemanas() {
  const contenedor = document.getElementById("lista-semanas");
  const abiertasAntes = new Set(
    Array.from(contenedor.querySelectorAll(".semana-acordeon[open]")).map((d) => d.dataset.semana)
  );
  contenedor.innerHTML = "";

  for (let n = 1; n <= 4; n++) {
    const lista = semanas[n] || [];
    const completados = contarCompletadosAlgunaVez(lista);

    const detalle = document.createElement("details");
    detalle.className = "semana-acordeon";
    detalle.dataset.semana = String(n);
    detalle.open = abiertasAntes.size > 0 ? abiertasAntes.has(String(n)) : n === semanaActual;

    detalle.innerHTML = `
      <summary class="semana-resumen">
        <span class="semana-nombre">Semana ${n}${n === semanaActual ? '<span class="semana-badge">Actual</span>' : ""}</span>
        <span class="semana-progreso">${completados}/${lista.length}</span>
      </summary>
      <div class="semana-cuerpo"></div>
    `;

    const cuerpo = detalle.querySelector(".semana-cuerpo");
    if (lista.length === 0) {
      cuerpo.innerHTML = '<p class="msg-vacio">Todavía no hay ejercicios en esta semana.</p>';
    } else {
      const grupos = agruparPorCategoria(lista);
      grupos.forEach((grupo) => {
        if (grupos.length > 1) {
          const titulo = document.createElement("p");
          titulo.className = "categoria-titulo";
          titulo.textContent = grupo.nombre;
          cuerpo.appendChild(titulo);
        }
        grupo.items.forEach((ej) => {
          const card = document.createElement("div");
          card.className = "gestion-card";
          card.innerHTML = `
            <span class="ejercicio-icono ${tileEjercicio(ej.id)}">${iconoEjercicio(ej.nombre)}</span>
            <div class="ejercicio-info">
              <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
              <span class="ejercicio-detalle">${escapeHtml(ej.detalle)}</span>
            </div>
            <button class="eliminar-btn" aria-label="Eliminar ${escapeHtml(ej.nombre)}">🗑</button>
          `;
          card.querySelector(".eliminar-btn").addEventListener("click", () => {
            if (confirm(`¿Eliminar "${ej.nombre}"?`)) {
              semanas[n] = semanas[n].filter((e) => e.id !== ej.id);
              guardarSemanas();
              renderTodo();
            }
          });
          cuerpo.appendChild(card);
        });
      });
    }

    contenedor.appendChild(detalle);
  }
}

// --- Pestaña Perfil (Elita) ---
function renderPerfil() {
  document.getElementById("avatar-grande").textContent = iniciales(perfilActivo.nombre);
  document.getElementById("perfil-resumen-nombre").textContent = perfilActivo.nombre;
  document.getElementById("perfil-racha").textContent = calcularRachaActual();
  document.getElementById("perfil-dias").textContent = Object.keys(registro).filter(
    (f) => registro[f].length > 0
  ).length;
}

function renderTodo() {
  renderHoy();
  renderSemanas();
  if (document.getElementById("tab-progreso").classList.contains("active")) {
    renderProgreso();
  }
  if (document.getElementById("tab-perfil").classList.contains("active")) {
    renderPerfil();
  }
}

// --- App de Juan Manolo (solo lectura del progreso de Elita) ---
function iniciarJuan() {
  asegurarPerfilElita();
  semanas = cargarSemanasDe(ID_ELITA);
  registro = cargarRegistroDe(ID_ELITA);
  mesVisible = new Date();

  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("pantalla-clave").hidden = true;
  document.getElementById("app-contenido").hidden = true;
  document.getElementById("app-juan").hidden = false;

  document.getElementById("fecha-hoy-juan").textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  irATabJuan("calendario");
}

function irATabJuan(nombreTab) {
  document.querySelectorAll("#app-juan .nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#app-juan .tab-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector(`#app-juan .nav-btn[data-tab-juan="${nombreTab}"]`).classList.add("active");
  document.getElementById(`tab-${nombreTab}-juan`).classList.add("active");
  if (nombreTab === "calendario") {
    renderResumenStats("jn-");
    renderCalendarioEn("jn-calendario", "jn-mes-actual");
  }
  if (nombreTab === "historial") {
    renderHistorial();
  }
}

document.querySelectorAll("#app-juan .nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => irATabJuan(btn.dataset.tabJuan));
});

document.getElementById("jn-mes-anterior").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() - 1);
  renderCalendarioEn("jn-calendario", "jn-mes-actual");
});
document.getElementById("jn-mes-siguiente").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() + 1);
  renderCalendarioEn("jn-calendario", "jn-mes-actual");
});

function renderHistorial() {
  const contenedor = document.getElementById("jn-historial");
  const vacio = document.getElementById("jn-historial-vacio");
  contenedor.innerHTML = "";

  const nombresPorId = new Map(todosLosEjercicios().map((ej) => [ej.id, ej.nombre]));
  const dias = Object.keys(registro)
    .filter((f) => registro[f].length > 0)
    .sort()
    .reverse();

  if (dias.length === 0) {
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  dias.forEach((iso) => {
    const fecha = new Date(`${iso}T00:00:00`);
    const fechaTexto = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const basesUnicas = [...new Set(registro[iso].map(idBaseDeClave))];
    const nombres = basesUnicas.map((id) => nombresPorId.get(id) || "Ejercicio eliminado");

    const card = document.createElement("div");
    card.className = "ejercicio-card hecho";
    card.innerHTML = `
      <span class="ejercicio-icono tile-teal">✓</span>
      <div class="ejercicio-info">
        <span class="ejercicio-nombre">${escapeHtml(fechaTexto)}</span>
        <span class="ejercicio-detalle">${escapeHtml(nombres.join(", "))}</span>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// --- Temporizador de descanso ---
let temporizadorIntervalo = null;

function actualizarTemporizadorUI(restante, total) {
  const porcentaje = (restante / total) * 100;
  document.getElementById("temporizador-anillo-wrap").innerHTML =
    crearAnillo(porcentaje, 76, 14, "#ef8a5f", "#c0463c", "gradTemporizador") +
    `<div class="anillo-porcentaje">${restante}</div>`;
}

function sonarAlarma() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch (e) {}
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (e) {}
  }
}

function detenerTemporizador() {
  if (temporizadorIntervalo) {
    clearInterval(temporizadorIntervalo);
    temporizadorIntervalo = null;
  }
}

function cerrarTemporizador() {
  detenerTemporizador();
  document.getElementById("temporizador-overlay").hidden = true;
}

function iniciarTemporizador(segundosTotal) {
  detenerTemporizador();
  let restante = segundosTotal;
  document.getElementById("temporizador-titulo").textContent = "Descanso";
  actualizarTemporizadorUI(restante, segundosTotal);
  document.getElementById("temporizador-overlay").hidden = false;

  temporizadorIntervalo = setInterval(() => {
    restante--;
    if (restante <= 0) {
      detenerTemporizador();
      actualizarTemporizadorUI(0, segundosTotal);
      document.getElementById("temporizador-titulo").textContent = "¡Descanso terminado! 💪";
      sonarAlarma();
    } else {
      actualizarTemporizadorUI(restante, segundosTotal);
    }
  }, 1000);
}

document.getElementById("iniciar-descanso").addEventListener("click", () => {
  iniciarTemporizador(60);
});

document.getElementById("cerrar-temporizador").addEventListener("click", () => {
  cerrarTemporizador();
});

// --- Inicio ---
const idActivoGuardado = localStorage.getItem(CLAVE_PERFIL_ACTIVO);
if (idActivoGuardado === ID_ELITA) {
  asegurarPerfilElita();
  iniciarApp(ID_ELITA);
} else {
  mostrarPantallaPerfil();
}

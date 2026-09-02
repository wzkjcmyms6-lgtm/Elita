// --- Almacenamiento ---
const CLAVE_PERFILES = "mis-ejercicios-perfiles";
const CLAVE_PERFIL_ACTIVO = "mis-ejercicios-perfil-activo";

function hoyISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function cargarPerfiles() {
  const datos = localStorage.getItem(CLAVE_PERFILES);
  return datos ? JSON.parse(datos) : [];
}

function guardarPerfiles(lista) {
  localStorage.setItem(CLAVE_PERFILES, JSON.stringify(lista));
}

function cargarEjerciciosDe(perfilId) {
  const datos = localStorage.getItem(`mis-ejercicios-datos-${perfilId}`);
  if (datos) return JSON.parse(datos);
  const iniciales = [
    { id: crypto.randomUUID(), nombre: "Caminar", series: 1, reps: 20 },
    { id: crypto.randomUUID(), nombre: "Estiramientos", series: 3, reps: 10 },
    { id: crypto.randomUUID(), nombre: "Sentadillas", series: 3, reps: 10 },
  ];
  localStorage.setItem(`mis-ejercicios-datos-${perfilId}`, JSON.stringify(iniciales));
  return iniciales;
}

function guardarEjercicios(lista) {
  localStorage.setItem(`mis-ejercicios-datos-${perfilActivo.id}`, JSON.stringify(lista));
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
let ejercicios = [];
let registro = {};
let mesVisible = new Date();

// --- Selección de usuario ---
function iniciales(nombre) {
  return nombre.trim().charAt(0).toUpperCase() || "?";
}

function renderPantallaPerfil() {
  const lista = document.getElementById("lista-perfiles");
  lista.innerHTML = "";
  perfiles.forEach((p) => {
    const fila = document.createElement("div");
    fila.className = "perfil-btn";
    fila.innerHTML = `
      <button type="button" class="perfil-seleccionar">
        <span class="perfil-avatar">${iniciales(p.nombre)}</span>
        <span>${escapeHtml(p.nombre)}</span>
      </button>
      <button type="button" class="perfil-borrar" aria-label="Eliminar a ${escapeHtml(p.nombre)}">🗑</button>
    `;
    fila.querySelector(".perfil-seleccionar").addEventListener("click", () => {
      seleccionarPerfil(p.id);
    });
    fila.querySelector(".perfil-borrar").addEventListener("click", () => {
      if (confirm(`¿Eliminar a "${p.nombre}" y todo su progreso?`)) {
        eliminarPerfil(p.id);
      }
    });
    lista.appendChild(fila);
  });
}

function seleccionarPerfil(id) {
  localStorage.setItem(CLAVE_PERFIL_ACTIVO, id);
  iniciarApp(id);
}

function eliminarPerfil(id) {
  perfiles = perfiles.filter((p) => p.id !== id);
  guardarPerfiles(perfiles);
  localStorage.removeItem(`mis-ejercicios-datos-${id}`);
  localStorage.removeItem(`mis-ejercicios-registro-${id}`);
  if (localStorage.getItem(CLAVE_PERFIL_ACTIVO) === id) {
    localStorage.removeItem(CLAVE_PERFIL_ACTIVO);
  }
  renderPantallaPerfil();
}

function mostrarPantallaPerfil() {
  document.getElementById("app-contenido").hidden = true;
  document.getElementById("pantalla-perfil").hidden = false;
  renderPantallaPerfil();
}

function iniciarApp(id) {
  perfilActivo = perfiles.find((p) => p.id === id);
  if (!perfilActivo) {
    mostrarPantallaPerfil();
    return;
  }
  ejercicios = cargarEjerciciosDe(id);
  registro = cargarRegistroDe(id);
  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("app-contenido").hidden = false;
  document.getElementById("saludo-usuario").textContent = `Hola, ${perfilActivo.nombre}`;
  renderSugerencias();
  renderTodo();
}

document.getElementById("form-perfil").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("nombre-perfil");
  const nombre = input.value.trim();
  if (!nombre) return;
  const nuevo = { id: crypto.randomUUID(), nombre };
  perfiles.push(nuevo);
  guardarPerfiles(perfiles);
  input.value = "";
  seleccionarPerfil(nuevo.id);
});

document.getElementById("cambiar-usuario").addEventListener("click", () => {
  localStorage.removeItem(CLAVE_PERFIL_ACTIVO);
  mostrarPantallaPerfil();
});

// --- Navegación por pestañas ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "progreso") renderProgreso();
  });
});

// --- Fecha de hoy en el encabezado ---
document.getElementById("fecha-hoy").textContent = new Date().toLocaleDateString("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// --- Pestaña Hoy ---
function renderHoy() {
  const contenedor = document.getElementById("lista-hoy");
  const mensajeVacio = document.getElementById("sin-ejercicios-msg");
  contenedor.innerHTML = "";

  if (ejercicios.length === 0) {
    mensajeVacio.hidden = false;
    return;
  }
  mensajeVacio.hidden = true;

  const clave = hoyISO();
  const hechosHoy = registro[clave] || [];

  ejercicios.forEach((ej) => {
    const hecho = hechosHoy.includes(ej.id);
    const card = document.createElement("div");
    card.className = "ejercicio-card" + (hecho ? " hecho" : "");
    card.innerHTML = `
      <button class="check-btn" aria-label="Marcar completado">✓</button>
      <div class="ejercicio-info">
        <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
        <span class="ejercicio-detalle">${ej.series} series × ${ej.reps} repeticiones</span>
      </div>
    `;
    card.querySelector(".check-btn").addEventListener("click", () => {
      toggleCompletado(ej.id);
    });
    contenedor.appendChild(card);
  });

  renderRacha();
}

function toggleCompletado(id) {
  const clave = hoyISO();
  const hechosHoy = registro[clave] || [];
  const index = hechosHoy.indexOf(id);
  if (index >= 0) {
    hechosHoy.splice(index, 1);
  } else {
    hechosHoy.push(id);
  }
  if (hechosHoy.length > 0) {
    registro[clave] = hechosHoy;
  } else {
    delete registro[clave];
  }
  guardarRegistro(registro);
  renderHoy();
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

function renderRacha() {
  document.getElementById("racha-numero").textContent = calcularRachaActual();
}

// --- Pestaña Progreso ---
function renderProgreso() {
  document.getElementById("total-dias").textContent = Object.keys(registro).filter(
    (f) => registro[f].length > 0
  ).length;
  document.getElementById("mejor-racha").textContent = calcularMejorRacha();

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 6);
  let contadorSemana = 0;
  const grafico = document.getElementById("semana-grafico");
  grafico.innerHTML = "";
  const letras = ["D", "L", "M", "M", "J", "V", "S"];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const activo = diaCompletado(iso);
    if (activo) contadorSemana++;

    const wrap = document.createElement("div");
    wrap.className = "dia-barra-wrap";
    wrap.innerHTML = `
      <div class="dia-barra ${activo ? "activo" : ""}" style="height:${activo ? "100%" : "10%"}"></div>
      <span class="dia-letra">${letras[fecha.getDay()]}</span>
    `;
    grafico.appendChild(wrap);
  }
  document.getElementById("total-semana").textContent = contadorSemana;

  renderCalendario();
}

function renderCalendario() {
  const contenedor = document.getElementById("calendario");
  contenedor.innerHTML = "";

  const año = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();

  document.getElementById("mes-actual").textContent = mesVisible.toLocaleDateString("es-ES", {
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

document.getElementById("mes-anterior").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() - 1);
  renderCalendario();
});
document.getElementById("mes-siguiente").addEventListener("click", () => {
  mesVisible.setMonth(mesVisible.getMonth() + 1);
  renderCalendario();
});

// --- Pestaña Ejercicios ---
const SUGERENCIAS = [
  { nombre: "Yoga", series: 1, reps: 15 },
  { nombre: "Bicicleta", series: 1, reps: 20 },
  { nombre: "Pesas ligeras", series: 3, reps: 12 },
  { nombre: "Equilibrio", series: 2, reps: 10 },
  { nombre: "Respiración", series: 1, reps: 10 },
  { nombre: "Natación", series: 1, reps: 20 },
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
      agregarEjercicio(s.nombre, s.series, s.reps);
    });
    contenedor.appendChild(chip);
  });
}

function agregarEjercicio(nombre, series, reps) {
  ejercicios.push({
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    series: Number(series) || 1,
    reps: Number(reps) || 1,
  });
  guardarEjercicios(ejercicios);
  renderTodo();
}

document.getElementById("form-ejercicio").addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nombre-ejercicio").value;
  const series = document.getElementById("series-ejercicio").value;
  const reps = document.getElementById("reps-ejercicio").value;
  if (!nombre.trim()) return;
  agregarEjercicio(nombre, series, reps);
  e.target.reset();
  document.getElementById("series-ejercicio").value = 3;
  document.getElementById("reps-ejercicio").value = 10;
});

function renderGestion() {
  const contenedor = document.getElementById("lista-gestion");
  contenedor.innerHTML = "";
  if (ejercicios.length === 0) {
    contenedor.innerHTML = '<p class="msg-vacio">Aún no agregaste ningún ejercicio.</p>';
    return;
  }
  ejercicios.forEach((ej) => {
    const card = document.createElement("div");
    card.className = "gestion-card";
    card.innerHTML = `
      <div class="ejercicio-info">
        <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
        <span class="ejercicio-detalle">${ej.series} series × ${ej.reps} repeticiones</span>
      </div>
      <button class="eliminar-btn" aria-label="Eliminar">🗑</button>
    `;
    card.querySelector(".eliminar-btn").addEventListener("click", () => {
      if (confirm(`¿Eliminar "${ej.nombre}"?`)) {
        ejercicios = ejercicios.filter((e) => e.id !== ej.id);
        guardarEjercicios(ejercicios);
        renderTodo();
      }
    });
    contenedor.appendChild(card);
  });
}

function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function renderTodo() {
  renderHoy();
  renderGestion();
  if (document.getElementById("tab-progreso").classList.contains("active")) {
    renderProgreso();
  }
}

const idActivoGuardado = localStorage.getItem(CLAVE_PERFIL_ACTIVO);
if (idActivoGuardado && perfiles.some((p) => p.id === idActivoGuardado)) {
  iniciarApp(idActivoGuardado);
} else {
  mostrarPantallaPerfil();
}

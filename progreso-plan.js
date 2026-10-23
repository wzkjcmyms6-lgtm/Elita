// progreso-plan.js
// Lógica del avance de Elita en el plan (sin pantalla ni Firebase, para poder probarla sola).
// Trabaja sobre el doc "progreso/elita-plan":
// { planVersion, planInicio, semanaActual, semanaInicio, mesCompletado, sesiones, ajustes, nombresAnteriores }
import { PLAN_VERSION, DIAS_POR_SEMANA, TOTAL_SEMANAS } from "./plan-retina.js?v=2";

export const TOTAL_DIAS = DIAS_POR_SEMANA * TOTAL_SEMANAS;
export const ESTADOS_QUE_CUENTAN = ["completa", "corta"];

// Marca para borrar un campo con un parche (en Firestore se convierte en deleteField()).
export const BORRAR = "__borrar__";

// Número de WhatsApp de Juan (formato internacional sin "+"); Juan lo puede cambiar desde su panel.
export const WHATSAPP_JUAN_INICIAL = "59165162020";

export function ajustesIniciales() {
  return {
    voz: true,
    letra: "grande",
    permisoOftalmologo: null, // { ok: true|false, fecha: "AAAA-MM-DD" } una vez que respondió
    whatsappJuan: WHATSAPP_JUAN_INICIAL,
    videosVistos: {},
    videosPropios: {},
  };
}

export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

// Ids de los bloques del plan nuevo ("s1-respiracion-inicio", ...). Todo lo demás es de la rutina anterior.
const ID_PLAN_NUEVO = /^s[1-9]-/;

// id → nombre de los ejercicios de la rutina anterior, para que el historial viejo siga mostrando nombres.
export function nombresDeSemanasViejas(semanas) {
  const nombres = {};
  if (!semanas || typeof semanas !== "object") return nombres;
  Object.values(semanas).forEach((lista) => {
    (Array.isArray(lista) ? lista : []).forEach((ej) => {
      if (ej && ej.id && ej.nombre && !ID_PLAN_NUEVO.test(ej.id)) nombres[ej.id] = ej.nombre;
    });
  });
  return nombres;
}

export function crearPlanInicial(hoy, semanasViejas) {
  return {
    planVersion: PLAN_VERSION,
    planInicio: hoy,
    semanaActual: 1,
    semanaInicio: hoy,
    mesCompletado: null,
    sesiones: {},
    ajustes: ajustesIniciales(),
    nombresAnteriores: nombresDeSemanasViejas(semanasViejas),
  };
}

// Completa lo que falte (por ejemplo, un doc escrito por una versión anterior de esta lógica).
export function normalizarPlan(datos, hoy) {
  const d = datos || {};
  const semana = Number(d.semanaActual);
  const planInicio = d.planInicio || hoy;
  return {
    planVersion: d.planVersion || PLAN_VERSION,
    planInicio,
    semanaActual: semana >= 1 && semana <= TOTAL_SEMANAS ? semana : 1,
    semanaInicio: d.semanaInicio || planInicio,
    mesCompletado: d.mesCompletado || null,
    sesiones: d.sesiones || {},
    ajustes: {
      ...ajustesIniciales(),
      ...(d.ajustes || {}),
      videosVistos: (d.ajustes && d.ajustes.videosVistos) || {},
      videosPropios: (d.ajustes && d.ajustes.videosPropios) || {},
    },
    nombresAnteriores: d.nombresAnteriores || {},
  };
}

function esObjeto(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Aplica un parche con la misma regla que setDoc(..., { merge: true }): los objetos se
// combinan campo por campo; listas y valores sueltos se reemplazan; BORRAR quita el campo.
export function aplicarParche(base, parche) {
  const resultado = { ...base };
  Object.entries(parche).forEach(([clave, valor]) => {
    if (valor === BORRAR) delete resultado[clave];
    else if (esObjeto(valor)) resultado[clave] = aplicarParche(esObjeto(resultado[clave]) ? resultado[clave] : {}, valor);
    else resultado[clave] = valor;
  });
  return resultado;
}

export function sesionCuenta(sesion) {
  return !!sesion && ESTADOS_QUE_CUENTAN.includes(sesion.estado);
}

// Días distintos (completa o corta) hechos en la semana actual. "parcial" y "malestar" no cuentan.
export function diasHechosSemana(plan) {
  return Object.entries(plan.sesiones).filter(
    ([fecha, s]) => sesionCuenta(s) && s.semana === plan.semanaActual && fecha >= plan.semanaInicio
  ).length;
}

// Hoy ya hay una sesión cerrada (completa, corta, parcial o malestar): máximo una por día.
export function diaCerrado(plan, hoy) {
  return !!plan.sesiones[hoy];
}

// "Día Y de 20": sesiones completa + corta desde planInicio, más 1 si hoy todavía no entrenó.
export function numeroDeDia(plan, hoy) {
  const hechas = Object.entries(plan.sesiones).filter(([fecha, s]) => fecha >= plan.planInicio && sesionCuenta(s)).length;
  const dia = Math.max(1, hechas + (diaCerrado(plan, hoy) ? 0 : 1));
  return dia > TOTAL_DIAS ? { dia: TOTAL_DIAS, mantenimiento: true } : { dia, mantenimiento: false };
}

// Una semana nueva empieza hoy si todavía no entrenó; si ya entrenó, mañana.
export function inicioDeSemanaNueva(plan, hoy) {
  return diaCerrado(plan, hoy) ? sumarDias(hoy, 1) : hoy;
}

// Después de guardar una sesión: ¿se completó la semana? Devuelve el parche a aplicar y qué avisarle.
// Al terminar la semana 4 se queda en la 4 (mantenimiento): nunca vuelve sola a la semana 1.
export function avanceTrasSesion(plan, hoy) {
  if (diasHechosSemana(plan) < DIAS_POR_SEMANA) return { parche: null, evento: null };
  const n = plan.semanaActual;
  const manana = sumarDias(hoy, 1);
  if (n < TOTAL_SEMANAS) {
    return {
      parche: { semanaActual: n + 1, semanaInicio: manana },
      evento: { tipo: "semana", completada: n, siguiente: n + 1 },
    };
  }
  if (plan.mesCompletado) return { parche: { semanaInicio: manana }, evento: null };
  return { parche: { semanaInicio: manana, mesCompletado: hoy }, evento: { tipo: "mes" } };
}

// Controles de Juan: pasar a otra semana o repetir la actual (vuelve a contar los 5 días).
export function parcheIrASemana(plan, n, hoy) {
  const semana = Math.max(1, Math.min(TOTAL_SEMANAS, n));
  return { semanaActual: semana, semanaInicio: inicioDeSemanaNueva(plan, hoy) };
}

// Reiniciar el plan no borra sesiones: solo vuelve a contar desde hoy (o mañana).
export function parcheReiniciarPlan(plan, hoy) {
  const inicio = inicioDeSemanaNueva(plan, hoy);
  return { semanaActual: 1, planInicio: inicio, semanaInicio: inicio, mesCompletado: null };
}

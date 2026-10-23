// Pruebas de la lógica del plan (progreso-plan.js y plan-retina.js).
// Uso: node scripts/probar-plan.mjs   (Node 18+, sin dependencias)
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const cargar = (archivo) => import(pathToFileURL(join(raiz, archivo)).href + "?v=2");
const P = await cargar("progreso-plan.js");
const R = await cargar("plan-retina.js");

let pasaron = 0;
function prueba(nombre, fn) {
  fn();
  pasaron++;
  console.log(`OK  ${nombre}`);
}

const sesion = (semana, estado) => ({ semana, estado, version: estado === "corta" ? "corta" : "normal" });

function planCon(sesiones, extra = {}) {
  return P.normalizarPlan({ ...P.crearPlanInicial("2026-10-24", null), sesiones, ...extra }, "2026-10-24");
}

prueba("sumarDias cruza meses y años", () => {
  assert.equal(P.sumarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(P.sumarDias("2026-12-31", 1), "2027-01-01");
});

prueba("nombresDeSemanasViejas guarda los nombres viejos e ignora los ids nuevos", () => {
  const nombres = P.nombresDeSemanasViejas({
    1: [{ id: "abc", nombre: "Puente de glúteo" }, { id: "s1-tobillos", nombre: "Nuevo" }],
    2: [],
  });
  assert.deepEqual(nombres, { abc: "Puente de glúteo" });
  assert.deepEqual(P.nombresDeSemanasViejas(null), {});
});

prueba("aplicarParche combina como setDoc con merge y BORRAR quita campos", () => {
  const base = { a: 1, m: { x: 1, y: [1, 2] }, s: { "2026-10-24": { estado: "completa" } } };
  const r = P.aplicarParche(base, { m: { y: [3] }, s: { "2026-10-24": P.BORRAR, "2026-10-25": { estado: "corta" } } });
  assert.deepEqual(r, { a: 1, m: { x: 1, y: [3] }, s: { "2026-10-25": { estado: "corta" } } });
  assert.deepEqual(base.s, { "2026-10-24": { estado: "completa" } }, "no modifica el original");
});

prueba("5 días completa/corta pasan a la semana 2; parcial y malestar no cuentan", () => {
  const sesiones = {
    "2026-10-24": sesion(1, "completa"),
    "2026-10-25": sesion(1, "corta"),
    "2026-10-26": sesion(1, "parcial"),
    "2026-10-27": sesion(1, "malestar"),
    "2026-10-28": sesion(1, "completa"),
    "2026-10-29": sesion(1, "completa"),
  };
  let plan = planCon(sesiones);
  assert.equal(P.diasHechosSemana(plan), 4);
  assert.equal(P.avanceTrasSesion(plan, "2026-10-29").parche, null);

  plan = planCon({ ...sesiones, "2026-10-30": sesion(1, "completa") });
  assert.equal(P.diasHechosSemana(plan), 5);
  const { parche, evento } = P.avanceTrasSesion(plan, "2026-10-30");
  assert.deepEqual(parche, { semanaActual: 2, semanaInicio: "2026-10-31" });
  assert.deepEqual(evento, { tipo: "semana", completada: 1, siguiente: 2 });
  plan = P.aplicarParche(plan, parche);
  assert.equal(P.diasHechosSemana(plan), 0, "la semana 2 empieza de cero");
});

prueba("al completar la semana 4 se queda en la 4 y avisa el fin del mes una sola vez", () => {
  const sesiones = {};
  for (let i = 0; i < 5; i++) sesiones[P.sumarDias("2026-11-20", i)] = sesion(4, "completa");
  let plan = planCon(sesiones, { semanaActual: 4, semanaInicio: "2026-11-20" });
  let r = P.avanceTrasSesion(plan, "2026-11-24");
  assert.deepEqual(r.evento, { tipo: "mes" });
  assert.equal(r.parche.semanaActual, undefined, "no cambia de semana");
  plan = P.aplicarParche(plan, r.parche);
  assert.equal(plan.semanaActual, 4);
  assert.equal(plan.mesCompletado, "2026-11-24");

  for (let i = 1; i <= 5; i++) plan.sesiones[P.sumarDias("2026-11-24", i)] = sesion(4, "completa");
  r = P.avanceTrasSesion(plan, "2026-11-29");
  assert.equal(r.evento, null, "el aviso del mes no se repite");
  assert.equal(P.aplicarParche(plan, r.parche).semanaActual, 4);
});

prueba("Día Y de 20: cuenta completa+corta desde planInicio, +1 si hoy no entrenó, después Mantenimiento", () => {
  let plan = planCon({});
  assert.deepEqual(P.numeroDeDia(plan, "2026-10-24"), { dia: 1, mantenimiento: false });
  plan = planCon({ "2026-10-24": sesion(1, "completa"), "2026-10-25": sesion(1, "parcial") });
  assert.deepEqual(P.numeroDeDia(plan, "2026-10-25"), { dia: 1, mantenimiento: false }, "hoy cerrado con parcial");
  assert.deepEqual(P.numeroDeDia(plan, "2026-10-26"), { dia: 2, mantenimiento: false });
  const muchas = {};
  for (let i = 0; i < 20; i++) muchas[P.sumarDias("2026-10-24", i)] = sesion(1, "completa");
  plan = planCon(muchas);
  assert.deepEqual(P.numeroDeDia(plan, "2026-11-12"), { dia: 20, mantenimiento: false });
  assert.deepEqual(P.numeroDeDia(plan, "2026-11-13"), { dia: 20, mantenimiento: true });
  plan = planCon({ "2026-10-20": sesion(1, "completa") });
  assert.deepEqual(P.numeroDeDia(plan, "2026-10-24"), { dia: 1, mantenimiento: false }, "ignora lo anterior a planInicio");
});

prueba("controles de Juan: repetir/cambiar semana y reiniciar no borran sesiones", () => {
  const plan = planCon({ "2026-10-24": sesion(1, "completa") });
  assert.deepEqual(P.parcheIrASemana(plan, 3, "2026-10-24"), { semanaActual: 3, semanaInicio: "2026-10-25" });
  assert.deepEqual(P.parcheIrASemana(plan, 9, "2026-10-26"), { semanaActual: 4, semanaInicio: "2026-10-26" });
  const r = P.aplicarParche(plan, P.parcheReiniciarPlan(plan, "2026-10-24"));
  assert.equal(r.semanaActual, 1);
  assert.equal(r.planInicio, "2026-10-25");
  assert.equal(Object.keys(r.sesiones).length, 1);
});

prueba("normalizarPlan completa campos que falten", () => {
  const plan = P.normalizarPlan({ planVersion: "retina-v1", semanaActual: 7, ajustes: { voz: false } }, "2026-10-24");
  assert.equal(plan.semanaActual, 1);
  assert.equal(plan.planInicio, "2026-10-24");
  assert.equal(plan.ajustes.voz, false);
  assert.equal(plan.ajustes.letra, "grande");
  assert.equal(plan.ajustes.whatsappJuan, P.WHATSAPP_JUAN_INICIAL);
  assert.deepEqual(plan.ajustes.videosVistos, {});
});

prueba("versión corta: 1 serie en fuerza y equilibrio, mitad de la caminata", () => {
  for (let n = 1; n <= 4; n++) {
    const normal = R.bloquesDeSesion(n, "normal");
    const corta = R.bloquesDeSesion(n, "corta");
    normal.forEach((bl, i) => {
      const c = corta[i];
      if (bl.fase === "fuerza" || bl.fase === "equilibrio") assert.equal(c.series, 1, bl.id);
      else assert.equal(c.series, bl.series, bl.id);
      assert.equal(c.seg, bl.fase === "cardio" ? Math.round(bl.seg / 2) : bl.seg, bl.id);
    });
  }
});

prueba("semanasCompatibles usa los mismos ids que los bloques", () => {
  const compat = R.semanasCompatibles();
  for (let n = 1; n <= 4; n++) {
    assert.deepEqual(compat[n].map((e) => e.id), R.SEMANAS[n].bloques.map((b) => b.id));
  }
});

prueba("ningún ejercicio en el piso, acostada, con pesas o con la cabeza abajo", () => {
  const prohibido = /\b(piso|suelo|acostad|tumbad|boca abajo|boca arriba|pesa|mancuerna|banda|salt|trote|inclin[aá]te hacia adelante)/i;
  Object.entries(R.EJERCICIOS).forEach(([id, ej]) => {
    assert.ok(["sentada", "silla", "de-pie-con-apoyo", "caminando"].includes(ej.posicion), id);
    const texto = [ej.nombre, ...ej.pasos].join(" ");
    // "talón en el piso" es apoyar el pie, no acostarse; "sin pesas" es una aclaración.
    const limpio = texto.replace(/(talón|talones) en el piso/gi, "").replace(/levantá un pie apenas del piso/gi, "").replace(/sin pesas/gi, "");
    assert.ok(!prohibido.test(limpio), `${id}: ${limpio.match(prohibido)?.[0]}`);
  });
});

console.log(`\n${pasaron} pruebas OK.`);

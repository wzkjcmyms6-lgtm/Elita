// sesion.js
// Arma los tramos de cada ejercicio para el temporizador guiado y los textos que se muestran.
// Sin pantalla: se puede probar con Node (scripts/probar-plan.mjs).
//
// Un bloque se hace así: por cada serie, trabajo (si tiene lados: lado 1, cambio, lado 2) y,
// entre series, descanso. La cuenta "3, 2, 1, ¡ya!" la agrega el temporizador antes de cada
// trabajo que no viene de un cambio de lado.
import { SEGUNDOS_CAMBIO_LADO } from "./plan-retina.js?v=2";

export function tramosDeBloque(bl) {
  const tramos = [];
  for (let serie = 1; serie <= bl.series; serie++) {
    if (bl.lados) {
      tramos.push({ tipo: "trabajo", serie, lado: 0, seg: bl.seg });
      tramos.push({ tipo: "cambio", serie, lado: 1, seg: SEGUNDOS_CAMBIO_LADO });
      tramos.push({ tipo: "trabajo", serie, lado: 1, seg: bl.seg });
    } else {
      tramos.push({ tipo: "trabajo", serie, lado: null, seg: bl.seg });
    }
    if (serie < bl.series && bl.descanso > 0) tramos.push({ tipo: "descanso", serie, lado: null, seg: bl.descanso });
  }
  return tramos;
}

// Al retomar una sesión guardada a mitad de un tramo, se sigue desde el próximo trabajo
// (después de un cambio de lado o de un descanso no hace falta repetirlos).
export function puntoDeRetomar(tramos, indice) {
  let i = Math.max(0, Math.min(indice || 0, tramos.length - 1));
  while (i < tramos.length - 1 && tramos[i].tipo !== "trabajo") i++;
  return i;
}

// "pierna", "brazo" o "pie" según el texto de los lados del ejercicio.
export function parteDelCuerpo(lados) {
  const texto = (lados || []).join(" ").toLowerCase();
  if (texto.includes("pierna")) return "pierna";
  if (texto.includes("brazo")) return "brazo";
  if (texto.includes("pie")) return "pie";
  return null;
}

const OTRO = { pierna: "LA OTRA PIERNA", brazo: "EL OTRO BRAZO", pie: "EL OTRO PIE" };

export function textoCambioDeLado(lados) {
  const parte = parteDelCuerpo(lados);
  return `AHORA ${OTRO[parte] || "EL OTRO LADO"}`;
}

export function textoTiempo(seg) {
  if (seg >= 120 && seg % 60 === 0) return `${seg / 60} minutos`;
  return `${seg} segundos`;
}

// "2 veces · 30 segundos (cada pierna)"
export function textoResumen(bl) {
  const veces = bl.series === 1 ? "1 vez" : `${bl.series} veces`;
  const parte = bl.lados ? parteDelCuerpo(bl.lados) : null;
  const porLado = bl.lados ? ` (cada ${parte || "lado"})` : "";
  return `${veces} · ${textoTiempo(bl.seg)}${porLado}`;
}

// Número grande del temporizador: segundos sueltos, o m:ss desde un minuto.
export function textoReloj(seg) {
  const s = Math.max(0, Math.ceil(seg));
  if (s < 60) return String(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function minutosRedondeados(ms) {
  return Math.max(1, Math.round(ms / 60000));
}

export const POSICIONES = {
  "sentada": "Sentada",
  "silla": "Con la silla",
  "de-pie-con-apoyo": "De pie, agarrada",
  "caminando": "Caminando",
};

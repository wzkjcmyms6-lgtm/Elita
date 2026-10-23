// voz.js
// Voz en español, sonidos y vibración para guiar la sesión.
// Si el celular no tiene voz en español, la app sigue con sonidos y texto.

let vozActiva = true;
let vozElegida = null;
let audio = null;

// Preferimos español latinoamericano; si no hay, el de España; nunca una voz en otro idioma.
const PREFERENCIA = ["es-419", "es-us", "es-mx", "es-ar", "es-co", "es-cl", "es-pe", "es-es"];

function elegirVoz() {
  if (!("speechSynthesis" in window)) return;
  const voces = window.speechSynthesis.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang));
  if (voces.length === 0) {
    vozElegida = null;
    return;
  }
  const normal = (v) => v.lang.toLowerCase().replace("_", "-");
  for (const pref of PREFERENCIA) {
    const encontrada = voces.find((v) => normal(v) === pref);
    if (encontrada) {
      vozElegida = encontrada;
      return;
    }
  }
  vozElegida = voces[0];
}

if ("speechSynthesis" in window) {
  elegirVoz();
  // En algunos celulares las voces cargan tarde.
  window.speechSynthesis.addEventListener?.("voiceschanged", elegirVoz);
}

export function configurarVoz(activa) {
  vozActiva = !!activa;
  if (!vozActiva) callar();
}

export function hayVozEnEspanol() {
  return !!vozElegida;
}

export function hablar(texto) {
  if (!vozActiva || !vozElegida || !texto) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel(); // lo nuevo siempre se dice a tiempo, aunque corte lo anterior
    const frase = new SpeechSynthesisUtterance(texto);
    frase.voice = vozElegida;
    frase.lang = vozElegida.lang;
    frase.rate = 0.9;
    synth.speak(frase);
  } catch (e) {}
}

export function callar() {
  try { window.speechSynthesis?.cancel(); } catch (e) {}
}

// Tiene que llamarse desde un toque (botón "ESTOY LISTA"): en iPhone el audio y la voz
// quedan bloqueados hasta que la persona toca algo.
export function desbloquearAudio() {
  try {
    const ctx = obtenerAudio();
    if (ctx && ctx.state === "suspended") ctx.resume();
    reproducirTono(ctx, 440, 0, 0.01, "sine", 0.001);
  } catch (e) {}
  try {
    if ("speechSynthesis" in window) {
      elegirVoz();
      const frase = new SpeechSynthesisUtterance(" ");
      frase.volume = 0;
      if (vozElegida) {
        frase.voice = vozElegida;
        frase.lang = vozElegida.lang;
      }
      window.speechSynthesis.speak(frase);
    }
  } catch (e) {}
}

function obtenerAudio() {
  if (audio) return audio;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audio = new Ctx();
  return audio;
}

function reproducirTono(ctx, frecuencia, inicio, duracion, tipo, volumen) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(volumen, ctx.currentTime + inicio);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracion);
}

function vibrar(patron) {
  if (navigator.vibrate) {
    try { navigator.vibrate(patron); } catch (e) {}
  }
}

// Campanita de dos notas (sol5 -> do6): termina un tramo.
export function sonarAlarma() {
  try {
    const ctx = obtenerAudio();
    reproducirTono(ctx, 784.0, 0, 0.3, "sine", 0.28);
    reproducirTono(ctx, 1046.5, 0.2, 0.45, "sine", 0.28);
  } catch (e) {}
  vibrar([200, 100, 200]);
}

// Fanfarria ascendente (do5-mi5-sol5-do6): terminó la sesión del día.
export function sonarFanfarria() {
  try {
    const ctx = obtenerAudio();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      reproducirTono(ctx, freq, i * 0.14, 0.35, "triangle", 0.22);
    });
  } catch (e) {}
  vibrar([150, 60, 150, 60, 250]);
}

// "Tic" corto para el 3, 2, 1.
export function sonarTic() {
  try { reproducirTono(obtenerAudio(), 1000, 0, 0.08, "square", 0.08); } catch (e) {}
  vibrar(40);
}

// Tono más agudo para el "¡ya!".
export function sonarYa() {
  try { reproducirTono(obtenerAudio(), 1318.5, 0, 0.35, "sine", 0.25); } catch (e) {}
  vibrar(150);
}

// plan-retina.js
// Plan de ejercicios de 4 semanas para Elita (68 años) después de su cirugía de retina.
// Reglas que respeta TODO el plan: sin piso, sin acostarse, sin bajar la cabeza por debajo
// de la cintura, sin pesas, sin saltos, sin aguantar el aire y siempre con apoyo firme.
// Base: OMS 2020 (actividad multicomponente para mayores de 65), Vivifrail, Otago y
// recomendaciones habituales después de vitrectomía / cirugía de desprendimiento de retina.
// Los textos usan voseo, igual que el resto de la app.

export const PLAN_VERSION = "retina-v1";
export const DIAS_POR_SEMANA = 5;          // días distintos para pasar a la semana siguiente
export const TOTAL_SEMANAS = 4;
export const SEGUNDOS_CUENTA_ATRAS = 3;     // "3, 2, 1, ¡ya!" antes de cada tramo
export const SEGUNDOS_CAMBIO_LADO = 5;     // pausa corta para cambiar de pierna o brazo
export const SEGUNDOS_INTRO_ESTIMADOS = 15; // solo para estimar minutos (la usuaria toca EMPEZAR)

const SER = "Sociedad Española de Reumatología · Reumafit";
const SIKANA = "Sikana · Gimnasia para personas mayores";
const APP = "Video que ya estaba en la app";

// Cada video se intenta en orden; si uno falla, se pasa al siguiente.
// idioma "en": el video tiene textos en inglés → mostrar "Mirá solo el movimiento".
export const EJERCICIOS = {
  "respiracion": {
    nombre: "Respiración tranquila (inflar la panza y soltar el aire lento)",
    corto: "Respiración tranquila",
    tipo: "respiracion",
    posicion: "sentada",
    icono: "🌬️",
    musculo: null,
    pasos: [
      "Sentate derecha, con la espalda apoyada.",
      "Poné una mano sobre la panza.",
      "Tomá aire por la nariz: la panza se infla.",
      "Soltá el aire por la boca, despacito.",
    ],
    cuidado: "Nunca aguantes el aire.",
    guiaRespiracion: { inhalar: 3, exhalar: 5 }, // la app anima un círculo que crece y se achica
    videos: [],
  },

  "brazos-circulos": {
    nombre: "Círculos con los brazos (sentada, brazos abiertos, círculos chicos)",
    corto: "Círculos con los brazos",
    tipo: "movilidad",
    posicion: "sentada",
    icono: "🙆",
    musculo: "Hombros",
    pasos: [
      "Sentate derecha, sin apoyar la espalda.",
      "Abrí los brazos a los costados, a la altura de los hombros.",
      "Hacé círculos chicos hacia adelante.",
      "Cuando te avise, cambiá: círculos hacia atrás.",
    ],
    cuidado: "Si te cansás, bajá los brazos un momento y seguí.",
    vozMitad: "Ahora, círculos hacia atrás.",
    videos: [
      { tipo: "local", src: "videos/circulos-hombros.mp4", fuente: APP, idioma: "en", nota: "En el video está de pie. Vos hacelo sentada." },
    ],
  },

  "tobillos": {
    nombre: "Círculos de tobillo (sentada, un pie y después el otro)",
    corto: "Círculos de tobillo",
    tipo: "movilidad",
    posicion: "sentada",
    icono: "🦶",
    musculo: "Tobillos",
    lados: ["Pie derecho", "Pie izquierdo"],
    pasos: [
      "Sentate con la espalda apoyada.",
      "Estirá un poco una pierna, con el talón en el piso.",
      "Dibujá círculos con la punta del pie.",
    ],
    cuidado: "Movimientos lentos, sin dolor.",
    videos: [
      { tipo: "local", src: "videos/circulos-tobillo.mp4", fuente: APP, idioma: "en" },
    ],
  },

  "marcha-sentada": {
    nombre: "Marcha sentada (levantar las rodillas como si caminaras)",
    corto: "Marcha sentada",
    tipo: "cardio",
    posicion: "sentada",
    icono: "🚶",
    musculo: "Piernas y corazón",
    pasos: [
      "Sentate en la mitad de la silla, espalda derecha.",
      "Levantá una rodilla y después la otra, como caminando.",
      "Mové los brazos al mismo ritmo.",
    ],
    cuidado: "Tenés que poder hablar mientras lo hacés.",
    videos: [
      { tipo: "local", src: "videos/marcha-en-el-lugar.mp4", fuente: APP, idioma: "en", nota: "En el video está de pie. Vos hacelo sentada." },
    ],
  },

  "marcha-de-pie": {
    nombre: "Marcha de pie (agarrada del respaldo de la silla)",
    corto: "Marcha de pie",
    tipo: "cardio",
    posicion: "de-pie-con-apoyo",
    icono: "🚶",
    musculo: "Piernas y corazón",
    pasos: [
      "Parate detrás de la silla y agarrate del respaldo.",
      "Levantá una rodilla y después la otra, sin apuro.",
      "Mirá al frente, no a los pies.",
    ],
    cuidado: "Tenés que poder hablar mientras lo hacés.",
    videos: [
      { tipo: "local", src: "videos/marcha-en-el-lugar.mp4", fuente: APP, idioma: "en", nota: "Vos hacelo agarrada de la silla." },
    ],
  },

  "bascula-de-pie": {
    nombre: "Mover la cadera de pie (espalda apoyada en la pared, movimiento chico)",
    corto: "Mover la cadera",
    tipo: "movilidad",
    posicion: "de-pie-con-apoyo",
    icono: "🧍",
    musculo: "Espalda baja y panza",
    pasos: [
      "Parate con la espalda apoyada en la pared y las rodillas un poquito flojas.",
      "Apretá suave la panza y pegá la cintura a la pared.",
      "Aflojá despacio y volvé a empezar.",
    ],
    cuidado: "Movimiento chico, sin dolor. Respirá normal.",
    videos: [
      { tipo: "youtube", id: "KFLTxdFZLiU", fuente: SER, idioma: "es" },
    ],
  },

  "sentarse-levantarse": {
    nombre: "Sentarse y levantarse de la silla (despacio, soltando el aire al subir)",
    corto: "Sentarse y levantarse",
    tipo: "fuerza",
    posicion: "silla",
    icono: "🪑",
    musculo: "Piernas y glúteos",
    pasos: [
      "Silla firme con apoyabrazos, apoyada contra la pared.",
      "Pies bien apoyados, un poquito hacia atrás.",
      "Mirando al frente, soltá el aire y parate empujando con las piernas.",
      "Sentate despacio, sin dejarte caer. Usá las manos si hace falta.",
    ],
    cuidado: "No bajes la cabeza. No aguantes el aire.",
    videos: [
      { tipo: "youtube", id: "JuZj3K6xzk0", fuente: SER, idioma: "es" },
      { tipo: "youtube", id: "nnXy0gcEtBU", fuente: SER, idioma: "es" },
    ],
  },

  "rodilla-sentada": {
    nombre: "Estirar la rodilla sentada (una pierna y después la otra)",
    corto: "Estirar la rodilla",
    tipo: "fuerza",
    posicion: "sentada",
    icono: "🦵",
    musculo: "Muslos",
    lados: ["Pierna derecha", "Pierna izquierda"],
    pasos: [
      "Sentate derecha, con la espalda apoyada.",
      "Soltá el aire y estirá la pierna hasta dejarla recta.",
      "Quedate 2 segundos arriba.",
      "Bajala despacio.",
    ],
    cuidado: "Respirá en cada subida. Sin pesas.",
    videos: [
      { tipo: "youtube", id: "5Oj3DAWW2BQ", fuente: SER, idioma: "es" },
      { tipo: "youtube", id: "yBxchebYYnU", fuente: SER, idioma: "es" },
    ],
  },

  "puntillas": {
    nombre: "Ponerse en puntillas (de pie, agarrada del respaldo de la silla)",
    corto: "Ponerse en puntillas",
    tipo: "fuerza",
    posicion: "de-pie-con-apoyo",
    icono: "🦶",
    musculo: "Pantorrillas",
    pasos: [
      "Parate detrás de la silla, agarrada con las dos manos.",
      "Subí en puntas de pie, despacio.",
      "Bajá los talones, también despacio.",
      "Espalda derecha y mirada al frente.",
    ],
    cuidado: "Siempre agarrada. No aguantes el aire.",
    videos: [
      { tipo: "youtube", id: "mobIkpZUQrw", fuente: SER, idioma: "es" },
      { tipo: "youtube", id: "PdYizc3JzEM", fuente: SER, idioma: "es" },
      { tipo: "local", src: "videos/elevacion-talones.mp4", fuente: APP, idioma: "es", nota: "Vos hacelo agarrada de la silla y nunca sobre un escalón." },
    ],
  },

  "pierna-costado": {
    nombre: "Pierna al costado (de pie, agarrada de la silla, sin inclinarte)",
    corto: "Pierna al costado",
    tipo: "fuerza",
    posicion: "de-pie-con-apoyo",
    icono: "🦵",
    musculo: "Cadera",
    lados: ["Pierna derecha", "Pierna izquierda"],
    pasos: [
      "Parate detrás de la silla, agarrada.",
      "Llevá una pierna estirada hacia el costado, despacio.",
      "Volvé a juntar los pies.",
      "El cuerpo queda derecho: no te inclines.",
    ],
    cuidado: "Movimiento chico y controlado.",
    videos: [
      { tipo: "youtube", id: "kq-A7-SSR8o", fuente: SER, idioma: "es" },
      { tipo: "youtube", id: "gmjq2bj0oZs", fuente: SER, idioma: "es" },
    ],
  },

  "talon-cola": {
    nombre: "Talón hacia la cola (de pie, agarrada de la silla)",
    corto: "Talón hacia la cola",
    tipo: "fuerza",
    posicion: "de-pie-con-apoyo",
    icono: "🦵",
    musculo: "Parte de atrás del muslo",
    lados: ["Pierna derecha", "Pierna izquierda"],
    pasos: [
      "Parate detrás de la silla, agarrada con las dos manos.",
      "Doblá una rodilla llevando el talón hacia atrás.",
      "Bajá el pie despacio.",
      "Las rodillas quedan juntas.",
    ],
    cuidado: "No te inclines hacia adelante.",
    videos: [
      { tipo: "youtube", id: "pJGSx7u_RQg", fuente: SER, idioma: "es" },
      { tipo: "youtube", id: "XsdPmxQYqio", fuente: SER, idioma: "es" },
    ],
  },

  "un-pie": {
    nombre: "Pararse en un pie (agarrada del respaldo, nunca suelta)",
    corto: "Pararse en un pie",
    tipo: "equilibrio",
    posicion: "de-pie-con-apoyo",
    icono: "🧘",
    musculo: "Equilibrio",
    lados: ["Levantá el pie derecho", "Levantá el pie izquierdo"],
    pasos: [
      "Parate detrás de la silla, agarrada con las dos manos.",
      "Levantá un pie apenas del piso.",
      "Mirá un punto fijo adelante.",
      "Si te sentís segura, soltá UNA mano. Nunca las dos.",
    ],
    cuidado: "Nunca con los ojos cerrados. Siempre al lado del apoyo.",
    videos: [
      { tipo: "youtube", id: "sLhdz-cGz3U", fuente: SIKANA, idioma: "es", nota: "En el video se suelta del todo. Vos no: siempre con una mano." },
      { tipo: "local", src: "videos/equilibrio-un-pie.mp4", fuente: APP, idioma: "en" },
    ],
  },

  "pies-semitandem": {
    nombre: "Un pie un poco adelante (agarrada de la mesada)",
    corto: "Un pie adelante",
    tipo: "equilibrio",
    posicion: "de-pie-con-apoyo",
    icono: "👣",
    musculo: "Equilibrio",
    lados: ["Pie derecho adelante", "Pie izquierdo adelante"],
    diagrama: "semitandem", // la app dibuja los dos pies vistos desde arriba
    pasos: [
      "Parate al lado de la mesada, con una mano apoyada.",
      "Poné un pie adelante: el talón a la altura del medio del otro pie.",
      "Quedate quieta, mirando al frente.",
    ],
    cuidado: "Si te tambaleás, apoyá las dos manos.",
    videos: [],
  },

  "pies-tandem": {
    nombre: "Un pie delante del otro (talón tocando la punta, agarrada de la mesada)",
    corto: "Pie delante del otro",
    tipo: "equilibrio",
    posicion: "de-pie-con-apoyo",
    icono: "👣",
    musculo: "Equilibrio",
    lados: ["Pie derecho adelante", "Pie izquierdo adelante"],
    diagrama: "tandem",
    pasos: [
      "Parate al lado de la mesada, con una mano apoyada.",
      "Poné un pie justo delante del otro: el talón toca la punta.",
      "Quedate quieta, mirando al frente.",
    ],
    cuidado: "Si te tambaleás, apoyá las dos manos.",
    videos: [],
  },

  "caminar-linea": {
    nombre: "Caminar talón con punta (al lado de la mesada, tocándola)",
    corto: "Caminar talón con punta",
    tipo: "equilibrio",
    posicion: "de-pie-con-apoyo",
    icono: "👣",
    musculo: "Equilibrio",
    pasos: [
      "Parate al lado de la mesada, con una mano apoyada.",
      "Caminá poniendo el talón justo delante de la punta del otro pie.",
      "Pasos chicos y despacio, mirando al frente.",
      "Al llegar al final, girá despacio y volvé.",
    ],
    cuidado: "Siempre con una mano en la mesada.",
    videos: [
      { tipo: "youtube", id: "sK6FqLSVb2A", fuente: SIKANA, idioma: "es", nota: "En el video camina sin apoyo. Vos, con la mano en la mesada." },
    ],
  },

  "caminar": {
    nombre: "Caminar a ritmo cómodo (en casa o en un lugar plano)",
    corto: "Caminar",
    tipo: "cardio",
    posicion: "caminando",
    icono: "🚶",
    musculo: "Corazón y piernas",
    pasos: [
      "Caminá por la casa o un pasillo, a tu ritmo.",
      "Tenés que poder hablar mientras caminás.",
      "Si te falta el aire, bajá el ritmo.",
      "Podés dejar el celular en la mesa: la voz te avisa cuando termina.",
    ],
    cuidado: "Sin subidas fuertes. Zapatos cerrados y firmes.",
    videos: [],
  },

  "pantorrilla-pared": {
    nombre: "Estirar la pantorrilla (manos en la pared, una pierna atrás)",
    corto: "Estirar la pantorrilla",
    tipo: "estiramiento",
    posicion: "de-pie-con-apoyo",
    icono: "🤸",
    musculo: null,
    lados: ["Pierna derecha atrás", "Pierna izquierda atrás"],
    pasos: [
      "Parate frente a la pared y apoyá las dos manos.",
      "Llevá una pierna atrás, con el talón en el piso.",
      "Doblá un poco la rodilla de adelante hasta sentir un estirón suave.",
      "Quedate quieta, respirando.",
    ],
    cuidado: "Sin rebotes y sin dolor. La cabeza derecha.",
    videos: [
      { tipo: "youtube", id: "1-uPT7huss0", fuente: "YouTube · estiramiento de gemelo con apoyo en pared", idioma: "es" },
    ],
  },

  "brazo-cruzado": {
    nombre: "Estirar el hombro (brazo cruzado sobre el pecho)",
    corto: "Estirar el hombro",
    tipo: "estiramiento",
    posicion: "sentada",
    icono: "🤸",
    musculo: null,
    lados: ["Brazo derecho", "Brazo izquierdo"],
    pasos: [
      "Sentada derecha, llevá un brazo cruzado sobre el pecho.",
      "Con la otra mano, empujá suave el codo hacia vos.",
      "Quedate quieta, respirando.",
    ],
    cuidado: "Estirón suave, nunca dolor.",
    videos: [],
  },

  "abrir-pecho": {
    nombre: "Abrir el pecho (brazos abiertos hacia atrás, juntando las paletas)",
    corto: "Abrir el pecho",
    tipo: "estiramiento",
    posicion: "sentada",
    icono: "🤸",
    musculo: "Espalda alta",
    pasos: [
      "Sentate derecha, sin apoyar la espalda.",
      "Abrí los brazos a los costados, con las palmas hacia arriba.",
      "Llevá los brazos un poquito atrás, juntando las paletas.",
      "Respirá tranquila y aflojá.",
    ],
    cuidado: "No tires la cabeza hacia atrás.",
    videos: [
      { tipo: "youtube", id: "isuu3iLs0AE", fuente: SIKANA, idioma: "es", nota: "En el video está de pie. Vos podés hacerlo sentada." },
    ],
  },
};

// Bloques de cada semana. series × seg = trabajo; descanso = entre series.
// Si el ejercicio tiene "lados", cada serie hace primero un lado y después el otro.
// "fase" ordena la sesión y agrupa en pantalla.
const b = (id, ej, fase, series, seg, descanso = 0) => ({ id, ej, fase, series, seg, descanso });

export const SEMANAS = {
  1: {
    titulo: "Semana 1 · Empezamos despacio",
    objetivo: "Aprender los movimientos, todo sentada o agarrada, tiempos cortos.",
    bloques: [
      b("s1-respiracion-inicio", "respiracion", "calentamiento", 1, 60),
      b("s1-brazos-circulos", "brazos-circulos", "calentamiento", 1, 30),
      b("s1-tobillos", "tobillos", "calentamiento", 1, 20),
      b("s1-marcha-sentada", "marcha-sentada", "calentamiento", 1, 60),
      b("s1-sentarse-levantarse", "sentarse-levantarse", "fuerza", 2, 30, 45),
      b("s1-rodilla-sentada", "rodilla-sentada", "fuerza", 2, 25, 30),
      b("s1-puntillas", "puntillas", "fuerza", 2, 30, 30),
      b("s1-un-pie", "un-pie", "equilibrio", 2, 10, 20),
      b("s1-pies-semitandem", "pies-semitandem", "equilibrio", 2, 15, 20),
      b("s1-caminar", "caminar", "cardio", 1, 180),
      b("s1-pantorrilla-pared", "pantorrilla-pared", "estiramiento", 1, 20),
      b("s1-brazo-cruzado", "brazo-cruzado", "estiramiento", 1, 20),
      b("s1-respiracion-final", "respiracion", "estiramiento", 1, 60),
    ],
  },
  2: {
    titulo: "Semana 2 · Sumamos un poquito",
    objetivo: "Un poco más de tiempo en cada ejercicio y un ejercicio nuevo de cadera.",
    bloques: [
      b("s2-respiracion-inicio", "respiracion", "calentamiento", 1, 60),
      b("s2-brazos-circulos", "brazos-circulos", "calentamiento", 1, 30),
      b("s2-tobillos", "tobillos", "calentamiento", 1, 20),
      b("s2-marcha-sentada", "marcha-sentada", "calentamiento", 1, 90),
      b("s2-sentarse-levantarse", "sentarse-levantarse", "fuerza", 2, 40, 45),
      b("s2-rodilla-sentada", "rodilla-sentada", "fuerza", 2, 30, 30),
      b("s2-puntillas", "puntillas", "fuerza", 2, 40, 30),
      b("s2-pierna-costado", "pierna-costado", "fuerza", 2, 20, 30),
      b("s2-un-pie", "un-pie", "equilibrio", 2, 15, 20),
      b("s2-pies-semitandem", "pies-semitandem", "equilibrio", 2, 20, 20),
      b("s2-caminar", "caminar", "cardio", 1, 240),
      b("s2-pantorrilla-pared", "pantorrilla-pared", "estiramiento", 1, 20),
      b("s2-brazo-cruzado", "brazo-cruzado", "estiramiento", 1, 20),
      b("s2-abrir-pecho", "abrir-pecho", "estiramiento", 1, 20),
      b("s2-respiracion-final", "respiracion", "estiramiento", 1, 60),
    ],
  },
  3: {
    titulo: "Semana 3 · Más tiempo de pie",
    objetivo: "La marcha pasa a ser de pie (agarrada) y el equilibrio se hace un poco más difícil.",
    bloques: [
      b("s3-respiracion-inicio", "respiracion", "calentamiento", 1, 60),
      b("s3-brazos-circulos", "brazos-circulos", "calentamiento", 1, 30),
      b("s3-tobillos", "tobillos", "calentamiento", 1, 20),
      b("s3-marcha-de-pie", "marcha-de-pie", "calentamiento", 1, 90),
      b("s3-sentarse-levantarse", "sentarse-levantarse", "fuerza", 2, 40, 45),
      b("s3-rodilla-sentada", "rodilla-sentada", "fuerza", 2, 30, 30),
      b("s3-puntillas", "puntillas", "fuerza", 2, 40, 30),
      b("s3-pierna-costado", "pierna-costado", "fuerza", 2, 25, 30),
      b("s3-talon-cola", "talon-cola", "fuerza", 2, 20, 30),
      b("s3-un-pie", "un-pie", "equilibrio", 2, 20, 20),
      b("s3-pies-tandem", "pies-tandem", "equilibrio", 2, 20, 20),
      b("s3-caminar-linea", "caminar-linea", "equilibrio", 2, 30, 20),
      b("s3-caminar", "caminar", "cardio", 1, 240),
      b("s3-pantorrilla-pared", "pantorrilla-pared", "estiramiento", 1, 25),
      b("s3-brazo-cruzado", "brazo-cruzado", "estiramiento", 1, 20),
      b("s3-abrir-pecho", "abrir-pecho", "estiramiento", 1, 20),
      b("s3-respiracion-final", "respiracion", "estiramiento", 1, 60),
    ],
  },
  4: {
    titulo: "Semana 4 · Afirmamos lo aprendido",
    objetivo: "Sumamos \"Mover la cadera\" y un poquito más de tiempo. Unos 30 a 35 minutos en total.",
    bloques: [
      b("s4-respiracion-inicio", "respiracion", "calentamiento", 1, 60),
      b("s4-brazos-circulos", "brazos-circulos", "calentamiento", 1, 30),
      b("s4-tobillos", "tobillos", "calentamiento", 1, 20),
      b("s4-bascula-de-pie", "bascula-de-pie", "calentamiento", 1, 40),
      b("s4-marcha-de-pie", "marcha-de-pie", "calentamiento", 1, 90),
      b("s4-sentarse-levantarse", "sentarse-levantarse", "fuerza", 2, 45, 45),
      b("s4-rodilla-sentada", "rodilla-sentada", "fuerza", 2, 30, 30),
      b("s4-puntillas", "puntillas", "fuerza", 2, 45, 30),
      b("s4-pierna-costado", "pierna-costado", "fuerza", 2, 25, 30),
      b("s4-talon-cola", "talon-cola", "fuerza", 2, 25, 30),
      b("s4-un-pie", "un-pie", "equilibrio", 2, 25, 20),
      b("s4-pies-tandem", "pies-tandem", "equilibrio", 2, 25, 20),
      b("s4-caminar-linea", "caminar-linea", "equilibrio", 2, 40, 20),
      b("s4-caminar", "caminar", "cardio", 1, 300),
      b("s4-pantorrilla-pared", "pantorrilla-pared", "estiramiento", 1, 25),
      b("s4-brazo-cruzado", "brazo-cruzado", "estiramiento", 1, 20),
      b("s4-abrir-pecho", "abrir-pecho", "estiramiento", 1, 20),
      b("s4-respiracion-final", "respiracion", "estiramiento", 1, 60),
    ],
  },
};

export const FASES = {
  calentamiento: "Calentamiento",
  fuerza: "Fuerza",
  equilibrio: "Equilibrio",
  cardio: "Caminar",
  estiramiento: "Para terminar",
};

// Versión "corta" (cuando Elita marca que hoy se siente "más o menos"):
// una sola serie de cada ejercicio y la mitad de la caminata. Calentamiento y final igual.
export function bloquesDeSesion(semana, version = "normal") {
  const def = SEMANAS[semana];
  if (!def) throw new Error(`Semana inexistente: ${semana}`);
  return def.bloques.map((bl) => {
    const ej = EJERCICIOS[bl.ej];
    if (!ej) throw new Error(`Ejercicio inexistente: ${bl.ej}`);
    let { series, seg } = bl;
    if (version === "corta") {
      if (bl.fase === "fuerza" || bl.fase === "equilibrio") series = 1;
      if (bl.fase === "cardio") seg = Math.round(seg / 2);
    }
    return { ...bl, series, seg, ejercicio: ej, lados: ej.lados || null };
  });
}

export function duracionBloqueSeg(bl) {
  const porSerie = bl.lados ? bl.seg * 2 + SEGUNDOS_CAMBIO_LADO : bl.seg;
  return bl.series * porSerie + (bl.series - 1) * bl.descanso;
}

export function duracionEstimadaSeg(semana, version = "normal") {
  return bloquesDeSesion(semana, version).reduce(
    (total, bl) => total + duracionBloqueSeg(bl) + SEGUNDOS_INTRO_ESTIMADOS,
    0
  );
}

// Formato compatible con la app actual (semanas[n] = lista de ejercicios), para que el
// calendario, el historial y el PDF de Juan sigan funcionando sin cambios grandes.
export function semanasCompatibles() {
  const resultado = {};
  for (let n = 1; n <= TOTAL_SEMANAS; n++) {
    resultado[n] = bloquesDeSesion(n).map((bl) => ({
      id: bl.id,
      nombre: bl.ejercicio.nombre,
      detalle: textoDetalle(bl),
      categoria: bl.fase === "calentamiento" ? "calentamiento" : bl.fase === "estiramiento" ? "estiramiento" : "principal",
      video: null,
      musculo: bl.ejercicio.musculo,
    }));
  }
  return resultado;
}

export function textoDetalle(bl) {
  const tiempo = bl.seg >= 120 && bl.seg % 60 === 0 ? `${bl.seg / 60} min` : `${bl.seg} seg`;
  const porLado = bl.lados ? " por lado" : "";
  const veces = bl.series > 1 ? `${bl.series} veces × ` : "";
  const descanso = bl.series > 1 && bl.descanso ? ` · descanso ${bl.descanso} seg` : "";
  return `${veces}${tiempo}${porLado}${descanso}`;
}

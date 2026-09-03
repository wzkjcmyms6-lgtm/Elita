// --- Sincronización en la nube (Firebase Firestore) ---
// Todo esto corre en segundo plano sin bloquear el arranque de la app: si no
// hay internet o falla la carga, la app sigue funcionando solo con localStorage.
let docElita = null;
let firestoreSetDoc = null;

(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js");
    const { initializeFirestore, persistentLocalCache, doc, setDoc, onSnapshot } = await import(
      "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"
    );

    const firebaseConfig = {
      apiKey: "AIzaSyCoUrHkRDCE_eJ_dcPMJ74esGgTUzpXn38",
      authDomain: "elita---ejercicios.firebaseapp.com",
      projectId: "elita---ejercicios",
      storageBucket: "elita---ejercicios.firebasestorage.app",
      messagingSenderId: "513889275392",
      appId: "1:513889275392:web:a6b732dbf8edfcced6d2e5",
    };

    const firebaseApp = initializeApp(firebaseConfig);
    const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
    docElita = doc(db, "progreso", "elita");
    firestoreSetDoc = setDoc;

    onSnapshot(
      docElita,
      (snap) => { if (snap.exists()) aplicarDatosRemotos(snap.data()); },
      () => {}
    );
  } catch (e) {
    docElita = null;
    firestoreSetDoc = null;
  }
})();

function sincronizarANube() {
  if (!docElita || !firestoreSetDoc) return;
  // Sin merge: siempre mandamos el estado local completo, así una eliminación
  // (por ejemplo, borrar la sesión de un día) también se refleja en la nube.
  firestoreSetDoc(docElita, { semanas, semanaActual, registro, cronometros }).catch(() => {});
}

function aplicarDatosRemotos(datos) {
  if (!datos) return;
  if (datos.semanas) {
    semanas = datos.semanas;
    let migrado = false;
    if (semanas[1] && semanas[1].some((ej) => ESTIRAMIENTO_ANTERIOR.includes(ej.nombre))) {
      semanas[1] = semanas[1].filter((ej) => !ESTIRAMIENTO_ANTERIOR.includes(ej.nombre)).concat(estiramientoFinalSemana1());
      migrado = true;
    }
    try { localStorage.setItem(`mis-ejercicios-datos-${ID_ELITA}`, JSON.stringify(semanas)); } catch (e) {}
    if (migrado) sincronizarANube();
  }
  if (datos.semanaActual) {
    semanaActual = datos.semanaActual;
    try { localStorage.setItem(`mis-ejercicios-semana-actual-${ID_ELITA}`, String(semanaActual)); } catch (e) {}
  }
  if (datos.registro) {
    registro = datos.registro;
    try { localStorage.setItem(`mis-ejercicios-registro-${ID_ELITA}`, JSON.stringify(registro)); } catch (e) {}
  }
  if (datos.cronometros) {
    cronometros = datos.cronometros;
    Object.keys(cronometros).forEach((iso) => { cronometros[iso] = normalizarCronometro(cronometros[iso]); });
    try { localStorage.setItem(`mis-ejercicios-cronometro-${ID_ELITA}`, JSON.stringify(cronometros)); } catch (e) {}
  }

  if (perfilActivo && perfilActivo.id === ID_ELITA && !document.getElementById("app-contenido").hidden) {
    renderTodo();
  }
  if (!document.getElementById("app-juan").hidden) {
    const tabJuanActivo = document.querySelector("#app-juan .nav-btn.active")?.dataset.tabJuan || "calendario";
    irATabJuan(tabJuanActivo);
  }
}

// --- Configuración fija ---
const ID_ELITA = "elita";
const CLAVE_ELITA = "1701";
const CLAVE_JUAN = "1925";
const CLAVE_PERFILES = "mis-ejercicios-perfiles";

// --- Versículo del día ---
const VERSICULOS = [
  { cita: "Jeremías 29:11", texto: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis." },
  { cita: "Romanos 15:13", texto: "Y el Dios de esperanza os llene de todo gozo y paz creyendo, para que abundéis en esperanza por la virtud del Espíritu Santo." },
  { cita: "Salmos 42:11", texto: "¿Por qué te abates, oh alma mía, y te turbas en mí? Espera á Dios; porque aún le tengo de alabar, es la salud de mi presencia, y el Dios mío." },
  { cita: "Isaías 40:31", texto: "Mas los que esperan á Jehová tendrán nuevas fuerzas; levantarán las alas como águilas, correrán, y no se cansarán, caminarán, y no se fatigarán." },
  { cita: "Romanos 8:28", texto: "Y sabemos que á los que á Dios aman, todas las cosas les ayudan á bien, es á saber, á los que conforme al propósito son llamados." },
  { cita: "Lamentaciones 3:22-23", texto: "Es por la misericordia de Jehová que no somos consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad." },
  { cita: "Hebreos 11:1", texto: "Es pues la fe la sustancia de las cosas que se esperan, la demostración de las cosas que no se ven." },
  { cita: "Salmos 30:5", texto: "Porque un momento será su ira, en su voluntad su gracia es por vida: A la tarde durará el lloro, y á la mañana vendrá la alegría." },
  { cita: "Proverbios 23:18", texto: "Porque ciertamente hay fin, y tu esperanza no será cortada." },
  { cita: "Romanos 5:5", texto: "Y la esperanza no avergüenza; porque el amor de Dios está derramado en nuestros corazones por el Espíritu Santo que nos es dado." },
  { cita: "1 Corintios 13:4-7", texto: "La caridad es sufrida, es benigna; la caridad no tiene envidia, la caridad no hace sinrazón, no se ensancha; no es injuriosa, no busca lo suyo, no se irrita, no piensa el mal; no se huelga de la injusticia, mas se huelga de la verdad; todo lo sufre, todo lo cree, todo lo espera, todo lo soporta." },
  { cita: "Juan 3:16", texto: "Porque de tal manera amó Dios al mundo, que ha dado á su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna." },
  { cita: "1 Juan 4:19", texto: "Nosotros le amamos á él, porque él nos amó primero." },
  { cita: "Juan 13:34", texto: "Un mandamiento nuevo os doy: Que os améis los unos á los otros: como os he amado, que también os améis los unos á los otros." },
  { cita: "1 Juan 4:7", texto: "Carísimos, amémonos unos á otros; porque el amor es de Dios. Cualquiera que ama, es nacido de Dios, y conoce á Dios." },
  { cita: "Colosenses 3:14", texto: "Y sobre todas estas cosas vestíos de caridad, la cual es el vínculo de la perfección." },
  { cita: "1 Corintios 16:14", texto: "Todas vuestras cosas sean hechas con caridad." },
  { cita: "Romanos 8:38-39", texto: "Por lo cual estoy cierto que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, ni lo alto, ni lo bajo, ni ninguna criatura nos podrá apartar del amor de Dios, que es en Cristo Jesús Señor nuestro." },
  { cita: "1 Pedro 4:8", texto: "Y sobre todo, tened entre vosotros ferviente caridad; porque la caridad cubrirá multitud de pecados." },
  { cita: "Cantares 8:7", texto: "Las muchas aguas no podrán apagar el amor, ni lo ahogarán los ríos." },
  { cita: "Filipenses 4:13", texto: "Todo lo puedo en Cristo que me fortalece." },
  { cita: "Josué 1:9", texto: "Mira que te mando que te esfuerces y seas valiente: no temas ni desmayes, porque Jehová tu Dios será contigo en donde quiera que fueres." },
  { cita: "Isaías 41:10", texto: "No temas, que yo soy contigo; no desmayes, que yo soy tu Dios que te esfuerzo: siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia." },
  { cita: "Salmos 46:1", texto: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones." },
  { cita: "2 Timoteo 1:7", texto: "Porque no nos ha dado Dios el espíritu de temor, sino el de fortaleza, y de amor, y de templanza." },
  { cita: "Salmos 27:14", texto: "Aguarda á Jehová: Esfuérzate, y aliéntese tu corazón: Sí, espera á Jehová." },
  { cita: "Deuteronomio 31:6", texto: "Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos: que Jehová tu Dios es el que va contigo: no te dejará ni te desamparará." },
  { cita: "Nehemías 8:10", texto: "Comed las grosuras, y bebed lo dulce, y enviad porciones á los que no tienen prevenido; porque santo día es á nuestro Señor: no os entristezcáis, porque el gozo de Jehová es vuestra fortaleza." },
  { cita: "Salmos 138:3", texto: "El día que clamé, me escuchaste; esforzásteme con fortaleza en mi alma." },
  { cita: "Efesios 3:16", texto: "Que os dé, conforme á las riquezas de su gloria, el ser corroborados con potencia en el hombre interior por su Espíritu." },
  { cita: "Colosenses 3:23", texto: "Y todo lo que hagáis, hacedlo de ánimo, como al Señor, y no á los hombres." },
  { cita: "Proverbios 16:3", texto: "Encomienda á Jehová tus obras, y tus pensamientos serán afirmados." },
  { cita: "Proverbios 14:23", texto: "En toda labor hay fruto: mas la palabra de los labios solamente empobrece." },
  { cita: "Eclesiastés 9:10", texto: "Todo lo que te viniere á la mano para hacer, hazlo según tus fuerzas; porque en el sepulcro, donde tú vas, no hay obra, ni industria, ni ciencia, ni sabiduría." },
  { cita: "Proverbios 12:24", texto: "La mano de los diligentes se enseñoreará: mas la negligencia será tributaria." },
  { cita: "2 Tesalonicenses 3:13", texto: "Y vosotros, hermanos, no os canséis de hacer bien." },
  { cita: "Gálatas 6:9", texto: "No nos cansemos, pues, de hacer bien; que á su tiempo segaremos, si no hubiéremos desmayado." },
  { cita: "Proverbios 22:29", texto: "¿Has visto hombre solícito en su obra? delante de los reyes estará; no estará delante de los de baja suerte." },
  { cita: "Salmos 90:17", texto: "Y sea la luz de Jehová nuestro Dios sobre nosotros: Y ordena en nosotros la obra de nuestras manos, la obra de nuestras manos ordena." },
  { cita: "Filipenses 2:13", texto: "Porque Dios es el que en vosotros obra así el querer como el hacer, por su buena voluntad." },
  { cita: "Salmos 23:1", texto: "Jehová es mi pastor; nada me faltará." },
  { cita: "Mateo 6:33", texto: "Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas." },
  { cita: "Filipenses 4:6-7", texto: "Por nada estéis afanosos; sino sean notorias vuestras peticiones delante de Dios en toda oración y ruego, con hacimiento de gracias. Y la paz de Dios, que sobrepuja todo entendimiento, guardará vuestros corazones y vuestros entendimientos en Cristo Jesús." },
  { cita: "Salmos 37:4", texto: "Deléitate asimismo en Jehová, Y él te dará las peticiones de tu corazón." },
  { cita: "Juan 14:27", texto: "La paz os dejo, mi paz os doy: no como el mundo la da, yo os la doy. No se turbe vuestro corazón, ni tenga miedo." },
  { cita: "Salmos 118:24", texto: "Este es el día que hizo Jehová: Nos gozaremos y alegraremos en él." },
  { cita: "Proverbios 3:5-6", texto: "Fíate de Jehová de todo tu corazón, Y no estribes en tu prudencia. Reconócelo en todos tus caminos, Y él enderezará tus veredas." },
  { cita: "Mateo 11:28", texto: "Venid á mí todos los que estáis trabajados y cargados, que yo os haré descansar." },
  { cita: "Salmos 34:19", texto: "Muchas son las aflicciones del justo: Mas de todas ellas le librará Jehová." },
  { cita: "Romanos 12:12", texto: "Gozosos en la esperanza; sufridos en la tribulación; constantes en la oración." },
];

function hashCadena(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function versiculoDeHoy() {
  const indice = hashCadena(hoyISO()) % VERSICULOS.length;
  return VERSICULOS[indice];
}

function mostrarVersiculoSiCorresponde() {
  const hoy = hoyISO();
  const clave = `mis-ejercicios-versiculo-visto-${ID_ELITA}`;
  let visto = null;
  try { visto = localStorage.getItem(clave); } catch (e) {}
  if (visto === hoy) return;
  const v = versiculoDeHoy();
  document.getElementById("versiculo-cita").textContent = v.cita;
  document.getElementById("versiculo-texto").textContent = `"${v.texto}"`;
  document.getElementById("versiculo-overlay").hidden = false;
  try { localStorage.setItem(clave, hoy); } catch (e) {}
}

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

function ejercicioInicial(nombre, detalle, categoria, video, musculo) {
  return { id: crypto.randomUUID(), nombre, detalle, categoria, video: video || null, musculo: musculo || null };
}

// --- Videos guía conocidos, usados también para completar ejercicios ya guardados ---
const VIDEOS_CONOCIDOS = {
  "Círculos de cuello": "videos/circulos-cuello.mp4",
  "Círculos de hombros": "videos/circulos-hombros.mp4",
  "Marcha en el lugar": "videos/marcha-en-el-lugar.mp4",
  "Círculos de cadera": "videos/circulos-cadera.mp4",
  "Círculos de tobillo": "videos/circulos-tobillo.mp4",
  "Sentadilla asistida en silla": "videos/sentadilla-asistida.mp4",
  "Puente de glúteo": "videos/puente-gluteo.mp4",
  "Remo sentada con banda": "videos/remo-banda.mp4",
  "Elevación lateral de brazos": "videos/elevacion-lateral-brazos.mp4",
  "Báscula pélvica": "videos/bascula-pelvica.mp4",
  "Elevación de talones": "videos/elevacion-talones.mp4",
  "Extensión de tríceps con banda": "videos/extension-triceps.mp4",
  "Equilibrio en un pie": "videos/equilibrio-un-pie.mp4",
  "Rodillas al pecho alternadas": "videos/rodillas-pecho.mp4",
};

// --- Músculo/zona entrenada por ejercicio principal, para el resumen de fin de entrenamiento ---
const MUSCULOS_CONOCIDOS = {
  "Sentadilla asistida en silla": "Piernas y glúteos",
  "Puente de glúteo": "Glúteos y core",
  "Remo sentada con banda": "Espalda",
  "Elevación lateral de brazos": "Hombros",
  "Báscula pélvica": "Core y espalda baja",
  "Elevación de talones": "Pantorrillas",
  "Extensión de tríceps con banda": "Brazos",
  "Equilibrio en un pie": "Equilibrio",
  "Rodillas al pecho alternadas": "Cadera y espalda",
};

function semana1Inicial() {
  return [
    // Calentamiento (todos los días, 8 min)
    ejercicioInicial("Círculos de cuello", "30 seg, sentada, movimientos suaves", "calentamiento", VIDEOS_CONOCIDOS["Círculos de cuello"]),
    ejercicioInicial("Círculos de hombros", "1 min, adelante y atrás", "calentamiento", VIDEOS_CONOCIDOS["Círculos de hombros"]),
    ejercicioInicial("Marcha en el lugar", "2 min, sostenida de la silla", "calentamiento", VIDEOS_CONOCIDOS["Marcha en el lugar"]),
    ejercicioInicial("Círculos de cadera", "1 min, de pie apoyada en silla", "calentamiento", VIDEOS_CONOCIDOS["Círculos de cadera"]),
    ejercicioInicial("Círculos de tobillo", "30 seg por lado, sentada", "calentamiento", VIDEOS_CONOCIDOS["Círculos de tobillo"]),
    // Bloque principal (2 series x 8-10, descanso 30 seg)
    ejercicioInicial("Sentadilla asistida en silla", "2x8 · piernas y glúteos", "principal", VIDEOS_CONOCIDOS["Sentadilla asistida en silla"], MUSCULOS_CONOCIDOS["Sentadilla asistida en silla"]),
    ejercicioInicial("Puente de glúteo", "2x8 · glúteos y core", "principal", VIDEOS_CONOCIDOS["Puente de glúteo"], MUSCULOS_CONOCIDOS["Puente de glúteo"]),
    ejercicioInicial("Remo sentada con banda", "2x10 · espalda", "principal", VIDEOS_CONOCIDOS["Remo sentada con banda"], MUSCULOS_CONOCIDOS["Remo sentada con banda"]),
    ejercicioInicial("Elevación lateral de brazos", "2x10 · hombros", "principal", VIDEOS_CONOCIDOS["Elevación lateral de brazos"], MUSCULOS_CONOCIDOS["Elevación lateral de brazos"]),
    ejercicioInicial("Báscula pélvica", "2x10 · core y espalda baja", "principal", VIDEOS_CONOCIDOS["Báscula pélvica"], MUSCULOS_CONOCIDOS["Báscula pélvica"]),
    ejercicioInicial("Elevación de talones", "2x10 · pantorrillas, apoyada en silla", "principal", VIDEOS_CONOCIDOS["Elevación de talones"], MUSCULOS_CONOCIDOS["Elevación de talones"]),
    ejercicioInicial("Extensión de tríceps con banda", "2x10 · brazos, sentada", "principal", VIDEOS_CONOCIDOS["Extensión de tríceps con banda"], MUSCULOS_CONOCIDOS["Extensión de tríceps con banda"]),
    ejercicioInicial("Equilibrio en un pie", "2x10 seg por lado · equilibrio, apoyo en silla", "principal", VIDEOS_CONOCIDOS["Equilibrio en un pie"], MUSCULOS_CONOCIDOS["Equilibrio en un pie"]),
    ejercicioInicial("Rodillas al pecho alternadas", "2x6 por lado · cadera y espalda", "principal", VIDEOS_CONOCIDOS["Rodillas al pecho alternadas"], MUSCULOS_CONOCIDOS["Rodillas al pecho alternadas"]),
    // Estiramiento final (8-10 min)
    ...estiramientoFinalSemana1(),
  ];
}

const ESTIRAMIENTO_ANTERIOR = ["Estiramiento de cadera", "Estiramiento de gemelos", "Estiramiento de hombros", "Respiración profunda"];

function estiramientoFinalSemana1() {
  return [
    ejercicioInicial("Estiramiento de cuello", "20 seg por lado, sentada, sin forzar", "estiramiento"),
    ejercicioInicial("Estiramiento de espalda alta", "20-30 seg, sentada, abrazando las rodillas", "estiramiento"),
    ejercicioInicial("Estiramiento de isquiotibiales", "20 seg por lado, sentada al borde de la silla", "estiramiento"),
    ejercicioInicial("Estiramiento de pecho y hombros", "20 seg por lado, apoyada en pared", "estiramiento"),
  ];
}

function normalizarEjercicio(ej) {
  let resultado = ej;
  if (typeof ej.detalle !== "string") {
    // Formato anterior: series/reps numéricos -> se combinan en un solo texto libre.
    const series = ej.series || 1;
    const reps = ej.reps !== undefined ? ej.reps : "";
    resultado = { id: ej.id, nombre: ej.nombre, detalle: `${series} series × ${reps}`, categoria: ej.categoria || "principal", video: ej.video || null, musculo: ej.musculo || null };
  }
  const videoConocido = VIDEOS_CONOCIDOS[resultado.nombre];
  if (videoConocido && !resultado.video) {
    resultado = { ...resultado, video: videoConocido };
  }
  const musculoConocido = MUSCULOS_CONOCIDOS[resultado.nombre];
  if (musculoConocido && !resultado.musculo) {
    resultado = { ...resultado, musculo: musculoConocido };
  }
  return resultado;
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
    if (analizado[1] && analizado[1].some((ej) => ESTIRAMIENTO_ANTERIOR.includes(ej.nombre))) {
      analizado[1] = analizado[1]
        .filter((ej) => !ESTIRAMIENTO_ANTERIOR.includes(ej.nombre))
        .concat(estiramientoFinalSemana1());
      cambio = true;
    }
    if (cambio) localStorage.setItem(`mis-ejercicios-datos-${perfilId}`, JSON.stringify(analizado));
    return analizado;
  }
  const iniciales = { 1: semana1Inicial(), 2: [], 3: [], 4: [] };
  localStorage.setItem(`mis-ejercicios-datos-${perfilId}`, JSON.stringify(iniciales));
  return iniciales;
}

function guardarSemanas() {
  localStorage.setItem(`mis-ejercicios-datos-${perfilActivo.id}`, JSON.stringify(semanas));
  sincronizarANube();
}

function cargarSemanaActualDe(perfilId) {
  const n = Number(localStorage.getItem(`mis-ejercicios-semana-actual-${perfilId}`));
  return n >= 1 && n <= 4 ? n : 1;
}

function guardarSemanaActual() {
  localStorage.setItem(`mis-ejercicios-semana-actual-${perfilActivo.id}`, String(semanaActual));
  sincronizarANube();
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
  sincronizarANube();
}

function cargarCronometrosDe(perfilId) {
  const datos = localStorage.getItem(`mis-ejercicios-cronometro-${perfilId}`);
  const cronometros = datos ? JSON.parse(datos) : {};
  Object.keys(cronometros).forEach((iso) => { cronometros[iso] = normalizarCronometro(cronometros[iso]); });
  return cronometros;
}

function guardarCronometros(cronometros) {
  localStorage.setItem(`mis-ejercicios-cronometro-${perfilActivo.id}`, JSON.stringify(cronometros));
  sincronizarANube();
}

let perfiles = cargarPerfiles();
let perfilActivo = null;
let semanas = { 1: [], 2: [], 3: [], 4: [] };
let semanaActual = 1;
let registro = {};
let cronometros = {};
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

// --- Duración en segundos a partir del detalle (ej. "30 seg", "1 min" -> cronómetro por ejercicio) ---
function extraerDuracionSegundos(detalle) {
  const m = /(\d+)\s*(segundos|seg|minutos|min)\b/i.exec(detalle || "");
  if (!m) return null;
  const cantidad = parseInt(m[1], 10);
  const esMinutos = m[2].toLowerCase().startsWith("min");
  return esMinutos ? cantidad * 60 : cantidad;
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

let perfilPendienteClave = null;

function mostrarPantallaClave(perfil) {
  perfilPendienteClave = perfil;
  document.getElementById("clave-titulo").textContent = perfil === ID_ELITA ? "Hola, Elita" : "Hola, Juan Manolo";
  document.getElementById("clave-subtitulo").textContent =
    perfil === ID_ELITA ? "Ingresá tu clave para hacer tus ejercicios." : "Ingresá la clave para ver el progreso de Elita.";
  document.getElementById("input-clave").value = "";
  document.getElementById("clave-error").hidden = true;
  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("pantalla-clave").hidden = false;
  setTimeout(() => document.getElementById("input-clave").focus(), 100);
}

document.getElementById("btn-perfil-elita").addEventListener("click", () => {
  mostrarPantallaClave(ID_ELITA);
});

document.getElementById("btn-perfil-juan").addEventListener("click", () => {
  mostrarPantallaClave("juan");
});

document.getElementById("volver-selector").addEventListener("click", () => {
  perfilPendienteClave = null;
  mostrarPantallaPerfil();
});

document.getElementById("form-clave").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("input-clave");
  const claveCorrecta = perfilPendienteClave === ID_ELITA ? CLAVE_ELITA : CLAVE_JUAN;
  if (input.value.trim() === claveCorrecta) {
    if (perfilPendienteClave === ID_ELITA) {
      asegurarPerfilElita();
      iniciarApp(ID_ELITA);
    } else {
      iniciarJuan();
    }
  } else {
    document.getElementById("clave-error").hidden = false;
    input.value = "";
    input.focus();
  }
});

document.getElementById("cerrar-sesion-elita").addEventListener("click", () => {
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
  cronometros = cargarCronometrosDe(id);
  sincronizarANube();
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
  renderTodo();
  mostrarVersiculoSiCorresponde();
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
          const duracionEj = extraerDuracionSegundos(ej.detalle);
          card.innerHTML = `
            <span class="ejercicio-icono ${tileEjercicio(ej.id)}">${iconoEjercicio(ej.nombre)}</span>
            <div class="ejercicio-info">
              <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
              <span class="ejercicio-detalle">${escapeHtml(ej.detalle)}</span>
              <div class="acciones-ejercicio">
                ${ej.video ? `<button type="button" class="ver-video-btn" data-video="${escapeHtml(ej.video)}" data-nombre="${escapeHtml(ej.nombre)}">🎥 Ver guía</button>` : ""}
                ${duracionEj ? `<button type="button" class="cronometrar-btn" data-segundos="${duracionEj}" data-nombre="${escapeHtml(ej.nombre)}">⏱️ Cronometrar</button>` : ""}
              </div>
              <div class="series-fila">${botonesSeries}</div>
            </div>
          `;
          card.querySelectorAll(".serie-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              const marcada = toggleCompletado(btn.dataset.clave);
              if (marcada) iniciarTemporizador(30);
            });
          });
        } else {
          const hecho = hechosHoy.includes(ej.id);
          const duracionEj = extraerDuracionSegundos(ej.detalle);
          card.className = "ejercicio-card" + (hecho ? " hecho" : "");
          card.innerHTML = `
            <span class="ejercicio-icono ${tileEjercicio(ej.id)}">${iconoEjercicio(ej.nombre)}</span>
            <div class="ejercicio-info">
              <span class="ejercicio-nombre">${escapeHtml(ej.nombre)}</span>
              <span class="ejercicio-detalle">${escapeHtml(ej.detalle)}</span>
              <div class="acciones-ejercicio">
                ${ej.video ? `<button type="button" class="ver-video-btn" data-video="${escapeHtml(ej.video)}" data-nombre="${escapeHtml(ej.nombre)}">🎥 Ver guía</button>` : ""}
                ${duracionEj ? `<button type="button" class="cronometrar-btn" data-segundos="${duracionEj}" data-nombre="${escapeHtml(ej.nombre)}">⏱️ Cronometrar</button>` : ""}
              </div>
            </div>
            <button class="check-btn" aria-label="Marcar completado">✓</button>
          `;
          card.querySelector(".check-btn").addEventListener("click", () => {
            const marcada = toggleCompletado(ej.id);
            if (marcada) iniciarTemporizador(30);
          });
        }
        card.querySelectorAll(".ver-video-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirVideo(btn.dataset.video, btn.dataset.nombre);
          });
        });
        card.querySelectorAll(".cronometrar-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            iniciarTemporizador(Number(btn.dataset.segundos), btn.dataset.nombre, "¡Listo! 💪");
          });
        });
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

  actualizarCronometroUI();
  renderGraficoSemana("semana-grafico");
}

const META_DIAS_SEMANA = 5;

function diaCompletoParaLista(lista, hechosEseDia) {
  return lista.length > 0 && lista.every((ej) => clavesSerie(ej).every((clave) => hechosEseDia.includes(clave)));
}

function contarDiasCompletosSemana(lista) {
  return Object.values(registro).filter((idsDelDia) => diaCompletoParaLista(lista, idsDelDia)).length;
}

function verificarProgresionSemana() {
  const lista = semanas[semanaActual] || [];
  if (lista.length === 0) return;
  if (contarDiasCompletosSemana(lista) < META_DIAS_SEMANA) return;

  if (semanaActual < 4) {
    const completada = semanaActual;
    semanaActual++;
    guardarSemanaActual();
    alert(`¡Felicitaciones! Completaste la Semana ${completada}. Ahora te toca la Semana ${semanaActual} 💪`);
  } else {
    semanaActual = 1;
    guardarSemanaActual();
    alert("¡Felicitaciones! Completaste las 4 semanas de rutina. ¡Volvés a empezar en la Semana 1! 🎉");
  }
}

// --- Cronómetro de entrenamiento (desde el primer ejercicio marcado hasta completar el día) ---
function formatoDuracion(ms) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

const INACTIVIDAD_CRONOMETRO_MS = 3 * 60 * 1000;

function primerEjercicioCalentamiento(lista) {
  return lista.find((ej) => (ej.categoria || "principal") === "calentamiento") || lista[0];
}

function ultimoEjercicioEstiramiento(lista) {
  const estiramientos = lista.filter((ej) => (ej.categoria || "principal") === "estiramiento");
  return estiramientos.length > 0 ? estiramientos[estiramientos.length - 1] : lista[lista.length - 1];
}

// El cronómetro guarda el tiempo ya acumulado (acumuladoMs) más, mientras está
// corriendo, el inicio del tramo actual (segmentoInicio). Al pausarse por
// inactividad, ese tramo se suma a acumuladoMs y segmentoInicio queda en null;
// al reanudar (marcar otro ejercicio) se abre un tramo nuevo, sin contar el
// tiempo que estuvo pausado.
function crearCronometroInicial(ahora) {
  return { acumuladoMs: 0, segmentoInicio: ahora, ultimaActividad: ahora, fin: null };
}

function normalizarCronometro(estado) {
  if (estado.segmentoInicio !== undefined) return estado;
  // Formato anterior: { inicio, ultimaActividad, fin }.
  if (estado.fin) {
    return { acumuladoMs: estado.fin - estado.inicio, segmentoInicio: null, ultimaActividad: estado.ultimaActividad || estado.fin, fin: estado.fin };
  }
  return { acumuladoMs: 0, segmentoInicio: estado.inicio, ultimaActividad: estado.ultimaActividad || estado.inicio, fin: null };
}

function duracionActual(estado, ahora = Date.now()) {
  const enCurso = estado.segmentoInicio ? ahora - estado.segmentoInicio : 0;
  return estado.acumuladoMs + enCurso;
}

function verificarCronometroHoy(hechosHoy) {
  const hoy = hoyISO();
  const listaActual = semanas[semanaActual] || [];
  if (listaActual.length === 0) return;

  const primerEj = primerEjercicioCalentamiento(listaActual);
  const ultimoEj = ultimoEjercicioEstiramiento(listaActual);
  const primerEmpezado = primerEj && clavesSerie(primerEj).some((k) => hechosHoy.includes(k));
  const ultimoCompleto = ultimoEj && clavesSerie(ultimoEj).every((k) => hechosHoy.includes(k));

  const ahora = Date.now();
  let cambio = false;

  if (primerEmpezado && !cronometros[hoy]) {
    cronometros[hoy] = crearCronometroInicial(ahora);
    cambio = true;
  } else if (cronometros[hoy]) {
    cronometros[hoy] = normalizarCronometro(cronometros[hoy]);
    const estado = cronometros[hoy];
    if (!estado.fin) {
      if (!estado.segmentoInicio) estado.segmentoInicio = ahora; // reanudar tras una pausa
      estado.ultimaActividad = ahora;
      cambio = true;
    }
  }

  if (cronometros[hoy] && ultimoCompleto && !cronometros[hoy].fin) {
    const estado = cronometros[hoy];
    estado.acumuladoMs = duracionActual(estado, ahora);
    estado.segmentoInicio = null;
    estado.fin = ahora;
    cambio = true;
    mostrarResumenEntrenamiento(listaActual, hechosHoy, estado);
  }
  if (cambio) guardarCronometros(cronometros);
}

function mostrarResumenEntrenamiento(listaActual, hechosHoy, estadoCronometro) {
  const duracion = formatoDuracion(duracionActual(estadoCronometro));
  const musculos = [
    ...new Set(
      listaActual
        .filter((ej) => (ej.categoria || "principal") === "principal" && ej.musculo)
        .filter((ej) => clavesSerie(ej).every((k) => hechosHoy.includes(k)))
        .map((ej) => ej.musculo)
    ),
  ];
  document.getElementById("resumen-tiempo").textContent = duracion;
  document.getElementById("resumen-musculos").textContent = musculos.length > 0 ? musculos.join(", ") : "—";
  document.getElementById("resumen-overlay").hidden = false;
  sonarFanfarria();
}

let cronometroEntrenamientoIntervalo = null;

function actualizarCronometroUI() {
  const tarjeta = document.getElementById("tarjeta-cronometro");
  const valor = document.getElementById("cronometro-valor");
  const titulo = document.getElementById("cronometro-titulo");
  const hoy = hoyISO();

  if (!cronometros[hoy]) {
    tarjeta.hidden = true;
    if (cronometroEntrenamientoIntervalo) {
      clearInterval(cronometroEntrenamientoIntervalo);
      cronometroEntrenamientoIntervalo = null;
    }
    return;
  }

  cronometros[hoy] = normalizarCronometro(cronometros[hoy]);
  const estado = cronometros[hoy];

  if (!estado.fin && estado.segmentoInicio && Date.now() - estado.ultimaActividad >= INACTIVIDAD_CRONOMETRO_MS) {
    // Auto-pausar: se acredita el tiempo hasta el corte de inactividad, no hasta ahora.
    const corte = estado.ultimaActividad + INACTIVIDAD_CRONOMETRO_MS;
    estado.acumuladoMs += corte - estado.segmentoInicio;
    estado.segmentoInicio = null;
    guardarCronometros(cronometros);
  }

  tarjeta.hidden = false;
  valor.textContent = formatoDuracion(duracionActual(estado));

  const listaActual = semanas[semanaActual] || [];
  const hechosHoy = registro[hoy] || [];
  const completoHoy = diaCompletoParaLista(listaActual, hechosHoy);

  if (estado.fin) {
    titulo.textContent = completoHoy ? "¡Rutina completada en!" : "Entrenamiento pausado";
    if (cronometroEntrenamientoIntervalo) {
      clearInterval(cronometroEntrenamientoIntervalo);
      cronometroEntrenamientoIntervalo = null;
    }
  } else if (!estado.segmentoInicio) {
    titulo.textContent = "Entrenamiento pausado";
    if (cronometroEntrenamientoIntervalo) {
      clearInterval(cronometroEntrenamientoIntervalo);
      cronometroEntrenamientoIntervalo = null;
    }
  } else {
    titulo.textContent = "Tiempo de entrenamiento";
    if (!cronometroEntrenamientoIntervalo) {
      cronometroEntrenamientoIntervalo = setInterval(actualizarCronometroUI, 1000);
    }
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
  verificarCronometroHoy(hechosHoy);
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

  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const cronDia = cronometros[iso];
    const duracionMs = cronDia ? duracionActual(normalizarCronometro(cronDia)) : 0;
    dias.push({ fecha, iso, duracionMs, activo: diaCompletado(iso) });
  }

  const maxDuracion = Math.max(...dias.map((d) => d.duracionMs), 1);

  dias.forEach(({ fecha, duracionMs, activo }) => {
    const alturaPct = duracionMs > 0 ? Math.max(15, Math.round((duracionMs / maxDuracion) * 100)) : activo ? 100 : 10;
    const duracionTexto = duracionMs > 0 ? formatoDuracion(duracionMs) : "";

    const wrap = document.createElement("div");
    wrap.className = "dia-barra-wrap";
    wrap.innerHTML = `
      <span class="dia-duracion">${duracionTexto}</span>
      <div class="dia-barra ${activo ? "activo" : ""}" style="height:${alturaPct}%"></div>
      <span class="dia-letra">${letras[fecha.getDay()]}</span>
    `;
    grafico.appendChild(wrap);
  });
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

  const metaDiasActivos = 5;
  const anillos = [
    { porcentaje: (contadorSemana / metaDiasActivos) * 100, color: "#2f9e8f" },
    { porcentaje: (ejerciciosSemana / metaEjercicios) * 100, color: "#ef8a5f" },
    { porcentaje: (Math.min(racha, 7) / 7) * 100, color: "#c99a4a" },
  ];
  document.getElementById("anillos-semana-wrap").innerHTML = crearAnillosConcentricos(anillos);

  document.getElementById("anillos-leyenda").innerHTML = `
    <div class="leyenda-fila"><span class="leyenda-punto" style="background:#2f9e8f"></span><span class="leyenda-texto">Días activos</span><span class="leyenda-valor">${contadorSemana}/${metaDiasActivos}</span></div>
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

// --- Pestaña Semanas ---
function renderSemanas() {
  const contenedor = document.getElementById("lista-semanas");
  const abiertasAntes = new Set(
    Array.from(contenedor.querySelectorAll(".semana-acordeon[open]")).map((d) => d.dataset.semana)
  );
  contenedor.innerHTML = "";

  for (let n = 1; n <= 4; n++) {
    const lista = semanas[n] || [];

    if (n > semanaActual) {
      const bloqueada = document.createElement("div");
      bloqueada.className = "semana-bloqueada";
      bloqueada.innerHTML = `
        <div class="semana-bloqueada-fila">
          <span>Semana ${n}</span>
          <span aria-hidden="true">🔒</span>
        </div>
        <p class="semana-bloqueada-ayuda">Completá la Semana ${n - 1} durante ${META_DIAS_SEMANA} días para desbloquearla.</p>
      `;
      contenedor.appendChild(bloqueada);
      continue;
    }

    const diasCompletos = contarDiasCompletosSemana(lista);

    const detalle = document.createElement("details");
    detalle.className = "semana-acordeon";
    detalle.dataset.semana = String(n);
    detalle.open = abiertasAntes.size > 0 ? abiertasAntes.has(String(n)) : n === semanaActual;

    detalle.innerHTML = `
      <summary class="semana-resumen">
        <span class="semana-nombre">Semana ${n}${n === semanaActual ? '<span class="semana-badge">Actual</span>' : ""}</span>
        <span class="semana-progreso">${diasCompletos}/${META_DIAS_SEMANA} días</span>
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
              ${ej.video ? `<button type="button" class="ver-video-btn" data-video="${escapeHtml(ej.video)}" data-nombre="${escapeHtml(ej.nombre)}">🎥 Ver guía</button>` : ""}
            </div>
            <button class="eliminar-btn" aria-label="Eliminar ${escapeHtml(ej.nombre)}">🗑</button>
          `;
          const botonVideo = card.querySelector(".ver-video-btn");
          if (botonVideo) {
            botonVideo.addEventListener("click", () => abrirVideo(botonVideo.dataset.video, botonVideo.dataset.nombre));
          }
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
  perfilActivo = asegurarPerfilElita();
  semanas = cargarSemanasDe(ID_ELITA);
  registro = cargarRegistroDe(ID_ELITA);
  cronometros = cargarCronometrosDe(ID_ELITA);
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

function eliminarSesionDia(iso, fechaTexto) {
  if (!confirm(`¿Eliminar la sesión del ${fechaTexto}? Se borran los ejercicios marcados y el tiempo de ese día.`)) return;
  delete registro[iso];
  delete cronometros[iso];
  guardarRegistro(registro);
  guardarCronometros(cronometros);
  renderHistorial();
}

function reiniciarCronometroDia(iso, fechaTexto) {
  if (!confirm(`¿Reiniciar el cronómetro del ${fechaTexto}? Los ejercicios marcados ese día no se van a borrar.`)) return;
  delete cronometros[iso];
  guardarCronometros(cronometros);
  renderHistorial();
}

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

    const cronDia = cronometros[iso] ? normalizarCronometro(cronometros[iso]) : null;
    const duracionTexto = cronDia ? formatoDuracion(duracionActual(cronDia)) : "";

    const card = document.createElement("div");
    card.className = "ejercicio-card hecho";
    card.innerHTML = `
      <span class="ejercicio-icono tile-teal">✓</span>
      <div class="ejercicio-info">
        <span class="ejercicio-nombre">${escapeHtml(fechaTexto)}</span>
        <span class="ejercicio-detalle">${escapeHtml(nombres.join(", "))}</span>
        ${duracionTexto ? `<span class="ejercicio-detalle">⏱️ ${duracionTexto}${cronDia.fin ? "" : " (en curso)"}</span>` : ""}
        <div class="historial-acciones">
          ${cronDia ? `<button type="button" class="reiniciar-cron-btn">↺ Reiniciar cronómetro</button>` : ""}
          <button type="button" class="eliminar-sesion-btn">🗑 Eliminar sesión</button>
        </div>
      </div>
    `;
    const btnReiniciar = card.querySelector(".reiniciar-cron-btn");
    if (btnReiniciar) {
      btnReiniciar.addEventListener("click", () => reiniciarCronometroDia(iso, fechaTexto));
    }
    card.querySelector(".eliminar-sesion-btn").addEventListener("click", () => eliminarSesionDia(iso, fechaTexto));
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

function reproducirTono(ctx, frecuencia, inicio, duracion, tipo, volumen) {
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

// Campanita de dos notas (sol5 -> do6), usada al terminar un descanso o el cronómetro de un ejercicio.
function sonarAlarma() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    reproducirTono(ctx, 784.0, 0, 0.3, "sine", 0.28);
    reproducirTono(ctx, 1046.5, 0.2, 0.45, "sine", 0.28);
  } catch (e) {}
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
}

// Fanfarria ascendente (do5-mi5-sol5-do6), usada al completar toda la rutina del día.
function sonarFanfarria() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      reproducirTono(ctx, freq, i * 0.14, 0.35, "triangle", 0.22);
    });
  } catch (e) {}
  if (navigator.vibrate) {
    try { navigator.vibrate([150, 60, 150, 60, 250]); } catch (e) {}
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

function iniciarTemporizador(segundosTotal, titulo = "Descanso", tituloFin = "¡Descanso terminado! 💪") {
  detenerTemporizador();
  let restante = segundosTotal;
  document.getElementById("temporizador-titulo").textContent = titulo;
  actualizarTemporizadorUI(restante, segundosTotal);
  document.getElementById("temporizador-overlay").hidden = false;

  temporizadorIntervalo = setInterval(() => {
    restante--;
    if (restante <= 0) {
      detenerTemporizador();
      actualizarTemporizadorUI(0, segundosTotal);
      document.getElementById("temporizador-titulo").textContent = tituloFin;
      sonarAlarma();
    } else {
      actualizarTemporizadorUI(restante, segundosTotal);
    }
  }, 1000);
}

document.getElementById("cerrar-temporizador").addEventListener("click", () => {
  cerrarTemporizador();
});

// --- Video guía ---
function abrirVideo(ruta, nombre) {
  const video = document.getElementById("video-guia");
  document.getElementById("video-titulo").textContent = nombre;
  video.src = ruta;
  document.getElementById("video-overlay").hidden = false;
  video.play().catch(() => {});
}

function cerrarVideo() {
  const video = document.getElementById("video-guia");
  video.pause();
  video.src = "";
  document.getElementById("video-overlay").hidden = true;
}

document.getElementById("cerrar-video").addEventListener("click", cerrarVideo);

// --- Resumen de fin de entrenamiento ---
document.getElementById("cerrar-resumen").addEventListener("click", () => {
  document.getElementById("resumen-overlay").hidden = true;
});

// --- Versículo del día ---
document.getElementById("cerrar-versiculo").addEventListener("click", () => {
  document.getElementById("versiculo-overlay").hidden = true;
});

// --- Exportar historial a PDF (usa el diálogo de impresión del navegador) ---
document.getElementById("exportar-historial-btn").addEventListener("click", () => {
  document.getElementById("fecha-exportacion").textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  window.print();
});

// --- Inicio ---
// Siempre se pide la clave al entrar o recargar la página; el progreso
// guardado (semanas, registro, cronómetros) no se ve afectado por esto.
mostrarPantallaPerfil();

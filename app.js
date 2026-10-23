import { semanasCompatibles } from "./plan-retina.js?v=2";
import {
  BORRAR,
  crearPlanInicial,
  normalizarPlan,
  nombresDeSemanasViejas,
  aplicarParche,
  avanceTrasSesion,
} from "./progreso-plan.js?v=2";
import { configurarElita, mostrarInicio, renderInicio, estaEnSesion, quitarAjustes } from "./elita.js?v=2";

// --- Sincronización en la nube (Firebase Firestore) ---
// Todo esto corre en segundo plano sin bloquear el arranque de la app: si no
// hay internet o falla la carga, la app sigue funcionando solo con localStorage.
// Hay dos docs:
// - "progreso/elita": el formato de siempre { semanas, semanaActual, registro, cronometros }.
//   Se escribe completo (sin merge), igual que la versión anterior de la app, así que
//   no se le agregan campos nuevos: un celular con la versión vieja los borraría.
// - "progreso/elita-plan": todo lo del plan nuevo (sesiones, ajustes, semana del plan).
//   Se escribe por partes con merge, así nunca pisa lo que escribió otro dispositivo.
let docElita = null;
let docPlan = null;
let firestoreDb = null;
let firestoreSetDoc = null;
let firestoreRunTransaction = null;
let firestoreDeleteField = null;
// Hasta recibir lo que hay en la nube no se escribe el doc viejo completo: en un
// celular nuevo (sin datos guardados) eso borraría el historial de la nube.
let docElitaRecibido = false;
let planRecibido = false;

(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js");
    const { initializeFirestore, persistentLocalCache, doc, setDoc, onSnapshot, runTransaction, deleteField } = await import(
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
    docPlan = doc(db, "progreso", "elita-plan");
    firestoreDb = db;
    firestoreSetDoc = setDoc;
    firestoreRunTransaction = runTransaction;
    firestoreDeleteField = deleteField;

    onSnapshot(docElita, recibirDocViejo, () => {});
    onSnapshot(docPlan, recibirPlan, () => {});
  } catch (e) {
    docElita = null;
    docPlan = null;
    firestoreSetDoc = null;
  }
})();

function sincronizarANube() {
  if (!docElita || !firestoreSetDoc || !docElitaRecibido) return;
  // Sin merge: siempre mandamos el estado local completo, así una eliminación
  // (por ejemplo, borrar la sesión de un día) también se refleja en la nube.
  firestoreSetDoc(docElita, { semanas, semanaActual, registro, cronometros }).catch(() => {});
}

function recibirDocViejo(snap) {
  // Un "no existe" sacado de la caché del celular no dice nada: hay que esperar a la nube.
  if (!snap.exists() && snap.metadata.fromCache) return;
  const primeraVez = !docElitaRecibido;
  docElitaRecibido = true;
  if (!primeraVez) {
    if (snap.exists()) aplicarDatosRemotos(snap.data());
    return;
  }
  // Días que se guardaron en este celular antes de poder hablar con la nube: se conservan.
  const fechasLocales = cargarFechasPendientes();
  const registroLocal = registro;
  const cronometrosLocal = cronometros;
  if (snap.exists()) aplicarDatosRemotos(snap.data());
  fechasLocales.forEach((iso) => {
    if (registroLocal[iso]) registro[iso] = registroLocal[iso];
    if (cronometrosLocal[iso]) cronometros[iso] = cronometrosLocal[iso];
  });
  guardarFechasPendientes([]);
  if (!snap.exists() || fechasLocales.length > 0) {
    guardarDocViejoLocal();
    sincronizarANube();
    refrescarVistas();
  }
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

  if (alinearDocViejoConPlan()) sincronizarANube();
  refrescarVistas();
}

function refrescarVistas() {
  if (perfilActivo && perfilActivo.id === ID_ELITA && !document.getElementById("app-contenido").hidden) {
    renderTodo();
  }
  if (!document.getElementById("app-juan").hidden) {
    const tabJuanActivo = document.querySelector("#app-juan .nav-btn.active")?.dataset.tabJuan || "calendario";
    irATabJuan(tabJuanActivo);
  }
}

// --- Plan nuevo (doc "progreso/elita-plan") ---
// Cada cambio es un parche que se aplica acá, se guarda en el celular y se manda con merge.
// Si todavía no hay conexión con la nube, el parche queda en cola y se manda después.
const CLAVE_PLAN = "mis-ejercicios-plan-elita";
const CLAVE_PLAN_PENDIENTES = "mis-ejercicios-plan-pendientes-elita";
const CLAVE_PLAN_PROVISIONAL = "mis-ejercicios-plan-provisional-elita";
const CLAVE_FECHAS_PENDIENTES = "mis-ejercicios-fechas-pendientes-elita";

function leerJSON(clave, porDefecto) {
  try {
    const datos = localStorage.getItem(clave);
    return datos ? JSON.parse(datos) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

function escribirJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}

function guardarPlanLocal() {
  escribirJSON(CLAVE_PLAN, plan);
}

function cargarParchesPendientes() {
  return leerJSON(CLAVE_PLAN_PENDIENTES, []);
}

function guardarParchesPendientes(lista) {
  escribirJSON(CLAVE_PLAN_PENDIENTES, lista);
}

function cargarFechasPendientes() {
  return leerJSON(CLAVE_FECHAS_PENDIENTES, []);
}

function guardarFechasPendientes(lista) {
  escribirJSON(CLAVE_FECHAS_PENDIENTES, lista);
}

function marcarPlanProvisional(valor) {
  planProvisional = valor;
  try {
    if (valor) localStorage.setItem(CLAVE_PLAN_PROVISIONAL, "1");
    else localStorage.removeItem(CLAVE_PLAN_PROVISIONAL);
  } catch (e) {}
}

// Firestore no acepta la marca BORRAR ni valores undefined.
function paraFirestore(valor) {
  if (valor === BORRAR) return firestoreDeleteField();
  if (Array.isArray(valor)) return valor.map(paraFirestore);
  if (valor !== null && typeof valor === "object") {
    const resultado = {};
    Object.entries(valor).forEach(([k, v]) => { if (v !== undefined) resultado[k] = paraFirestore(v); });
    return resultado;
  }
  return valor;
}

function enviarParche(parche) {
  firestoreSetDoc(docPlan, paraFirestore(parche), { merge: true }).catch(() => {});
}

function actualizarPlan(parche) {
  plan = aplicarParche(plan, parche);
  guardarPlanLocal();
  if (docPlan && planRecibido) enviarParche(parche);
  else guardarParchesPendientes([...cargarParchesPendientes(), parche]);
}

function recibirPlan(snap) {
  if (!snap.exists() && snap.metadata.fromCache) return;
  const datos = snap.exists() ? snap.data() : null;
  if (!datos || !datos.planVersion) {
    // La nube todavía no tiene el plan nuevo: se migra una sola vez.
    if (!snap.metadata.fromCache) migrarEnLaNube();
    return;
  }
  let remoto = normalizarPlan(datos, hoyISO());
  const pendientes = cargarParchesPendientes();
  if (pendientes.length > 0) {
    // Si el plan de este celular era provisional (se creó sin conexión) y otro dispositivo
    // ya había migrado, de lo hecho acá solo se suben las sesiones: la semana y la fecha
    // de inicio que valen son las de la nube.
    pendientes
      .map((p) => (planProvisional ? (p.sesiones ? { sesiones: p.sesiones } : null) : p))
      .filter(Boolean)
      .forEach((p) => {
        remoto = aplicarParche(remoto, p);
        enviarParche(p);
      });
    guardarParchesPendientes([]);
  }
  marcarPlanProvisional(false);
  planRecibido = true;
  plan = remoto;
  guardarPlanLocal();
  if (alinearDocViejoConPlan()) {
    guardarDocViejoLocal();
    sincronizarANube();
  }
  refrescarVistas();
}

// Migración al plan nuevo, una sola vez y en transacción: si dos celulares la intentan a la
// vez, solo uno la escribe. No toca "registro" ni "cronometros" del doc viejo.
let migrando = false;

async function migrarEnLaNube() {
  if (migrando || !firestoreRunTransaction) return;
  migrando = true;
  try {
    await firestoreRunTransaction(firestoreDb, async (t) => {
      const snapPlan = await t.get(docPlan);
      if (snapPlan.exists() && snapPlan.data().planVersion) return; // otro dispositivo ya migró
      const snapViejo = await t.get(docElita);
      const semanasNube = snapViejo.exists() ? snapViejo.data().semanas : null;
      const nuevo = { ...plan, nombresAnteriores: { ...nombresDeSemanasViejas(semanasNube), ...plan.nombresAnteriores } };
      t.set(docPlan, paraFirestore(nuevo), { merge: true });
      t.set(docElita, { semanas: semanasCompatibles(), semanaActual: nuevo.semanaActual }, { merge: true });
    });
    // El plan completo de este celular (con lo que estaba en cola) ya quedó escrito.
    guardarParchesPendientes([]);
  } catch (e) {
    // Sin conexión o en conflicto: se vuelve a intentar con la próxima noticia de la nube.
  } finally {
    migrando = false;
  }
}

// El doc viejo refleja el plan: semanas con los ejercicios nuevos y la semana del plan.
// Si un celular con la versión vieja lo cambió, se corrige. Devuelve true si cambió algo.
function alinearDocViejoConPlan() {
  if (planProvisional || !planRecibido) return false;
  let cambio = false;
  if (semanaActual !== plan.semanaActual) {
    semanaActual = plan.semanaActual;
    cambio = true;
  }
  const compatibles = semanasCompatibles();
  const mismosIds = [1, 2, 3, 4].every(
    (n) => (semanas[n] || []).map((ej) => ej.id).join() === compatibles[n].map((ej) => ej.id).join()
  );
  if (!mismosIds) {
    const nombresNuevos = nombresDeSemanasViejas(semanas);
    const faltan = Object.keys(nombresNuevos).filter((id) => !plan.nombresAnteriores[id]);
    if (faltan.length > 0) {
      actualizarPlan({ nombresAnteriores: Object.fromEntries(faltan.map((id) => [id, nombresNuevos[id]])) });
    }
    semanas = compatibles;
    cambio = true;
  }
  if (cambio) guardarDocViejoLocal();
  return cambio;
}

function guardarDocViejoLocal() {
  try {
    localStorage.setItem(`mis-ejercicios-datos-${ID_ELITA}`, JSON.stringify(semanas));
    localStorage.setItem(`mis-ejercicios-semana-actual-${ID_ELITA}`, String(semanaActual));
    localStorage.setItem(`mis-ejercicios-registro-${ID_ELITA}`, JSON.stringify(registro));
    localStorage.setItem(`mis-ejercicios-cronometro-${ID_ELITA}`, JSON.stringify(cronometros));
  } catch (e) {}
}

// Al cerrar una sesión del plan: se guarda en "sesiones" y, para que el calendario y el
// historial de siempre sigan andando, también en registro[fecha] y cronometros[fecha].
// Devuelve el aviso de avance de semana, si corresponde ({ tipo: "semana" | "mes", ... }).
function guardarSesion(fecha, sesion) {
  actualizarPlan({ sesiones: { [fecha]: sesion } });
  if (sesion.estado !== "malestar" && sesion.hechos.length > 0) {
    registro[fecha] = [...sesion.hechos];
    cronometros[fecha] = { acumuladoMs: sesion.duracionMs, segmentoInicio: null, ultimaActividad: sesion.fin, fin: sesion.fin };
    guardarDocViejoLocal();
    if (docElitaRecibido) sincronizarANube();
    else guardarFechasPendientes([...new Set([...cargarFechasPendientes(), fecha])]);
  }
  return revisarAvance(fecha);
}

function revisarAvance(hoy = hoyISO()) {
  const { parche, evento } = avanceTrasSesion(plan, hoy);
  if (parche) {
    actualizarPlan(parche);
    if (alinearDocViejoConPlan()) sincronizarANube();
  }
  return evento;
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

function cargarSemanaActualDe(perfilId) {
  const n = Number(localStorage.getItem(`mis-ejercicios-semana-actual-${perfilId}`));
  return n >= 1 && n <= 4 ? n : 1;
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
// Datos de Elita: se cargan al abrir la página (los usan Elita, Juan y la sincronización).
const habiaRutinaGuardada = leerJSON(`mis-ejercicios-datos-${ID_ELITA}`, null) !== null;
let semanas = cargarSemanasDe(ID_ELITA);
let semanaActual = cargarSemanaActualDe(ID_ELITA);
let registro = cargarRegistroDe(ID_ELITA);
let cronometros = cargarCronometrosDe(ID_ELITA);
let mesVisible = new Date();

// Plan nuevo: el guardado en el celular o, la primera vez, uno provisional que después se
// confirma (migración) o se reemplaza por el que ya esté en la nube.
let plan = leerJSON(CLAVE_PLAN, null);
let planProvisional = leerJSON(CLAVE_PLAN_PROVISIONAL, 0) === 1;
if (plan) {
  plan = normalizarPlan(plan, hoyISO());
  if (!planProvisional) semanaActual = plan.semanaActual;
} else {
  plan = crearPlanInicial(hoyISO(), habiaRutinaGuardada ? semanas : null);
  marcarPlanProvisional(true);
  guardarPlanLocal();
  semanas = semanasCompatibles();
  semanaActual = 1;
  guardarDocViejoLocal();
}

function idBaseDeClave(clave) {
  return clave.split("#")[0];
}

// --- Anillos SVG ---
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
  quitarAjustes();
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
  mesVisible = new Date();
  document.getElementById("pantalla-perfil").hidden = true;
  document.getElementById("pantalla-clave").hidden = true;
  document.getElementById("app-juan").hidden = true;
  document.getElementById("app-contenido").hidden = false;
  document.getElementById("saludo-usuario").textContent = `Hola, ${perfilActivo.nombre} 👋`;
  document.getElementById("fecha-hoy").textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  mostrarInicio();
  mostrarVersiculoSiCorresponde();
}

function mostrarInicioElita() {
  document.getElementById("tab-progreso").classList.remove("active");
  document.getElementById("elita-inicio").classList.add("active");
}

function mostrarProgresoElita() {
  document.getElementById("elita-inicio").classList.remove("active");
  document.getElementById("tab-progreso").classList.add("active");
  document.querySelector("#app-contenido .app-main").scrollTop = 0;
  mesVisible = new Date();
  renderProgreso();
}

document.getElementById("volver-inicio-elita").addEventListener("click", () => {
  mostrarInicioElita();
  renderInicio();
});

// --- Cronómetro del día (formato del doc viejo, lo usan el historial y los gráficos) ---
function formatoDuracion(ms) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

// El cronómetro guarda el tiempo ya acumulado (acumuladoMs) más, mientras está
// corriendo, el inicio del tramo actual (segmentoInicio). Las sesiones del plan
// nuevo se guardan ya cerradas: { acumuladoMs, segmentoInicio: null, fin }.
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

// Cuando llegan cambios de la nube (por ejemplo, Juan cambió de semana). Durante una
// sesión no se toca nada: la pantalla de la sesión manda.
function renderTodo() {
  if (estaEnSesion()) return;
  if (document.getElementById("tab-progreso").classList.contains("active")) renderProgreso();
  else renderInicio();
}

// --- App de Juan Manolo (solo lectura del progreso de Elita) ---
function iniciarJuan() {
  perfilActivo = asegurarPerfilElita();
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
  if (plan.sesiones[iso]) actualizarPlan({ sesiones: { [iso]: BORRAR } });
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

  // Los ejercicios de la rutina anterior se muestran con su nombre de antes.
  const nombresPorId = new Map([
    ...Object.entries(plan.nombresAnteriores),
    ...todosLosEjercicios().map((ej) => [ej.id, ej.nombre]),
  ]);
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

// --- Modo prueba (?prueba=1): acceso a los datos desde la consola o desde pruebas automáticas ---
const MODO_PRUEBA = new URLSearchParams(location.search).get("prueba") === "1";
if (MODO_PRUEBA) {
  window.elitaPrueba = {
    plan: () => plan,
    docViejo: () => ({ semanas, semanaActual, registro, cronometros }),
    guardarSesion,
    actualizarPlan,
  };
}

configurarElita({
  obtenerPlan: () => plan,
  actualizarPlan,
  guardarSesion,
  hoyISO,
  mostrarInicioElita,
  mostrarProgreso: mostrarProgresoElita,
  abrirVideo,
  modoPrueba: MODO_PRUEBA,
});

// --- Inicio ---
// Siempre se pide la clave al entrar o recargar la página; el progreso
// guardado (semanas, registro, cronómetros) no se ve afectado por esto.
mostrarPantallaPerfil();

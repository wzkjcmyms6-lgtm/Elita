// videos.js
// Video del ejercicio a pantalla completa. Cada ejercicio trae una lista de videos que se
// prueban en orden: si uno de YouTube no se puede ver (no existe, no se puede insertar,
// sin internet), se pasa al siguiente. Si ninguno anda, queda un botón para abrirlo en
// YouTube y los pasos en texto.

// Errores del reproductor de YouTube: 2 id inválido · 5 error del reproductor · 100 no existe
// o es privado · 101/150/153 el dueño no permite verlo insertado. Con cualquiera se pasa al siguiente.
const ESPERA_YOUTUBE_MS = 10000;
const HOST_YOUTUBE = "https://www.youtube-nocookie.com";

let apiYouTube = null;
let actual = null; // { lista, pasos, alCerrar, reproductor }
let intento = 0; // invalida las respuestas tardías de un video que ya no se está mostrando

const $ = (id) => document.getElementById(id);

function esc(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Acepta un link de YouTube (watch?v=, youtu.be/, shorts/, embed/) o el id solo.
export function idDeYouTube(texto) {
  const t = String(texto || "").trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Lista de videos de un ejercicio; el que eligió Juan (si hay) va primero.
export function videosDelEjercicio(ej, propio) {
  const id = idDeYouTube(propio);
  const elegido = id ? [{ tipo: "youtube", id, fuente: "Video elegido por Juan", idioma: "es" }] : [];
  return [...elegido, ...(ej.videos || [])];
}

function cargarApiYouTube() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiYouTube) return apiYouTube;
  apiYouTube = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof anterior === "function") anterior();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => reject(new Error("No se pudo cargar YouTube"));
    document.head.appendChild(script);
    setTimeout(() => reject(new Error("YouTube no respondió")), ESPERA_YOUTUBE_MS);
  }).catch((e) => {
    apiYouTube = null; // se vuelve a intentar la próxima vez
    throw e;
  });
  return apiYouTube;
}

export function configurarVideos() {
  document.querySelectorAll("#video-overlay .cerrar-video").forEach((btn) => btn.addEventListener("click", cerrarVideos));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && actual) cerrarVideos();
  });
}

export function abrirVideos({ titulo, lista, pasos, alCerrar }) {
  actual = { lista, pasos, alCerrar, reproductor: null };
  $("video-titulo").textContent = titulo;
  $("video-overlay").hidden = false;
  $("video-overlay").scrollTop = 0;
  probar(0);
}

export function cerrarVideos() {
  if (!actual) return;
  const { alCerrar } = actual;
  intento++;
  limpiarReproductor();
  actual = null;
  $("video-overlay").hidden = true;
  if (alCerrar) alCerrar();
}

function limpiarReproductor() {
  if (actual && actual.reproductor) {
    try { actual.reproductor.destroy(); } catch (e) {}
    actual.reproductor = null;
  }
  const video = $("video-marco").querySelector("video");
  if (video) {
    video.pause();
    video.removeAttribute("src");
  }
  $("video-marco").innerHTML = "";
  $("video-fallo").hidden = true;
  $("video-fallo").innerHTML = "";
}

function mostrarDatos(v) {
  const cartel = $("video-cartel");
  cartel.hidden = v.idioma !== "en";
  cartel.textContent = "El video tiene textos en inglés: mirá solo el movimiento";
  $("video-nota").hidden = !v.nota;
  $("video-nota").textContent = v.nota ? `👉 ${v.nota}` : "";
  $("video-fuente").hidden = !v.fuente;
  $("video-fuente").textContent = v.fuente ? `Fuente: ${v.fuente}` : "";
}

function probar(i) {
  limpiarReproductor();
  if (!actual) return;
  const v = actual.lista[i];
  if (!v) {
    mostrarFallo();
    return;
  }
  const token = ++intento;
  const siguiente = () => {
    if (token === intento) probar(i + 1);
  };
  mostrarDatos(v);
  const marco = $("video-marco");

  if (v.tipo === "local") {
    marco.innerHTML = `<video class="video-guia" controls playsinline preload="auto"></video>`;
    const video = marco.querySelector("video");
    video.addEventListener("error", siguiente, { once: true });
    video.src = v.src;
    video.play().catch(() => {});
    return;
  }

  if (v.tipo !== "youtube") {
    siguiente();
    return;
  }

  marco.innerHTML = `<p class="video-cargando">Cargando el video…</p><div class="video-youtube"><div id="yt-reproductor"></div></div>`;
  cargarApiYouTube()
    .then((YT) => {
      if (token !== intento) return;
      let listo = false;
      const espera = setTimeout(() => { if (!listo) siguiente(); }, ESPERA_YOUTUBE_MS);
      actual.reproductor = new YT.Player("yt-reproductor", {
        host: HOST_YOUTUBE,
        videoId: v.id,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, hl: "es" },
        events: {
          onReady: (e) => {
            listo = true;
            clearTimeout(espera);
            marco.querySelector(".video-cargando")?.remove();
            try { e.target.playVideo(); } catch (err) {}
          },
          onError: () => {
            clearTimeout(espera);
            siguiente();
          },
        },
      });
    })
    .catch(siguiente);
}

function mostrarFallo() {
  ["video-cartel", "video-nota", "video-fuente"].forEach((id) => { $(id).hidden = true; });
  const yt = actual.lista.find((v) => v.tipo === "youtube");
  const fallo = $("video-fallo");
  fallo.innerHTML = `
    <p class="video-fallo-titulo">No se pudo cargar el video.</p>
    ${yt ? `<a class="btn-grande btn-blanco" href="https://www.youtube.com/watch?v=${encodeURIComponent(yt.id)}" target="_blank" rel="noopener">▶ Abrir el video en YouTube</a>` : ""}
    <p class="video-fallo-titulo">Así se hace:</p>
    <ol class="video-pasos">${actual.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
  `;
  fallo.hidden = false;
}

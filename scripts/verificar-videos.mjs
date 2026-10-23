// Verifica los videos del plan: consulta YouTube (oEmbed) y revisa los archivos locales.
// Uso: node scripts/verificar-videos.mjs   (Node 18+, sin dependencias)
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const { EJERCICIOS } = await import(pathToFileURL(join(raiz, "plan-retina.js")).href);

const MOTIVOS = { 401: "no se puede insertar", 404: "no existe", 403: "privado o bloqueado" };
let fallas = 0;
let total = 0;

for (const [idEj, ej] of Object.entries(EJERCICIOS)) {
  for (const v of ej.videos || []) {
    total++;
    if (v.tipo === "youtube") {
      const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.id}&format=json`;
      try {
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          console.log(`OK    ${idEj} · youtube ${v.id} · ${j.title}`);
        } else {
          fallas++;
          console.log(`FALLA ${idEj} · youtube ${v.id} · HTTP ${r.status} (${MOTIVOS[r.status] || "error"})`);
        }
      } catch (e) {
        fallas++;
        console.log(`FALLA ${idEj} · youtube ${v.id} · sin respuesta (${e.cause?.code || e.message})`);
      }
    } else if (v.tipo === "local") {
      if (existsSync(join(raiz, v.src))) {
        console.log(`OK    ${idEj} · local ${v.src}`);
      } else {
        fallas++;
        console.log(`FALLA ${idEj} · local ${v.src} · el archivo no existe`);
      }
    } else {
      fallas++;
      console.log(`FALLA ${idEj} · tipo de video desconocido: ${v.tipo}`);
    }
  }
}

console.log(`\n${total - fallas} de ${total} videos OK${fallas ? `, ${fallas} con problemas` : ""}.`);
process.exit(fallas ? 1 : 0);

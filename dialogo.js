// dialogo.js
// Diálogo propio, con letra y botones grandes, en lugar de alert() y confirm() del navegador.
//
//   const respuesta = await mostrarDialogo({
//     titulo: "¿Saltamos este ejercicio?",
//     texto: "Podés hacerlo otro día.",
//     botones: [{ texto: "SÍ, SALTAR", valor: true, clase: "btn-accion" }, { texto: "NO", valor: false }],
//   });

let resolverActual = null;

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

export function mostrarDialogo({ titulo, texto = "", botones = [{ texto: "Entendido", valor: true, clase: "btn-accion" }] }) {
  const fondo = document.getElementById("dialogo");
  if (resolverActual) resolverActual(null);
  fondo.innerHTML = `
    <div class="dialogo-tarjeta" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-titulo">
      <p class="dialogo-titulo" id="dialogo-titulo">${escapar(titulo)}</p>
      ${texto ? `<p class="dialogo-texto">${escapar(texto)}</p>` : ""}
      <div class="dialogo-botones">
        ${botones.map((b, i) => `<button type="button" class="btn-grande ${b.clase || "btn-secundario-grande"}" data-i="${i}">${escapar(b.texto)}</button>`).join("")}
      </div>
    </div>
  `;
  fondo.hidden = false;
  return new Promise((resolve) => {
    resolverActual = (valor) => {
      resolverActual = null;
      fondo.hidden = true;
      fondo.innerHTML = "";
      resolve(valor);
    };
    fondo.querySelectorAll("button[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => resolverActual && resolverActual(botones[Number(btn.dataset.i)].valor));
    });
    fondo.querySelector("button[data-i]")?.focus();
  });
}

export function confirmar(titulo, texto, textoSi = "SÍ", textoNo = "NO") {
  return mostrarDialogo({
    titulo,
    texto,
    botones: [
      { texto: textoSi, valor: true, clase: "btn-accion" },
      { texto: textoNo, valor: false },
    ],
  });
}

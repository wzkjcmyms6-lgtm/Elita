// dibujos.js
// Dibujo de los pies vistos desde arriba para los ejercicios de equilibrio sin video
// ("Un pie adelante" y "Pie delante del otro"). Siempre el derecho adelante, como el
// primer lado del ejercicio.

// Un pie visto desde arriba: planta (ancha adelante, angosta en el talón) + 5 dedos.
// El dedo gordo va del lado de adentro: en el pie derecho, a la izquierda.
function pie(cx, cy, derecho) {
  const l = derecho ? 1 : -1;
  const x = (dx) => cx + dx * l;
  const planta = [
    `M ${x(-20)} ${cy - 44}`,
    `C ${x(-29)} ${cy - 20} ${x(-20)} ${cy + 8} ${x(-15)} ${cy + 30}`,
    `C ${x(-12)} ${cy + 52} ${x(-17)} ${cy + 74} ${x(0)} ${cy + 76}`,
    `C ${x(17)} ${cy + 74} ${x(19)} ${cy + 50} ${x(17)} ${cy + 30}`,
    `C ${x(15)} ${cy + 8} ${x(29)} ${cy - 18} ${x(27)} ${cy - 40}`,
    `C ${x(25)} ${cy - 54} ${x(-18)} ${cy - 58} ${x(-20)} ${cy - 44} Z`,
  ].join(" ");
  const dedos = [
    [-12, -61, 9.5],
    [3, -64, 6],
    [13, -61, 5.5],
    [21, -56, 5],
    [27, -49, 4.5],
  ];
  const estilo = derecho ? 'fill="#165c4f" stroke="#165c4f"' : 'fill="#ffffff" stroke="#3d4a45"';
  return `
    <g ${estilo} stroke-width="3" stroke-linejoin="round">
      <path d="${planta}"/>
      ${dedos.map(([dx, dy, r]) => `<circle cx="${x(dx)}" cy="${cy + dy}" r="${r}"/>`).join("")}
    </g>`;
}

function etiqueta(x, y, texto, ancla) {
  return `<text x="${x}" y="${y}" font-size="20" font-weight="800" fill="#1b1f23" text-anchor="${ancla}">${texto}</text>`;
}

export function diagramaPies(tipo) {
  const tandem = tipo === "tandem";
  // Semitándem: el talón del pie de adelante a la altura del medio del otro pie.
  // Tándem: el talón del pie de adelante toca la punta del otro.
  const der = tandem ? [150, 100] : [178, 135];
  const izq = tandem ? [150, 245] : [118, 210];
  const textoDer = tandem ? etiqueta(196, der[1] + 8, "Derecho", "start") : etiqueta(214, der[1] + 8, "Derecho", "start");
  const textoIzq = tandem ? etiqueta(196, izq[1] + 8, "Izquierdo", "start") : etiqueta(izq[0], 312, "Izquierdo", "middle");
  const explicacion = tandem
    ? "Vista desde arriba: el talón del pie de adelante toca la punta del otro."
    : "Vista desde arriba: el talón del pie de adelante queda a la altura del medio del otro pie.";
  return `
    <figure class="diagrama-pies">
      <svg viewBox="0 0 300 330" role="img" aria-label="${explicacion}">
        ${etiqueta(150, 22, "↑ Adelante", "middle")}
        ${pie(der[0], der[1], true)}
        ${pie(izq[0], izq[1], false)}
        ${textoDer}
        ${textoIzq}
      </svg>
      <figcaption>${explicacion} Después cambiás: el izquierdo adelante.</figcaption>
    </figure>`;
}

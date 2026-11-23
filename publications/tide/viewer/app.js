"use strict";
const $ = id => document.getElementById(id);
const tabs = [...document.querySelectorAll("[data-view]")];
let result = null;
let view = 0;

function showView(index) {
  view = index;
  tabs.forEach((tab, i) => tab.setAttribute("aria-pressed", String(i === view)));
  if (!result) return;
  const r = result;
  const captions = [
    "Negative sizes are deletions. Dark blue is the zero-shift component. Teal marks indels with approximate p < 0.001. Frequencies sum to " + (100 - r.unexplained).toFixed(1) + "% (R² × 100).",
    "Control and edited signal inconsistent with the control call. Shading marks the fit window. The dotted line marks the expected cut.",
    "Measured A, C, G and T dye intensities around the cut, aligned to control base positions.",
    r.composition ? Object.entries(r.composition).map(([b, v]) => b + " " + v.toFixed(1) + "%").join("  ·  ") + " (sequenced strand)." : r.composition_note
  ];
  $("plot").src = "data:image/png;base64," + r.images[index];
  $("plot").alt = tabs[index].textContent + ". " + captions[index];
  $("caption").textContent = captions[index];
}

function display(r) {
  result = r;
  $("efficiency").textContent = r.efficiency.toFixed(2) + "%";
  $("fit").textContent = r.r2.toFixed(3);
  $("cut").textContent = r.cut;
  $("qc-text").textContent = "Mean upstream aberrant signal across bases " + r.alignment.join("–")
    + "  ·  Control " + r.upstream[0].toFixed(1) + "%  ·  Edited " + r.upstream[1].toFixed(1) + "%";
  $("warning").textContent = r.warnings.join(" ");
  $("warning").hidden = !r.warnings.length;
  const rows = r.spectrum.map(entry => {
    const tr = document.createElement("tr");
    [entry.size > 0 ? "+" + entry.size : entry.size, entry.percent.toFixed(2) + "%", entry.p.toPrecision(3)]
      .forEach(value => { const td = tr.insertCell(); td.textContent = value; });
    return tr;
  });
  $("rows").replaceChildren(...rows);
  const pair = "Example pair";
  const location = r.strand === "manual" ? "manual cut" : r.strand + " guide";
  $("status").textContent = pair + "  ·  Fit window " + r.window.join("–") + " bp  ·  " + location + "  ·  offset " + r.offset + " bp";
  $("export").hidden = $("results").hidden = false;
  showView(view);
}

async function loadExample() {
  try {
    const response = await fetch("example.json");
    if (!response.ok) throw new Error("Could not load the example results.");
    display(await response.json());
  } catch (error) {
    $("status").textContent = error.message;
  }
}
tabs.forEach((tab, i) => tab.addEventListener("click", () => showView(i)));
$("export").addEventListener("click", () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([result.csv], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tide-spectrum.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadExample();

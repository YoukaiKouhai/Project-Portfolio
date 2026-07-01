export function setupExports() {
  document.querySelector('#export-scatter-svg').addEventListener('click', () => exportSvg('#scatter-chart', 'grocery-fpro-price.svg'));
  document.querySelector('#export-scatter-png').addEventListener('click', () => exportPng('#scatter-chart', 'grocery-fpro-price.png'));
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function serializedSvg(selector) {
  const svg = document.querySelector(selector).cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const style = document.createElement('style');
  style.textContent = `
    text { font-family: system-ui, sans-serif; }
    .chart-label { fill: #4f5b62; font-size: 12px; }
    .axis path, .axis line, .grid line { stroke: #b8c3c8; }
  `;
  svg.prepend(style);
  return new XMLSerializer().serializeToString(svg);
}

function exportSvg(selector, filename) {
  downloadBlob(new Blob([serializedSvg(selector)], { type: 'image/svg+xml' }), filename);
}

function exportPng(selector, filename) {
  const source = serializedSvg(selector);
  const svg = document.querySelector(selector);
  const box = svg.viewBox.baseVal;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = box.width * 2;
    canvas.height = box.height * 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => downloadBlob(blob, filename), 'image/png');
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}

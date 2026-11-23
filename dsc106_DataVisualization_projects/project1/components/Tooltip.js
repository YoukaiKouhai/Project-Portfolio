import { formatMoney, formatNumber } from './utils.js';

export class Tooltip {
  constructor(selector) {
    this.element = document.querySelector(selector);
  }

  show(event, product) {
    if (!this.element || !product) return;
    this.element.hidden = false;
    this.element.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.store} | ${product.brand} | ${product.category}</p>
      <p><strong>${formatMoney(product.price)}</strong> listed price | ${formatMoney(product.pricePer100Cal)} per 100 calories</p>
      <p>FPro ${formatNumber(product.fpro, 2)} | ${product.novaLabel} | Health Index ${formatNumber(product.health, 0)}</p>
      <p class="tooltip-percentiles">Health percentile ${formatNumber(product.healthPercentile, 0)} | Price percentile ${formatNumber(product.pricePercentile, 0)}</p>
      ${this.radar(product)}
      <div class="tooltip-bars">
        ${this.bar('Sugar', product.sugar, 60, 'g')}
        ${this.bar('Sodium', product.sodiumMg, 1600, 'mg')}
        ${this.bar('Fiber', product.fiber, 15, 'g')}
        ${this.bar('Protein', product.protein, 35, 'g')}
      </div>
    `;
    this.move(event);
  }

  radar(product) {
    const metrics = [
      { label: 'Health', value: product.health / 100 },
      { label: 'Protein', value: product.protein / 35 },
      { label: 'Fiber', value: product.fiber / 15 },
      { label: 'Sugar-', value: 1 - product.sugar / 60 },
      { label: 'Sodium-', value: 1 - product.sodiumMg / 1600 },
      { label: 'FPro-', value: 1 - product.fpro }
    ].map((metric) => ({ ...metric, value: Math.max(0, Math.min(1, Number.isFinite(metric.value) ? metric.value : 0)) }));
    const center = 42;
    const radius = 30;
    const points = metrics.map((metric, index) => {
      const angle = -Math.PI / 2 + (index / metrics.length) * Math.PI * 2;
      return `${center + Math.cos(angle) * radius * metric.value},${center + Math.sin(angle) * radius * metric.value}`;
    }).join(' ');
    const axes = metrics.map((metric, index) => {
      const angle = -Math.PI / 2 + (index / metrics.length) * Math.PI * 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const labelX = center + Math.cos(angle) * (radius + 12);
      const labelY = center + Math.sin(angle) * (radius + 12);
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}"></line><text x="${labelX}" y="${labelY}">${metric.label}</text>`;
    }).join('');
    return `
      <svg class="tooltip-radar" viewBox="0 0 84 84" aria-label="Mini nutrition radar">
        <polygon class="radar-grid" points="42,12 68,27 68,57 42,72 16,57 16,27"></polygon>
        ${axes}
        <polygon class="radar-shape" points="${points}"></polygon>
      </svg>
    `;
  }

  bar(label, value, max, unit) {
    const width = Math.max(3, Math.min(100, (value / max) * 100));
    return `
      <div>
        <span>${label}</span>
        <span style="width: ${width}%"></span>
        <span>${formatNumber(value, value > 20 ? 0 : 1)}${unit}</span>
      </div>
    `;
  }

  move(event) {
    if (!this.element || this.element.hidden) return;
    const pad = 18;
    const rect = this.element.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - pad, event.clientX + pad);
    const top = Math.min(window.innerHeight - rect.height - pad, event.clientY + pad);
    this.element.style.left = `${Math.max(pad, left)}px`;
    this.element.style.top = `${Math.max(pad, top)}px`;
  }

  hide() {
    if (this.element) this.element.hidden = true;
  }
}

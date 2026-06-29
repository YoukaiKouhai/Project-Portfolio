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
      <div class="tooltip-bars">
        ${this.bar('Sugar', product.sugar, 60, 'g')}
        ${this.bar('Sodium', product.sodiumMg, 1600, 'mg')}
        ${this.bar('Fiber', product.fiber, 15, 'g')}
        ${this.bar('Protein', product.protein, 35, 'g')}
      </div>
    `;
    this.move(event);
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

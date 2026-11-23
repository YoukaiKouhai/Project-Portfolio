import { formatMetric, formatNumber, metricValue } from './utils.js';

export class Tooltip {
  constructor(selector) {
    this.element = document.querySelector(selector);
  }

  show(event, datum, options) {
    if (!this.element || !datum) return;
    const metric = options.metric;
    const value = metricValue(datum, metric);
    const delta = Number.isFinite(value) && Number.isFinite(options.average) ? value - options.average : null;
    this.element.hidden = false;
    this.element.innerHTML = `
      <h3>${datum.region}</h3>
      <p>${datum.year ? `${datum.year} observation` : '2020 regional summary'}</p>
      <p><strong>${formatMetric(value, metric)}</strong> ${options.metricLabel}</p>
      <p>${Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${formatMetric(delta, metric)} vs visible average` : 'Comparison unavailable for this metric'}</p>
      <div class="tooltip-mini" aria-hidden="true">
        <span style="width:${Math.max(4, Math.min(100, (datum.age65Share || datum.endShare || 0) * 4))}%"></span>
      </div>
      <p>2020 age 65+: ${formatNumber(datum.endShare ?? datum.age65Share, 1)}%</p>
      ${Number.isFinite(datum.change) ? `<p>2000-2020 change: ${formatNumber(datum.change, 1)} pts</p>` : ''}
    `;
    this.move(event);
  }

  move(event) {
    if (!this.element || this.element.hidden) return;
    const pad = 16;
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

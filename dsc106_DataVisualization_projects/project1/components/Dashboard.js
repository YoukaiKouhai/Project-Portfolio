import { DEFAULT_FILTERS } from '../constants/config.js';
import { filterProducts, formatMoney, formatNumber, groupSummary, summarize, writeFiltersToUrl } from './utils.js';
import { renderBoxplot, renderHistogram, renderScatter, renderStacked } from './charts.js';

export class Dashboard {
  constructor(products, tooltip, initialFilters) {
    this.products = products;
    this.tooltip = tooltip;
    this.filters = initialFilters;
    this.brushedIds = null;
    this.listeners = new Set();
  }

  init() {
    this.setupControls();
    this.render();
    window.addEventListener('resize', () => this.render());
  }

  onChange(callback) {
    this.listeners.add(callback);
  }

  emit(filtered) {
    this.listeners.forEach((callback) => callback(filtered));
  }

  setupControls() {
    const stores = [...new Set(this.products.map((d) => d.store))].sort();
    const storeFilter = document.querySelector('#store-filter');
    storeFilter.innerHTML = stores.map((store) => `<button type="button" class="segment" data-store="${store}" aria-pressed="${this.filters.stores.includes(store)}">${store}</button>`).join('');
    storeFilter.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const store = button.dataset.store;
      const next = new Set(this.filters.stores);
      next.has(store) ? next.delete(store) : next.add(store);
      this.filters.stores = next.size ? [...next] : [store];
      this.brushedIds = null;
      this.syncControls();
      this.render();
    });

    const categoryCounts = groupSummary(this.products, 'category').sort((a, b) => b.count - a.count);
    const categoryFilter = document.querySelector('#category-filter');
    categoryFilter.innerHTML = [
      `<option>${DEFAULT_FILTERS.category}</option>`,
      ...categoryCounts.slice(0, 28).map((d) => `<option value="${d.name}">${d.name} (${formatNumber(d.count)})</option>`)
    ].join('');
    categoryFilter.value = this.filters.category;
    categoryFilter.addEventListener('change', () => {
      this.filters.category = categoryFilter.value;
      this.brushedIds = null;
      this.render();
    });

    for (const [id, key] of [
      ['sugar-filter', 'sugarMax'],
      ['sodium-filter', 'sodiumMax'],
      ['fiber-filter', 'fiberMin'],
      ['protein-filter', 'proteinMin'],
      ['fpro-filter', 'fproMax']
    ]) {
      const input = document.querySelector(`#${id}`);
      input.value = this.filters[key];
      input.addEventListener('input', () => {
        this.filters[key] = Number(input.value);
        this.brushedIds = null;
        this.render();
      });
    }

    document.querySelector('#reset-filters').addEventListener('click', () => {
      this.filters = structuredClone(DEFAULT_FILTERS);
      this.brushedIds = null;
      this.syncControls();
      this.render();
    });

    document.querySelector('#copy-link').addEventListener('click', async (event) => {
      writeFiltersToUrl(this.filters);
      await navigator.clipboard?.writeText(location.href);
      event.currentTarget.textContent = 'Copied';
      setTimeout(() => { event.currentTarget.textContent = 'Copy view link'; }, 1200);
    });

    this.syncControls();
  }

  syncControls() {
    document.querySelectorAll('#store-filter .segment').forEach((button) => {
      button.setAttribute('aria-pressed', this.filters.stores.includes(button.dataset.store));
    });
    document.querySelector('#category-filter').value = this.filters.category;
    document.querySelector('#sugar-filter').value = this.filters.sugarMax;
    document.querySelector('#sodium-filter').value = this.filters.sodiumMax;
    document.querySelector('#fiber-filter').value = this.filters.fiberMin;
    document.querySelector('#protein-filter').value = this.filters.proteinMin;
    document.querySelector('#fpro-filter').value = this.filters.fproMax;
    document.querySelector('#sugar-label').textContent = `${formatNumber(this.filters.sugarMax, 0)}g`;
    document.querySelector('#sodium-label').textContent = `${formatNumber(this.filters.sodiumMax, 0)}mg`;
    document.querySelector('#fiber-label').textContent = `${formatNumber(this.filters.fiberMin, 1)}g`;
    document.querySelector('#protein-label').textContent = `${formatNumber(this.filters.proteinMin, 1)}g`;
    document.querySelector('#fpro-label').textContent = formatNumber(this.filters.fproMax, 2);
  }

  filtered() {
    return filterProducts(this.products, this.filters, this.brushedIds);
  }

  render() {
    this.syncControls();
    writeFiltersToUrl(this.filters);
    const filteredWithoutBrush = filterProducts(this.products, this.filters);
    const filtered = this.filtered();
    this.renderKpis(filtered);
    renderScatter('#scatter-chart', filteredWithoutBrush, this.tooltip, (ids) => {
      this.brushedIds = ids;
      this.renderSecondary();
    });
    this.renderSecondary();
    this.emit(filtered);
  }

  renderSecondary() {
    const filtered = this.filtered();
    this.renderKpis(filtered);
    renderHistogram('#histogram-chart', filtered);
    renderStacked('#stacked-chart', filtered);
    renderBoxplot('#boxplot-chart', filtered);
    this.emit(filtered);
  }

  renderKpis(products) {
    const summary = summarize(products);
    document.querySelector('#kpi-grid').innerHTML = `
      <div><dt>Filtered products</dt><dd>${formatNumber(summary.count)}</dd></div>
      <div><dt>Median price / 100 cal</dt><dd>${formatMoney(summary.medianPrice)}</dd></div>
      <div><dt>Ultra-processed share</dt><dd>${formatNumber(summary.ultraShare * 100, 0)}%</dd></div>
      <div><dt>Median Health Index</dt><dd>${formatNumber(summary.medianHealth, 0)}</dd></div>
      <div><dt>Median sugar</dt><dd>${formatNumber(summary.medianSugar, 1)}g</dd></div>
      <div><dt>Median sodium</dt><dd>${formatNumber(summary.medianSodium, 0)}mg</dd></div>
    `;
  }
}

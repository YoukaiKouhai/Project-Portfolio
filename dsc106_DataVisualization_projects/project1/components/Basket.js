import { formatMoney, formatNumber, mean } from './utils.js';

export class Basket {
  constructor(products) {
    this.products = products;
    this.filtered = products;
    this.items = [];
  }

  init() {
    this.search = document.querySelector('#product-search');
    this.picker = document.querySelector('#product-picker');
    this.search.addEventListener('input', () => this.renderOptions());
    document.querySelector('#add-product').addEventListener('click', () => this.addSelected());
    document.querySelector('#basket-list').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-index]');
      if (!button) return;
      this.items.splice(Number(button.dataset.index), 1);
      this.renderBasket();
    });
    this.renderOptions();
    this.renderBasket();
  }

  updateProducts(products) {
    this.filtered = products.length ? products : this.products;
    this.renderOptions();
  }

  renderOptions() {
    const query = this.search.value.trim().toLowerCase();
    const options = this.filtered
      .filter((product) => !query || `${product.name} ${product.brand} ${product.category} ${product.store}`.toLowerCase().includes(query))
      .slice(0, 80);
    this.picker.innerHTML = options.map((product) => `<option value="${product.id}">${product.store} | ${product.brand} | ${product.name}</option>`).join('');
  }

  addSelected() {
    const id = Number(this.picker.value);
    const product = this.products.find((item) => item.id === id);
    if (!product) return;
    this.items.push(product);
    this.renderBasket();
  }

  renderBasket() {
    const total = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
    const stores = new Set(this.items.map((item) => item.store));
    document.querySelector('#basket-summary').innerHTML = `
      <div><dt>Items</dt><dd>${formatNumber(this.items.length)}</dd></div>
      <div><dt>Total cost</dt><dd>${formatMoney(total)}</dd></div>
      <div><dt>Stores represented</dt><dd>${formatNumber(stores.size)}</dd></div>
      <div><dt>Avg Health Index</dt><dd>${formatNumber(mean(this.items.map((d) => d.health)), 0)}</dd></div>
      <div><dt>Avg FPro</dt><dd>${formatNumber(mean(this.items.map((d) => d.fpro)), 2)}</dd></div>
      <div><dt>Total sugar</dt><dd>${formatNumber(this.items.reduce((sum, d) => sum + (d.sugar || 0), 0), 1)}g</dd></div>
    `;
    document.querySelector('#basket-list').innerHTML = this.items.map((item, index) => `
      <li>
        <div>
          <p><strong>${item.name}</strong></p>
          <small>${item.store} | ${item.brand} | ${formatMoney(item.price)} | Health ${formatNumber(item.health, 0)}</small>
        </div>
        <button type="button" class="remove-product" data-index="${index}" aria-label="Remove ${item.name}">x</button>
      </li>
    `).join('');
  }
}

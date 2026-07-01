import { DEFAULT_FILTERS } from './constants/config.js';
import { Dashboard } from './components/Dashboard.js';
import { Basket } from './components/Basket.js';
import { Tooltip } from './components/Tooltip.js';
import { setupExports } from './components/exporters.js';
import { setupNarrative, setupProgress } from './components/Narrative.js';
import { filtersFromUrl, formatMoney, formatNumber, markPriceOutliers, preprocessRow, summarize } from './components/utils.js';

const d3 = window.d3;

async function init() {
  setupProgress();
  const rows = await d3.csv('data/grocerydb.csv');
  const products = rows.map(preprocessRow);
  const outlierStats = markPriceOutliers(products);

  renderHero(products);
  renderTrust(products, outlierStats);
  setupNarrative(products);

  const tooltip = new Tooltip('#viz-tooltip');
  const dashboard = new Dashboard(products, tooltip, sanitizeFilters(filtersFromUrl(), products));
  const basket = new Basket(products);
  basket.init();
  dashboard.onChange((filtered) => basket.updateProducts(filtered));
  dashboard.init();
  setupExports();
}

function sanitizeFilters(filters, products) {
  const stores = new Set(products.map((d) => d.store));
  const categories = new Set(products.map((d) => d.category));
  const safe = { ...structuredClone(DEFAULT_FILTERS), ...filters };
  safe.stores = safe.stores.filter((store) => stores.has(store));
  if (!safe.stores.length) safe.stores = [...DEFAULT_FILTERS.stores];
  if (!categories.has(safe.category)) safe.category = DEFAULT_FILTERS.category;
  return safe;
}

function renderHero(products) {
  const summary = summarize(products);
  const stores = new Set(products.map((d) => d.store)).size;
  document.querySelector('#hero-stats').innerHTML = `
    <div><dt>Products</dt><dd>${formatNumber(summary.count)}</dd></div>
    <div><dt>Stores</dt><dd>${formatNumber(stores)}</dd></div>
    <div><dt>Median price / 100 cal</dt><dd>${formatMoney(summary.medianPrice)}</dd></div>
    <div><dt>Ultra-processed</dt><dd>${formatNumber(summary.ultraShare * 100, 0)}%</dd></div>
  `;
}

function renderTrust(products, outlierStats) {
  const validPrice = products.filter((d) => d.validPrice).length;
  const cleanPrice = products.filter((d) => d.validPrice && !d.priceOutlier).length;
  const validNutrition = products.filter((d) => d.validNutrition).length;
  const cards = [
    {
      title: 'Missing and invalid price',
      value: `${formatNumber(validPrice)} usable`,
      detail: `${formatNumber(products.length - validPrice)} rows have missing, zero, or non-finite price-per-calorie values.`,
      confidence: validPrice / products.length
    },
    {
      title: 'Outlier handling',
      value: `${formatNumber(validPrice - cleanPrice)} flagged`,
      detail: `Price outliers are values above ${formatMoney(outlierStats.upper)} per 100 calories using the 1.5 x IQR rule.`,
      confidence: cleanPrice / Math.max(1, validPrice)
    },
    {
      title: 'Nutrition coverage',
      value: `${formatNumber(validNutrition)} complete`,
      detail: 'Health Index requires FPro, sugar, sodium, fiber, protein, and estimated calories per 100g.',
      confidence: validNutrition / products.length
    },
    {
      title: 'Normalization',
      value: 'Per 100g / 100 cal',
      detail: 'Nutrition fields are interpreted per 100g. Price is converted to listed dollars per 100 calories.',
      confidence: 0.84
    }
  ];
  document.querySelector('#trust-grid').innerHTML = cards.map((card) => `
    <article class="trust-card">
      <p class="section-kicker">${card.title}</p>
      <h3>${card.value}</h3>
      <p>${card.detail}</p>
      <div class="trust-meter" aria-label="Relative confidence ${formatNumber(card.confidence * 100, 0)} percent">
        <span style="width: ${Math.round(card.confidence * 100)}%"></span>
      </div>
    </article>
  `).join('');
}

init().catch((error) => {
  console.error(error);
  document.querySelector('.grocery-story').insertAdjacentHTML('afterbegin', `
    <p class="error-message">Project 1 could not load the grocery CSV. Try refreshing the page or running it through a local server.</p>
  `);
});

import { DEFAULT_FILTERS, NOVA_CLASSES } from '../constants/config.js';

const parser = document.createElement('textarea');

export function decodeHtml(value) {
  parser.innerHTML = value || '';
  return parser.value;
}

export function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStore(value) {
  return value === 'WholeFoods' ? 'Whole Foods' : value;
}

export function formatMoney(value) {
  return value == null || !Number.isFinite(value) ? 'NA' : `$${value.toFixed(2)}`;
}

export function formatNumber(value, digits = 0) {
  return value == null || !Number.isFinite(value) ? 'NA' : value.toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

export function quantile(values, q) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const pos = (clean.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return clean[base + 1] == null ? clean[base] : clean[base] + rest * (clean[base + 1] - clean[base]);
}

export function median(values) {
  return quantile(values, 0.5);
}

export function mean(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeCalories(product) {
  const protein = product.protein ?? 0;
  const carbs = product.carbs ?? 0;
  const fat = product.fat ?? 0;
  return protein * 4 + carbs * 4 + fat * 9;
}

export function computeHealthIndex(product) {
  const novaPenalty = ((product.nova ?? 0) / 3) * 8;
  const sugarPenalty = clamp((product.sugar ?? 0) / 60, 0, 1) * 14;
  const sodiumPenalty = clamp((product.sodiumMg ?? 0) / 1600, 0, 1) * 12;
  const caloriePenalty = clamp(((product.calories ?? 0) - 120) / 380, 0, 1) * 9;
  const fiberBonus = clamp((product.fiber ?? 0) / 12, 0, 1) * 9;
  const proteinBonus = clamp((product.protein ?? 0) / 25, 0, 1) * 8;
  return clamp(100 - (product.fpro ?? 0) * 26 - novaPenalty - sugarPenalty - sodiumPenalty - caloriePenalty + fiberBonus + proteinBonus, 0, 100);
}

export function preprocessRow(row, index) {
  const price = number(row.price);
  const pricePerCal = number(row['price percal']);
  const sodiumRaw = number(row.Sodium);
  const product = {
    id: index,
    name: decodeHtml(row.name),
    store: normalizeStore(row.store),
    category: row.category || 'uncategorized',
    brand: decodeHtml(row.brand || 'Unknown brand'),
    fpro: number(row.FPro),
    nova: number(row.FPro_class),
    price,
    pricePerCal,
    pricePer100Cal: pricePerCal != null ? pricePerCal * 100 : null,
    weight: number(row.package_weight),
    protein: number(row.Protein),
    fat: number(row['Total Fat']),
    carbs: number(row.Carbohydrate),
    sugar: number(row['Sugars, total']),
    fiber: number(row['Fiber, total dietary']),
    sodium: sodiumRaw,
    sodiumMg: sodiumRaw == null ? null : sodiumRaw * 1000,
    cholesterol: number(row.Cholesterol)
  };
  product.calories = computeCalories(product);
  product.health = computeHealthIndex(product);
  product.novaLabel = NOVA_CLASSES.find((item) => item.id === Math.round(product.nova))?.label || 'Unknown';
  product.validPrice = Number.isFinite(product.pricePer100Cal) && product.pricePer100Cal > 0;
  product.validNutrition = ['fpro', 'sugar', 'fiber', 'protein', 'sodiumMg', 'calories'].every((key) => Number.isFinite(product[key]));
  return product;
}

export function markPriceOutliers(products) {
  const valid = products.filter((d) => d.validPrice).map((d) => d.pricePer100Cal);
  const q1 = quantile(valid, 0.25);
  const q3 = quantile(valid, 0.75);
  const iqr = q3 - q1;
  const upper = q3 + 1.5 * iqr;
  products.forEach((product) => {
    product.priceOutlier = product.validPrice && product.pricePer100Cal > upper;
  });
  return { q1, q3, iqr, upper };
}

export function summarize(products) {
  const validPrice = products.filter((d) => d.validPrice && !d.priceOutlier);
  const ultra = products.filter((d) => Math.round(d.nova) === 3).length;
  return {
    count: products.length,
    validPriceCount: validPrice.length,
    medianPrice: median(validPrice.map((d) => d.pricePer100Cal)),
    medianHealth: median(products.map((d) => d.health)),
    medianFpro: median(products.map((d) => d.fpro)),
    ultraShare: products.length ? ultra / products.length : 0,
    medianSugar: median(products.map((d) => d.sugar)),
    medianSodium: median(products.map((d) => d.sodiumMg))
  };
}

export function groupSummary(products, key) {
  return Array.from(Map.groupBy(products, (d) => d[key]), ([name, values]) => ({
    name,
    values,
    ...summarize(values)
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterProducts(products, filters, brushedIds = null) {
  return products.filter((product) => {
    if (!filters.stores.includes(product.store)) return false;
    if (filters.category !== DEFAULT_FILTERS.category && product.category !== filters.category) return false;
    if (filters.sugarMax < DEFAULT_FILTERS.sugarMax && Number.isFinite(product.sugar) && product.sugar > filters.sugarMax) return false;
    if (filters.sodiumMax < DEFAULT_FILTERS.sodiumMax && Number.isFinite(product.sodiumMg) && product.sodiumMg > filters.sodiumMax) return false;
    if (filters.fiberMin > DEFAULT_FILTERS.fiberMin && Number.isFinite(product.fiber) && product.fiber < filters.fiberMin) return false;
    if (filters.proteinMin > DEFAULT_FILTERS.proteinMin && Number.isFinite(product.protein) && product.protein < filters.proteinMin) return false;
    if (filters.fproMax < DEFAULT_FILTERS.fproMax && Number.isFinite(product.fpro) && product.fpro > filters.fproMax) return false;
    if (brushedIds && !brushedIds.has(product.id)) return false;
    return true;
  });
}

export function filtersFromUrl() {
  const params = new URLSearchParams(location.search);
  const filters = structuredClone(DEFAULT_FILTERS);
  if (params.has('stores')) filters.stores = params.get('stores').split(',').filter(Boolean);
  if (params.has('category')) filters.category = params.get('category');
  for (const [param, key] of [
    ['sugar', 'sugarMax'],
    ['sodium', 'sodiumMax'],
    ['fiber', 'fiberMin'],
    ['protein', 'proteinMin'],
    ['fpro', 'fproMax']
  ]) {
    if (params.has(param)) filters[key] = Number(params.get(param));
  }
  return filters;
}

export function writeFiltersToUrl(filters) {
  const params = new URLSearchParams();
  params.set('stores', filters.stores.join(','));
  if (filters.category !== DEFAULT_FILTERS.category) params.set('category', filters.category);
  params.set('sugar', filters.sugarMax);
  params.set('sodium', filters.sodiumMax);
  params.set('fiber', filters.fiberMin);
  params.set('protein', filters.proteinMin);
  params.set('fpro', filters.fproMax);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}${location.hash}`);
}

export const STORE_COLORS = new Map([
  ['Whole Foods', '#1f8a66'],
  ['Walmart', '#316c9f'],
  ['Target', '#c8504a']
]);

export const NOVA_CLASSES = [
  { id: 0, label: 'Minimally processed', color: '#1f8a66' },
  { id: 1, label: 'Culinary ingredients', color: '#8cc8a6' },
  { id: 2, label: 'Processed', color: '#d8a13f' },
  { id: 3, label: 'Ultra-processed', color: '#c8504a' }
];

export const DEFAULT_FILTERS = {
  stores: ['Whole Foods', 'Walmart', 'Target'],
  category: 'All categories',
  sugarMax: 100,
  sodiumMax: 20000,
  fiberMin: 0,
  proteinMin: 0,
  fproMax: 1
};

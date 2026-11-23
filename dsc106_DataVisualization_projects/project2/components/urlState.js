export function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const patch = {};
  if (params.has('regions')) patch.selectedRegions = params.get('regions').split(',').filter(Boolean);
  if (params.has('metric')) patch.activeMetric = params.get('metric');
  if (params.has('sort')) patch.sortOrder = params.get('sort');
  if (params.has('insight')) patch.selectedInsight = params.get('insight');
  if (params.has('years')) {
    const years = params.get('years').split('-').map(Number);
    if (years.length === 2 && years.every(Number.isFinite)) patch.yearRange = years;
  }
  return patch;
}

export function writeStateToUrl(state, defaults) {
  const params = new URLSearchParams();
  if (state.selectedRegions.join(',') !== defaults.selectedRegions.join(',')) {
    params.set('regions', state.selectedRegions.join(','));
  }
  if (state.activeMetric !== defaults.activeMetric) params.set('metric', state.activeMetric);
  if (state.sortOrder !== defaults.sortOrder) params.set('sort', state.sortOrder);
  if (state.yearRange.join('-') !== defaults.yearRange.join('-')) params.set('years', state.yearRange.join('-'));
  if (state.selectedInsight && state.selectedInsight !== 'overview') params.set('insight', state.selectedInsight);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

export async function copyCurrentUrl(button) {
  try {
    await navigator.clipboard?.writeText(location.href);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy failed';
  }
  setTimeout(() => {
    button.textContent = 'Copy view link';
  }, 1200);
}

export const METRICS = new Map([
  ['share', { label: 'Age 65+ share', shortLabel: 'Share 65+', unit: '%', description: 'Percent of the total population age 65 or older.' }],
  ['change', { label: 'Change since 2000', shortLabel: 'Change', unit: ' pts', description: 'Percentage-point change in age 65+ share since 2000.' }],
  ['index', { label: 'Indexed growth', shortLabel: 'Index', unit: '', description: 'Age 65+ share indexed to 2000 = 100.' }]
]);

export const SORT_OPTIONS = new Map([
  ['changeDesc', 'Largest increase'],
  ['shareDesc', 'Highest 2020 share'],
  ['nameAsc', 'Region A-Z']
]);

export const DEFAULT_STATE = {
  selectedRegions: [],
  activeMetric: 'share',
  yearRange: [2000, 2020],
  sortOrder: 'changeDesc',
  highlightedRegion: null,
  selectedDataPoints: [],
  selectedInsight: 'overview',
  zoomLevel: 'full',
  brushSelection: null
};

export function createStore(initialState, options) {
  const listeners = new Set();
  const defaults = { ...DEFAULT_STATE, ...initialState };
  let state = sanitizeState(defaults, options);

  function setState(patch) {
    const next = sanitizeState({ ...state, ...patch }, options);
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState: () => state,
    setState,
    reset: () => setState({ ...defaults, highlightedRegion: null, selectedInsight: 'reset', brushSelection: null }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export function sanitizeState(candidate, options) {
  const regionSet = new Set(options.regions);
  const selectedRegions = (candidate.selectedRegions || []).filter((region) => regionSet.has(region));
  const metric = METRICS.has(candidate.activeMetric) ? candidate.activeMetric : DEFAULT_STATE.activeMetric;
  const sortOrder = SORT_OPTIONS.has(candidate.sortOrder) ? candidate.sortOrder : DEFAULT_STATE.sortOrder;
  const minYear = options.yearExtent[0];
  const maxYear = options.yearExtent[1];
  const rawRange = Array.isArray(candidate.yearRange) ? candidate.yearRange : DEFAULT_STATE.yearRange;
  const low = Math.max(minYear, Math.min(maxYear, Number(rawRange[0]) || minYear));
  const high = Math.max(minYear, Math.min(maxYear, Number(rawRange[1]) || maxYear));
  const yearRange = low <= high ? [low, high] : [high, low];
  const highlightedRegion = regionSet.has(candidate.highlightedRegion) ? candidate.highlightedRegion : null;

  return {
    selectedRegions: selectedRegions.length ? selectedRegions : [...options.defaultRegions],
    activeMetric: metric,
    yearRange,
    sortOrder,
    highlightedRegion,
    selectedDataPoints: Array.isArray(candidate.selectedDataPoints) ? candidate.selectedDataPoints : [],
    selectedInsight: candidate.selectedInsight || null,
    zoomLevel: yearRange[0] === minYear && yearRange[1] === maxYear ? 'full' : 'brushed',
    brushSelection: candidate.brushSelection || null
  };
}

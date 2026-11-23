import { renderComposition, renderLineChart, renderRanking, renderScatter } from './components/charts.js';
import { DEFAULT_STATE, METRICS, SORT_OPTIONS, createStore } from './components/state.js';
import { Tooltip } from './components/tooltips.js';
import { copyCurrentUrl, readStateFromUrl, writeStateToUrl } from './components/urlState.js';
import { formatMetric, formatNumber, loadAgingData, metricValue, REGION_COLORS, selectedSummaries, visibleStats } from './components/utils.js';

const INSIGHTS = {
  urgent: {
    selectedRegions: ['European Union', 'High income', 'North America', 'East Asia & Pacific', 'World'],
    activeMetric: 'share',
    yearRange: [2000, 2020],
    sortOrder: 'shareDesc',
    selectedInsight: 'urgent'
  },
  uneven: {
    selectedRegions: ['European Union', 'High income', 'Low income', 'Sub-Saharan Africa', 'World'],
    activeMetric: 'share',
    yearRange: [2000, 2020],
    sortOrder: 'shareDesc',
    selectedInsight: 'uneven'
  },
  outliers: {
    selectedRegions: ['European Union', 'High income', 'North America', 'East Asia & Pacific', 'World'],
    activeMetric: 'change',
    yearRange: [2000, 2020],
    sortOrder: 'changeDesc',
    selectedInsight: 'outliers'
  }
};

const insightCopy = new Map([
  ['overview', 'Start with all regions selected. Brush the timeline or scatterplot to narrow the story.'],
  ['urgent', 'This preset foregrounds high-income and major regional aggregates where aging is already visually steep.'],
  ['uneven', 'This preset adds low-income and Sub-Saharan Africa context, showing that global aging is highly uneven.'],
  ['outliers', 'This preset switches to percentage-point change and highlights the fastest-aging series.'],
  ['custom', 'Custom view. The charts are now linked to your filters, brush, and metric choices.'],
  ['reset', 'Default view restored.']
]);

let data;
let store;
let tooltip;
let defaults;
let renderQueued = false;

async function init() {
  data = await loadAgingData();
  tooltip = new Tooltip('#project2-tooltip');
  defaults = {
    ...DEFAULT_STATE,
    selectedRegions: [...data.regions],
    yearRange: data.yearExtent
  };
  store = createStore({ ...defaults, ...readStateFromUrl() }, {
    regions: data.regions,
    defaultRegions: defaults.selectedRegions,
    yearExtent: data.yearExtent
  });

  setupControls();
  store.subscribe((state) => {
    writeStateToUrl(state, defaults);
    scheduleRender();
  });
  render();
  window.addEventListener('resize', scheduleRender);
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function setupControls() {
  const regionControls = document.querySelector('#region-controls');
  regionControls.innerHTML = data.regions.map((region) => `
    <button type="button" class="region-chip" data-region="${region}">
      <span style="background:${REGION_COLORS.get(region) || '#777'}"></span>${region}
    </button>
  `).join('');
  regionControls.addEventListener('click', (event) => {
    const button = event.target.closest('[data-region]');
    if (!button) return;
    const next = new Set(store.getState().selectedRegions);
    next.has(button.dataset.region) ? next.delete(button.dataset.region) : next.add(button.dataset.region);
    store.setState({ selectedRegions: [...next], selectedInsight: 'custom' });
  });

  const metricSelect = document.querySelector('#metric-select');
  metricSelect.innerHTML = [...METRICS].map(([value, metric]) => `<option value="${value}">${metric.label}</option>`).join('');
  metricSelect.addEventListener('change', () => store.setState({ activeMetric: metricSelect.value, selectedInsight: 'custom' }));

  const sortSelect = document.querySelector('#sort-select');
  sortSelect.innerHTML = [...SORT_OPTIONS].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  sortSelect.addEventListener('change', () => store.setState({ sortOrder: sortSelect.value, selectedInsight: 'custom' }));

  document.querySelector('#reset-dashboard').addEventListener('click', () => store.reset());
  document.querySelector('#copy-dashboard-link').addEventListener('click', (event) => copyCurrentUrl(event.currentTarget));
  document.querySelectorAll('[data-insight]').forEach((button) => {
    button.addEventListener('click', () => store.setState(INSIGHTS[button.dataset.insight]));
  });
}

function render() {
  const state = store.getState();
  const metric = METRICS.get(state.activeMetric);
  const stats = visibleStats(data, state);

  document.querySelector('#metric-select').value = state.activeMetric;
  document.querySelector('#sort-select').value = state.sortOrder;
  document.querySelector('#dashboard-subtitle').textContent = `${metric.description} Showing ${formatNumber(stats.visiblePoints, 0)} time-series points across ${formatNumber(stats.summaries.length, 0)} selected regions.`;
  document.querySelector('#insight-note').textContent = insightCopy.get(state.selectedInsight) || insightCopy.get('custom');

  document.querySelectorAll('.region-chip').forEach((button) => {
    const active = state.selectedRegions.includes(button.dataset.region);
    const highlighted = state.highlightedRegion === button.dataset.region;
    button.setAttribute('aria-pressed', active);
    button.classList.toggle('is-highlighted', highlighted);
  });

  renderKpis(stats, state);
  renderBadges(state, metric);
  renderInsightButtons(state);
  renderLinkedTable(state, stats);
  renderLineChart('#timeline-chart', data, state, store, tooltip);
  renderScatter('#change-scatter', data, state, store, tooltip);
  renderComposition('#composition-chart', data, state, store);
  renderRanking('#ranking-chart', data, state, store, tooltip);
}

function renderKpis(stats, state) {
  const topValue = stats.topRegion ? metricValue(stats.topRegion, state.activeMetric) : null;
  document.querySelector('#summary-cards').innerHTML = `
    <div><dt>Selected regions</dt><dd>${formatNumber(stats.summaries.length, 0)}</dd></div>
    <div><dt>Visible observations</dt><dd>${formatNumber(stats.visiblePoints, 0)}</dd></div>
    <div><dt>Visible average</dt><dd>${formatMetric(stats.average, state.activeMetric)}</dd></div>
    <div><dt>Top ranked region</dt><dd>${stats.topRegion?.region || 'NA'} <small>${formatMetric(topValue, state.activeMetric)}</small></dd></div>
  `;
}

function renderBadges(state, metric) {
  const badges = [
    `Metric: ${metric.shortLabel}`,
    `Years: ${state.yearRange.join('-')}`,
    `Sort: ${SORT_OPTIONS.get(state.sortOrder)}`,
    `Zoom: ${state.zoomLevel}`,
    `${state.selectedRegions.length} selected`
  ];
  document.querySelector('#active-badges').innerHTML = badges.map((badge) => `<span>${badge}</span>`).join('');
}

function renderInsightButtons(state) {
  document.querySelectorAll('[data-insight]').forEach((button) => {
    button.setAttribute('aria-pressed', state.selectedInsight === button.dataset.insight);
  });
}

function renderLinkedTable(state, stats) {
  const summaries = selectedSummaries(data, state);
  const rows = stats.ranked.length ? stats.ranked : summaries;
  document.querySelector('#ranked-table tbody').innerHTML = rows.map((row) => `
    <tr class="${state.highlightedRegion === row.region ? 'is-highlighted' : ''}" data-region="${row.region}">
      <td>${row.region}</td>
      <td>${formatNumber(row.endShare, 1)}%</td>
      <td>${formatMetric(row.change, 'change')}</td>
      <td>${formatMetric(row.index, 'index')}</td>
      <td>${row.isOutlier ? 'Flagged' : 'Typical'}</td>
    </tr>
  `).join('');

  document.querySelectorAll('#ranked-table tbody tr').forEach((row) => {
    row.addEventListener('pointerenter', () => store.setState({ highlightedRegion: row.dataset.region }));
    row.addEventListener('pointerleave', () => store.setState({ highlightedRegion: null }));
    row.addEventListener('click', () => store.setState({ selectedRegions: [row.dataset.region], selectedDataPoints: [row.dataset.region], selectedInsight: 'custom' }));
  });
}

init().catch((error) => {
  console.error(error);
  document.querySelector('.project2-dashboard').insertAdjacentHTML('afterbegin', `
    <p class="project2-error">The Project 2 dashboard could not load its CSV files. Try refreshing or running through a local server.</p>
  `);
});

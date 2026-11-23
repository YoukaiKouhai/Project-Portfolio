const d3 = window.d3;

export const REGION_COLORS = new Map([
  ['World', '#546a7b'],
  ['European Union', '#2f7d68'],
  ['High income', '#4464ad'],
  ['North America', '#c95f46'],
  ['East Asia & Pacific', '#b98921'],
  ['Low income', '#7a5aa6'],
  ['Sub-Saharan Africa', '#8a6f3d']
]);

export function formatNumber(value, digits = 1) {
  return value == null || !Number.isFinite(value) ? 'NA' : value.toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

export function formatMetric(value, metric) {
  if (value == null || !Number.isFinite(value)) return 'NA';
  if (metric === 'index') return `${formatNumber(value, 0)}`;
  return `${formatNumber(value, 1)}${metric === 'change' ? ' pts' : '%'}`;
}

export async function loadAgingData() {
  const [seriesRows, contextRows] = await Promise.all([
    d3.csv('aging_series.csv', (row) => ({
      region: row.region,
      year: Number(row.year),
      age65Share: Number(row.age65_share)
    })),
    d3.csv('aging_context.csv', (row) => ({
      region: row.region,
      year: Number(row.year),
      age65Share: Number(row.age65_share),
      workingShare: Number(row.working_share),
      youngShare: Number(row.young_share)
    }))
  ]);

  const seriesByRegion = d3.group(seriesRows, (d) => d.region);
  const contextByRegion = new Map(contextRows.map((row) => [row.region, row]));
  const regions = [...new Set([...contextRows.map((d) => d.region), ...seriesRows.map((d) => d.region)])];
  const years = d3.extent(seriesRows, (d) => d.year);

  for (const [region, rows] of seriesByRegion) {
    rows.sort((a, b) => a.year - b.year);
    const base = rows.find((d) => d.year === years[0])?.age65Share ?? rows[0]?.age65Share;
    rows.forEach((row) => {
      row.metrics = {
        share: row.age65Share,
        change: row.age65Share - base,
        index: base ? (row.age65Share / base) * 100 : null
      };
    });
  }

  const summaries = regions.map((region) => {
    const rows = seriesByRegion.get(region) || [];
    const context = contextByRegion.get(region);
    const start = rows[0];
    const end = rows.find((d) => d.year === years[1]) || rows.at(-1);
    return {
      region,
      startShare: start?.age65Share ?? null,
      endShare: end?.age65Share ?? context?.age65Share ?? null,
      change: start && end ? end.age65Share - start.age65Share : null,
      index: start && end ? (end.age65Share / start.age65Share) * 100 : null,
      youngShare: context?.youngShare ?? null,
      workingShare: context?.workingShare ?? null,
      age65Share: context?.age65Share ?? end?.age65Share ?? null,
      hasSeries: rows.length > 0
    };
  });

  const changeValues = summaries.map((d) => d.change).filter(Number.isFinite);
  const changeMean = d3.mean(changeValues);
  const changeDeviation = d3.deviation(changeValues) || 1;
  summaries.forEach((summary) => {
    summary.changeZ = Number.isFinite(summary.change) ? (summary.change - changeMean) / changeDeviation : null;
    summary.isOutlier = Math.abs(summary.changeZ || 0) >= 1;
  });

  return { seriesRows, contextRows, seriesByRegion, contextByRegion, summaries, regions, yearExtent: years };
}

export function metricValue(datum, metric) {
  if (datum.metrics) return datum.metrics[metric];
  if (metric === 'share') return datum.endShare ?? datum.age65Share;
  return datum[metric];
}

export function selectedSeries(data, state) {
  const selected = new Set(state.selectedRegions);
  return data.seriesRows.filter((row) => (
    selected.has(row.region) &&
    row.year >= state.yearRange[0] &&
    row.year <= state.yearRange[1]
  ));
}

export function selectedSummaries(data, state) {
  const selected = new Set(state.selectedRegions);
  return data.summaries.filter((summary) => selected.has(summary.region));
}

export function sortedSummaries(summaries, sortOrder) {
  return [...summaries].sort((a, b) => {
    if (sortOrder === 'shareDesc') return (b.endShare ?? -Infinity) - (a.endShare ?? -Infinity);
    if (sortOrder === 'nameAsc') return a.region.localeCompare(b.region);
    return (b.change ?? -Infinity) - (a.change ?? -Infinity);
  });
}

export function visibleStats(data, state) {
  const series = selectedSeries(data, state);
  const summaries = selectedSummaries(data, state);
  const metricValues = series.map((d) => metricValue(d, state.activeMetric)).filter(Number.isFinite);
  const ranked = sortedSummaries(summaries.filter((d) => Number.isFinite(metricValue(d, state.activeMetric))), state.sortOrder);
  return {
    series,
    summaries,
    ranked,
    visiblePoints: series.length,
    average: d3.mean(metricValues),
    median: d3.median(metricValues),
    topRegion: ranked[0],
    outliers: summaries.filter((d) => d.isOutlier)
  };
}

export function percentileRank(values, value) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(value)) return null;
  const index = d3.bisectRight(clean, value);
  return (index / clean.length) * 100;
}

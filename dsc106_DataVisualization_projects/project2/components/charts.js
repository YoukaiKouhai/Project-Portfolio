import { METRICS } from './state.js';
import { formatMetric, formatNumber, metricValue, percentileRank, REGION_COLORS, selectedSeries, selectedSummaries, sortedSummaries, visibleStats } from './utils.js';

const d3 = window.d3;
const margin = { top: 28, right: 24, bottom: 46, left: 58 };

function setupSvg(selector, height) {
  const node = document.querySelector(selector);
  const width = Math.max(320, node.clientWidth || 760);
  const svg = d3.select(node).attr('viewBox', [0, 0, width, height]).attr('height', height);
  svg.selectAll('*').remove();
  return { svg, width, height, innerWidth: width - margin.left - margin.right, innerHeight: height - margin.top - margin.bottom };
}

function axisStyle(selection) {
  selection.selectAll('text').attr('class', 'axis-label');
  selection.selectAll('path,line').attr('stroke', 'currentColor').attr('opacity', 0.3);
}

function isDimmed(region, state) {
  return state.highlightedRegion && state.highlightedRegion !== region;
}

export function renderLineChart(selector, data, state, store, tooltip) {
  const { svg, width, height, innerWidth, innerHeight } = setupSvg(selector, 430);
  const metric = METRICS.get(state.activeMetric);
  const rows = selectedSeries(data, state);
  const groups = d3.group(rows, (d) => d.region);
  const allMetricValues = rows.map((d) => metricValue(d, state.activeMetric)).filter(Number.isFinite);
  const yExtent = d3.extent(allMetricValues.length ? allMetricValues : [0, 1]);
  if (yExtent[0] === yExtent[1]) yExtent[1] += 1;

  const x = d3.scaleLinear().domain(data.yearExtent).range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleLinear().domain(yExtent).nice().range([margin.top + innerHeight, margin.top]);
  const line = d3.line()
    .defined((d) => Number.isFinite(metricValue(d, state.activeMetric)))
    .x((d) => x(d.year))
    .y((d) => y(metricValue(d, state.activeMetric)));

  svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat('')).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(6)).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5)).call(axisStyle);
  svg.append('text').attr('class', 'axis-title').attr('x', margin.left + innerWidth / 2).attr('y', height - 8).attr('text-anchor', 'middle').text('Year');
  svg.append('text').attr('class', 'axis-title').attr('transform', `translate(16,${margin.top + innerHeight / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(metric.label);

  const stats = visibleStats(data, state);
  if (Number.isFinite(stats.average)) {
    svg.append('line')
      .attr('class', 'annotation-line')
      .attr('x1', margin.left)
      .attr('x2', margin.left + innerWidth)
      .attr('y1', y(stats.average))
      .attr('y2', y(stats.average));
    svg.append('text')
      .attr('class', 'annotation-text')
      .attr('x', margin.left + innerWidth - 4)
      .attr('y', y(stats.average) - 7)
      .attr('text-anchor', 'end')
      .text(`visible avg ${formatMetric(stats.average, state.activeMetric)}`);
  }

  const series = svg.append('g').selectAll('path').data([...groups], (d) => d[0]).join('path')
    .attr('class', 'series-line')
    .attr('d', ([, values]) => line(values))
    .attr('stroke', ([region]) => REGION_COLORS.get(region) || '#777')
    .attr('opacity', ([region]) => isDimmed(region, state) ? 0.18 : 1)
    .on('pointerenter', (event, [region]) => store.setState({ highlightedRegion: region }))
    .on('pointerleave', () => store.setState({ highlightedRegion: null }));

  series.append('title').text(([region]) => region);

  const points = svg.append('g').selectAll('circle').data(rows, (d) => `${d.region}-${d.year}`).join('circle')
    .attr('class', 'linked-point')
    .attr('cx', (d) => x(d.year))
    .attr('cy', (d) => y(metricValue(d, state.activeMetric)))
    .attr('r', (d) => state.highlightedRegion === d.region ? 5 : 3.3)
    .attr('fill', (d) => REGION_COLORS.get(d.region) || '#777')
    .attr('opacity', (d) => isDimmed(d.region, state) ? 0.16 : 0.9)
    .on('pointerenter', (event, d) => {
      store.setState({ highlightedRegion: d.region });
      tooltip.show(event, d, { metric: state.activeMetric, metricLabel: metric.label, average: stats.average });
    })
    .on('pointermove', (event) => tooltip.move(event))
    .on('pointerleave', () => {
      tooltip.hide();
      store.setState({ highlightedRegion: null });
    });

  points.append('title').text((d) => `${d.region} ${d.year}`);

  const topOutlier = selectedSummaries(data, state).filter((d) => d.isOutlier && Number.isFinite(d.change)).sort((a, b) => b.change - a.change)[0];
  if (topOutlier) {
    const row = data.seriesByRegion.get(topOutlier.region)?.find((d) => d.year === data.yearExtent[1]);
    if (row && row.year >= state.yearRange[0] && row.year <= state.yearRange[1]) {
      svg.append('path')
        .attr('class', 'callout-line')
        .attr('d', `M${x(row.year)},${y(metricValue(row, state.activeMetric))} L${Math.min(width - 180, x(row.year) - 120)},${Math.max(34, y(metricValue(row, state.activeMetric)) - 44)}`);
      svg.append('text')
        .attr('class', 'annotation-text strong')
        .attr('x', Math.min(width - 178, x(row.year) - 118))
        .attr('y', Math.max(30, y(metricValue(row, state.activeMetric)) - 48))
        .text(`${topOutlier.region}: largest increase`);
    }
  }

  const brush = d3.brushX()
    .extent([[margin.left, margin.top], [margin.left + innerWidth, margin.top + innerHeight]])
    .on('end', (event) => {
      if (!event.sourceEvent) return;
      if (!event.selection) {
        store.setState({ yearRange: data.yearExtent, brushSelection: null });
        return;
      }
      const range = event.selection.map(x.invert).map(Math.round);
      store.setState({ yearRange: range, brushSelection: range, selectedInsight: 'custom' });
    });
  const brushGroup = svg.append('g').attr('class', 'brush').call(brush);
  brushGroup.call(brush.move, state.yearRange.map(x));
}

export function renderScatter(selector, data, state, store, tooltip) {
  const { svg, width, height, innerWidth, innerHeight } = setupSvg(selector, 330);
  const rows = data.summaries.filter((d) => d.hasSeries && Number.isFinite(d.startShare) && Number.isFinite(d.change));
  const x = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.startShare) * 1.1]).nice().range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.change) * 1.2]).nice().range([margin.top + innerHeight, margin.top]);
  const size = d3.scaleSqrt().domain(d3.extent(rows, (d) => d.endShare)).range([6, 15]);
  const selected = new Set(state.selectedRegions);
  const metric = METRICS.get(state.activeMetric);
  const stats = visibleStats(data, state);

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`)).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d} pts`)).call(axisStyle);
  svg.append('text').attr('class', 'axis-title').attr('x', margin.left + innerWidth / 2).attr('y', height - 8).attr('text-anchor', 'middle').text('2000 age 65+ share');
  svg.append('text').attr('class', 'axis-title').attr('transform', `translate(16,${margin.top + innerHeight / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('2000-2020 increase');

  svg.append('g').selectAll('circle').data(rows, (d) => d.region).join('circle')
    .attr('class', 'scatter-dot')
    .attr('cx', (d) => x(d.startShare))
    .attr('cy', (d) => y(d.change))
    .attr('r', (d) => size(d.endShare))
    .attr('fill', (d) => REGION_COLORS.get(d.region) || '#777')
    .attr('opacity', (d) => selected.has(d.region) ? (isDimmed(d.region, state) ? 0.2 : 0.88) : 0.13)
    .attr('stroke-width', (d) => selected.has(d.region) ? 2 : 1)
    .on('click', (event, d) => {
      const next = new Set(state.selectedRegions);
      next.has(d.region) ? next.delete(d.region) : next.add(d.region);
      store.setState({ selectedRegions: [...next], selectedInsight: 'custom' });
    })
    .on('pointerenter', (event, d) => {
      store.setState({ highlightedRegion: d.region });
      tooltip.show(event, d, { metric: state.activeMetric, metricLabel: metric.label, average: stats.average });
    })
    .on('pointermove', (event) => tooltip.move(event))
    .on('pointerleave', () => {
      tooltip.hide();
      store.setState({ highlightedRegion: null });
    });

  svg.append('g').selectAll('text').data(rows).join('text')
    .attr('class', 'scatter-label')
    .attr('x', (d) => x(d.startShare) + size(d.endShare) + 4)
    .attr('y', (d) => y(d.change) + 4)
    .attr('opacity', (d) => selected.has(d.region) && !isDimmed(d.region, state) ? 1 : 0.22)
    .text((d) => d.region);

  const brush = d3.brush()
    .extent([[margin.left, margin.top], [margin.left + innerWidth, margin.top + innerHeight]])
    .on('end', (event) => {
      if (!event.sourceEvent) return;
      if (!event.selection) return;
      const [[x0, y0], [x1, y1]] = event.selection;
      const brushed = rows.filter((d) => x0 <= x(d.startShare) && x(d.startShare) <= x1 && y0 <= y(d.change) && y(d.change) <= y1).map((d) => d.region);
      if (brushed.length) store.setState({ selectedRegions: brushed, selectedDataPoints: brushed, selectedInsight: 'custom' });
    });
  svg.append('g').attr('class', 'brush').call(brush);
}

export function renderComposition(selector, data, state, store) {
  const { svg, innerWidth, innerHeight } = setupSvg(selector, 320);
  const rows = selectedSummaries(data, state).filter((d) => Number.isFinite(d.youngShare));
  const y = d3.scaleBand().domain(rows.map((d) => d.region)).range([margin.top, margin.top + innerHeight]).padding(0.26);
  const x = d3.scaleLinear().domain([0, 100]).range([margin.left, margin.left + innerWidth]);
  const parts = [
    { key: 'youngShare', label: 'Under 15', color: '#8bb8cf' },
    { key: 'workingShare', label: '15-64', color: '#5f7f52' },
    { key: 'age65Share', label: '65+', color: '#c95f46' }
  ];

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`)).call(axisStyle);
  rows.forEach((row) => {
    let cursor = 0;
    parts.forEach((part) => {
      svg.append('rect')
        .attr('x', x(cursor))
        .attr('y', y(row.region))
        .attr('width', Math.max(0, x(row[part.key] + cursor) - x(cursor)))
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('fill', part.color)
        .attr('opacity', isDimmed(row.region, state) ? 0.22 : 0.9)
        .on('pointerenter', () => store.setState({ highlightedRegion: row.region }))
        .on('pointerleave', () => store.setState({ highlightedRegion: null }));
      cursor += row[part.key];
    });
    svg.append('text').attr('class', 'axis-title').attr('x', margin.left - 8).attr('y', y(row.region) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text(row.region);
    svg.append('text').attr('class', 'bar-value').attr('x', x(100) - 6).attr('y', y(row.region) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text(`${formatNumber(row.age65Share, 1)}% 65+`);
  });

  const legend = svg.append('g').attr('transform', `translate(${margin.left},16)`);
  parts.forEach((part, index) => {
    const item = legend.append('g').attr('transform', `translate(${index * 100},0)`);
    item.append('rect').attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', part.color);
    item.append('text').attr('class', 'axis-label').attr('x', 18).attr('y', 10).text(part.label);
  });
}

export function renderRanking(selector, data, state, store, tooltip) {
  const { svg, innerWidth, innerHeight } = setupSvg(selector, 340);
  const rows = sortedSummaries(selectedSummaries(data, state), state.sortOrder).filter((d) => Number.isFinite(metricValue(d, state.activeMetric)));
  const metric = METRICS.get(state.activeMetric);
  const values = rows.map((d) => metricValue(d, state.activeMetric));
  const x = d3.scaleLinear().domain([Math.min(0, d3.min(values) || 0), d3.max(values) || 1]).nice().range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleBand().domain(rows.map((d) => d.region)).range([margin.top, margin.top + innerHeight]).padding(0.24);
  const stats = visibleStats(data, state);

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5)).call(axisStyle);
  rows.forEach((row) => {
    const value = metricValue(row, state.activeMetric);
    const percentile = percentileRank(values, value);
    svg.append('rect')
      .attr('class', 'rank-bar')
      .attr('x', x(Math.min(0, value)))
      .attr('y', y(row.region))
      .attr('width', Math.abs(x(value) - x(0)))
      .attr('height', y.bandwidth())
      .attr('rx', 5)
      .attr('fill', REGION_COLORS.get(row.region) || '#777')
      .attr('opacity', isDimmed(row.region, state) ? 0.22 : 0.88)
      .on('pointerenter', (event) => {
        store.setState({ highlightedRegion: row.region });
        tooltip.show(event, { ...row, percentile }, { metric: state.activeMetric, metricLabel: metric.label, average: stats.average });
      })
      .on('pointermove', (event) => tooltip.move(event))
      .on('pointerleave', () => {
        tooltip.hide();
        store.setState({ highlightedRegion: null });
      });
    svg.append('text').attr('class', 'axis-title').attr('x', margin.left - 8).attr('y', y(row.region) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text(row.region);
    svg.append('text').attr('class', 'bar-value').attr('x', x(value) + (value >= 0 ? 7 : -7)).attr('y', y(row.region) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', value >= 0 ? 'start' : 'end').text(formatMetric(value, state.activeMetric));
  });
}

import { NOVA_CLASSES, STORE_COLORS } from '../constants/config.js';
import { formatMoney, formatNumber, groupSummary, median, quantile } from './utils.js';

const d3 = window.d3;

const margin = { top: 22, right: 28, bottom: 48, left: 58 };

function setupSvg(selector, height) {
  const node = document.querySelector(selector);
  const width = Math.max(320, node.clientWidth || 700);
  const svg = d3.select(node).attr('viewBox', [0, 0, width, height]).attr('height', height);
  svg.selectAll('*').remove();
  return { svg, width, height, innerWidth: width - margin.left - margin.right, innerHeight: height - margin.top - margin.bottom };
}

function axisStyle(selection) {
  selection.selectAll('text').attr('class', 'chart-label');
  selection.selectAll('path,line').attr('stroke', 'currentColor').attr('opacity', 0.35);
}

export function renderStoryChart(selector, products, step = 'overview') {
  const { svg, width, height, innerWidth, innerHeight } = setupSvg(selector, 540);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + 12})`);
  const summaries = groupSummary(products, 'store');
  const y = d3.scaleBand().domain(summaries.map((d) => d.name)).range([0, innerHeight * 0.54]).padding(0.28);
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth * 0.62]);
  const priceX = d3.scaleLinear().domain([0, d3.max(summaries, (d) => d.medianPrice) * 1.12]).range([0, innerWidth * 0.28]);
  const highlightStore = step === 'price' ? 'Whole Foods' : step === 'processing' ? 'Target' : null;

  g.append('text').attr('class', 'chart-label').attr('x', 0).attr('y', -6).text('Share of products by processing class');

  summaries.forEach((summary) => {
    const row = g.append('g').attr('transform', `translate(0,${y(summary.name)})`);
    row.append('text').attr('x', -10).attr('y', y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-weight', 800).attr('fill', 'currentColor').text(summary.name);
    let cursor = 0;
    const total = summary.values.length;
    NOVA_CLASSES.forEach((nova) => {
      const count = summary.values.filter((d) => Math.round(d.nova) === nova.id).length;
      const share = total ? count / total : 0;
      row.append('rect')
        .attr('x', x(cursor))
        .attr('width', 0)
        .attr('height', y.bandwidth())
        .attr('rx', 4)
        .attr('fill', nova.color)
        .attr('opacity', highlightStore && summary.name !== highlightStore ? 0.38 : 1)
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', x(share));
      cursor += share;
    });
    row.append('text')
      .attr('x', x(Math.min(0.98, summary.ultraShare)) - 8)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', 'white')
      .attr('font-weight', 850)
      .text(`${formatNumber(summary.ultraShare * 100, 0)}% ultra`);
  });

  const priceGroup = g.append('g').attr('transform', `translate(${innerWidth * 0.68},0)`);
  priceGroup.append('text').attr('class', 'chart-label').attr('x', 0).attr('y', -6).text('Median price per 100 calories');
  summaries.forEach((summary) => {
    const row = priceGroup.append('g').attr('transform', `translate(0,${y(summary.name)})`);
    row.append('rect')
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('width', 0)
      .attr('fill', STORE_COLORS.get(summary.name) || '#777')
      .attr('opacity', highlightStore && summary.name !== highlightStore ? 0.35 : 0.95)
      .transition().duration(700).ease(d3.easeCubicOut)
      .attr('width', priceX(summary.medianPrice));
    row.append('text')
      .attr('x', priceX(summary.medianPrice) + 8)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', 'currentColor')
      .attr('font-weight', 800)
      .text(formatMoney(summary.medianPrice));
  });

  const legend = svg.append('g').attr('transform', `translate(${margin.left},${height - 72})`);
  NOVA_CLASSES.forEach((nova, index) => {
    const item = legend.append('g').attr('transform', `translate(${index * Math.min(180, width / 4)},0)`);
    item.append('rect').attr('width', 14).attr('height', 14).attr('rx', 3).attr('fill', nova.color);
    item.append('text').attr('x', 20).attr('y', 11).attr('class', 'chart-label').text(nova.label);
  });
}

export function renderScatter(selector, products, tooltip, onBrush) {
  const { svg, width, height, innerWidth, innerHeight } = setupSvg(selector, 460);
  const clean = products.filter((d) => Number.isFinite(d.fpro) && d.validPrice && !d.priceOutlier);
  const x = d3.scaleLinear().domain([0, 1]).range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleLinear().domain([0, Math.max(1, d3.quantile(clean.map((d) => d.pricePer100Cal).sort(d3.ascending), 0.98) || 1)]).nice().range([margin.top + innerHeight, margin.top]);

  svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat('')).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(6)).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6, '$.2f')).call(axisStyle);
  svg.append('text').attr('class', 'chart-label').attr('x', margin.left + innerWidth / 2).attr('y', height - 8).attr('text-anchor', 'middle').text('FPro processing score');
  svg.append('text').attr('class', 'chart-label').attr('transform', `translate(15,${margin.top + innerHeight / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Price per 100 calories');

  const dots = svg.append('g')
    .selectAll('circle')
    .data(clean.slice(0, 9000), (d) => d.id)
    .join('circle')
    .attr('class', 'dot')
    .attr('cx', (d) => x(d.fpro))
    .attr('cy', (d) => y(d.pricePer100Cal))
    .attr('r', (d) => 2.4 + Math.sqrt(Math.max(0, d.health)) / 22)
    .attr('fill', (d) => STORE_COLORS.get(d.store) || '#777')
    .on('pointerenter', (event, d) => {
      d3.select(event.currentTarget).classed('is-highlighted', true);
      tooltip.show(event, d);
    })
    .on('pointermove', (event) => tooltip.move(event))
    .on('pointerleave', (event) => {
      d3.select(event.currentTarget).classed('is-highlighted', false);
      tooltip.hide();
    });

  const brush = d3.brush()
    .extent([[margin.left, margin.top], [margin.left + innerWidth, margin.top + innerHeight]])
    .on('end', ({ selection }) => {
      if (!selection) {
        dots.classed('is-muted', false);
        onBrush(null);
        return;
      }
      const [[x0, y0], [x1, y1]] = selection;
      const ids = new Set(clean.filter((d) => x0 <= x(d.fpro) && x(d.fpro) <= x1 && y0 <= y(d.pricePer100Cal) && y(d.pricePer100Cal) <= y1).map((d) => d.id));
      dots.classed('is-muted', (d) => !ids.has(d.id));
      onBrush(ids);
    });

  svg.append('g').attr('class', 'brush').call(brush);
  svg.on('dblclick', () => {
    svg.select('.brush').call(brush.move, null);
    onBrush(null);
  });
}

export function renderHistogram(selector, products) {
  const { svg, innerWidth, innerHeight } = setupSvg(selector, 320);
  const values = products.filter((d) => d.validPrice && !d.priceOutlier).map((d) => d.pricePer100Cal);
  const x = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([margin.left, margin.left + innerWidth]);
  const bins = d3.bin().domain(x.domain()).thresholds(18)(values);
  const y = d3.scaleLinear().domain([0, d3.max(bins, (d) => d.length) || 1]).nice().range([margin.top + innerHeight, margin.top]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5, '$.2f')).call(axisStyle);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4)).call(axisStyle);
  svg.append('g').selectAll('rect').data(bins).join('rect')
    .attr('x', (d) => x(d.x0) + 1)
    .attr('y', (d) => y(d.length))
    .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr('height', (d) => margin.top + innerHeight - y(d.length))
    .attr('rx', 3)
    .attr('fill', '#316c9f')
    .attr('opacity', 0.82);
}

export function renderStacked(selector, products) {
  const { svg, innerWidth, innerHeight } = setupSvg(selector, 320);
  const summaries = groupSummary(products, 'store');
  const x = d3.scaleLinear().domain([0, 1]).range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleBand().domain(summaries.map((d) => d.name)).range([margin.top, margin.top + innerHeight]).padding(0.32);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('.0%')).ticks(5)).call(axisStyle);
  summaries.forEach((summary) => {
    let cursor = 0;
    NOVA_CLASSES.forEach((nova) => {
      const share = summary.values.length ? summary.values.filter((d) => Math.round(d.nova) === nova.id).length / summary.values.length : 0;
      svg.append('rect').attr('x', x(cursor)).attr('y', y(summary.name)).attr('width', x(share) - x(0)).attr('height', y.bandwidth()).attr('rx', 4).attr('fill', nova.color);
      cursor += share;
    });
    svg.append('text').attr('x', margin.left - 8).attr('y', y(summary.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('fill', 'currentColor').attr('font-weight', 800).text(summary.name);
  });
}

export function renderBoxplot(selector, products) {
  const { svg, innerWidth, innerHeight } = setupSvg(selector, 320);
  const summaries = groupSummary(products, 'store').map((store) => {
    const values = store.values.map((d) => d.health).filter(Number.isFinite);
    return { ...store, min: quantile(values, 0.05), q1: quantile(values, 0.25), median: median(values), q3: quantile(values, 0.75), max: quantile(values, 0.95) };
  });
  const x = d3.scaleLinear().domain([0, 100]).range([margin.left, margin.left + innerWidth]);
  const y = d3.scaleBand().domain(summaries.map((d) => d.name)).range([margin.top, margin.top + innerHeight]).padding(0.45);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${margin.top + innerHeight})`).call(d3.axisBottom(x).ticks(5)).call(axisStyle);
  summaries.forEach((summary) => {
    const center = y(summary.name) + y.bandwidth() / 2;
    svg.append('line').attr('x1', x(summary.min)).attr('x2', x(summary.max)).attr('y1', center).attr('y2', center).attr('stroke', 'currentColor').attr('opacity', 0.5);
    svg.append('rect').attr('x', x(summary.q1)).attr('y', y(summary.name)).attr('width', Math.max(1, x(summary.q3) - x(summary.q1))).attr('height', y.bandwidth()).attr('rx', 4).attr('fill', STORE_COLORS.get(summary.name) || '#777').attr('opacity', 0.8);
    svg.append('line').attr('x1', x(summary.median)).attr('x2', x(summary.median)).attr('y1', y(summary.name) - 4).attr('y2', y(summary.name) + y.bandwidth() + 4).attr('stroke', 'currentColor').attr('stroke-width', 2);
    svg.append('text').attr('x', margin.left - 8).attr('y', center).attr('dy', '0.35em').attr('text-anchor', 'end').attr('fill', 'currentColor').attr('font-weight', 800).text(summary.name);
  });
}

const d3 = window.d3;

const scenarioOrder = ['ssp126', 'ssp245', 'ssp370', 'ssp585'];
const scenarioLabels = {
  historical: 'Historical',
  ssp126: 'SSP1-2.6',
  ssp245: 'SSP2-4.5',
  ssp370: 'SSP3-7.0',
  ssp585: 'SSP5-8.5'
};
const scenarioDescriptions = {
  ssp126: 'strong mitigation',
  ssp245: 'intermediate emissions',
  ssp370: 'high emissions',
  ssp585: 'very high emissions'
};
const scenarioColors = {
  ssp126: '#2b83ba',
  ssp245: '#2f8f6b',
  ssp370: '#d08a20',
  ssp585: '#c94c5c'
};

const defaultState = {
  location: 'San Diego',
  visibleScenarios: scenarioOrder,
  focusScenario: 'ssp245',
  threshold: 2,
  horizon: 2100,
  metric: 'anomaly',
  insight: 'overview'
};

const insights = {
  arctic: {
    location: 'Longyearbyen',
    visibleScenarios: scenarioOrder,
    focusScenario: 'ssp585',
    threshold: 4,
    horizon: 2100,
    metric: 'anomaly',
    insight: 'arctic'
  },
  mitigation: {
    location: 'San Diego',
    visibleScenarios: ['ssp126', 'ssp585'],
    focusScenario: 'ssp585',
    threshold: 2,
    horizon: 2100,
    metric: 'anomaly',
    insight: 'mitigation'
  },
  'near-term': {
    location: 'Delhi',
    visibleScenarios: ['ssp245', 'ssp370', 'ssp585'],
    focusScenario: 'ssp370',
    threshold: 2,
    horizon: 2050,
    metric: 'anomaly',
    insight: 'near-term'
  },
  tropics: {
    location: 'Lagos',
    visibleScenarios: ['ssp126', 'ssp245', 'ssp585'],
    focusScenario: 'ssp245',
    threshold: 2,
    horizon: 2100,
    metric: 'temperature',
    insight: 'tropics'
  }
};

const insightNotes = {
  overview: 'Start with San Diego, then choose a city or pathway to ask how local futures diverge.',
  arctic: 'Longyearbyen shows the strongest local anomaly in this sample, a classic Arctic amplification pattern.',
  mitigation: 'The gap between strong mitigation and very high emissions becomes much larger after mid-century.',
  'near-term': 'Near-term risk depends on location and pathway; the map and ranking expose where thresholds arrive earlier.',
  tropics: 'Absolute temperature reveals why hot baseline climates can be risky even when anomalies are not the largest.',
  custom: 'Custom exploration: the linked charts are now driven by your selected controls.'
};

let data = [];
let locations = [];
let dataByLocation = new Map();
let locationByName = new Map();
let renderQueued = false;
let playing = false;
let playTimer = null;
let mapTransform = d3.zoomIdentity;

let state = { ...defaultState, ...readStateFromUrl() };

const controls = {
  location: document.getElementById('location-select'),
  scenarios: document.getElementById('scenario-controls'),
  threshold: document.getElementById('threshold-slider'),
  thresholdValue: document.getElementById('threshold-value'),
  horizon: document.getElementById('horizon-slider'),
  horizonValue: document.getElementById('horizon-value'),
  focus: document.getElementById('focus-scenario'),
  metric: document.getElementById('metric-select'),
  tooltip: document.getElementById('climate-tooltip')
};

async function init() {
  [data, locations] = await Promise.all([
    d3.csv('climate_locations.csv', (row) => ({
      location: row.location,
      region: row.region,
      scenario: row.scenario,
      year: Number(row.year),
      anomaly: Number(row.anomaly_c),
      temperature: Number(row.temp_c)
    })),
    d3.csv('locations.csv', (row) => ({
      location: row.location,
      region: row.region,
      requestedLat: Number(row.requested_lat),
      requestedLon: Number(row.requested_lon),
      lat: Number(row.lat),
      lon: Number(row.lon),
      baseline: Number(row.baseline_c)
    }))
  ]);

  dataByLocation = d3.group(data, (d) => d.location);
  locationByName = new Map(locations.map((d) => [d.location, d]));
  state = sanitizeState(state);
  populateControls();
  bindControls();
  render();
}

function sanitizeState(candidate) {
  const locationNames = new Set(locations.map((d) => d.location));
  const scenarios = (candidate.visibleScenarios || defaultState.visibleScenarios).filter((scenario) => scenarioOrder.includes(scenario));
  const horizon = Math.max(2030, Math.min(2100, Number(candidate.horizon) || defaultState.horizon));
  const threshold = Math.max(1, Math.min(6, Number(candidate.threshold) || defaultState.threshold));
  const metric = candidate.metric === 'temperature' ? 'temperature' : 'anomaly';
  const focusScenario = scenarioOrder.includes(candidate.focusScenario) ? candidate.focusScenario : defaultState.focusScenario;
  return {
    location: locationNames.has(candidate.location) ? candidate.location : defaultState.location,
    visibleScenarios: scenarios.length ? scenarios : [...defaultState.visibleScenarios],
    focusScenario,
    threshold,
    horizon,
    metric,
    insight: candidate.insight || 'custom'
  };
}

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const patch = {};
  if (params.has('loc')) patch.location = params.get('loc');
  if (params.has('scenarios')) patch.visibleScenarios = params.get('scenarios').split(',').filter(Boolean);
  if (params.has('focus')) patch.focusScenario = params.get('focus');
  if (params.has('threshold')) patch.threshold = Number(params.get('threshold'));
  if (params.has('horizon')) patch.horizon = Number(params.get('horizon'));
  if (params.has('metric')) patch.metric = params.get('metric');
  if (params.has('insight')) patch.insight = params.get('insight');
  return patch;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.location !== defaultState.location) params.set('loc', state.location);
  if (state.visibleScenarios.join(',') !== defaultState.visibleScenarios.join(',')) params.set('scenarios', state.visibleScenarios.join(','));
  if (state.focusScenario !== defaultState.focusScenario) params.set('focus', state.focusScenario);
  if (state.threshold !== defaultState.threshold) params.set('threshold', state.threshold);
  if (state.horizon !== defaultState.horizon) params.set('horizon', state.horizon);
  if (state.metric !== defaultState.metric) params.set('metric', state.metric);
  if (state.insight && state.insight !== 'overview') params.set('insight', state.insight);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

function setState(patch) {
  state = sanitizeState({ ...state, ...patch });
  if (!state.visibleScenarios.includes(state.focusScenario)) {
    state.visibleScenarios = [...new Set([...state.visibleScenarios, state.focusScenario])];
  }
  writeStateToUrl();
  syncControls();
  scheduleRender();
}

function populateControls() {
  d3.select(controls.location)
    .selectAll('option')
    .data(locations)
    .join('option')
    .attr('value', (d) => d.location)
    .text((d) => `${d.location} | ${d.region}`);

  d3.select(controls.scenarios)
    .selectAll('label')
    .data(scenarioOrder)
    .join('label')
    .html((scenario) => `
      <input type="checkbox" value="${scenario}">
      <span style="color:${scenarioColors[scenario]}">${scenarioLabels[scenario]}</span>
    `);

  d3.select(controls.focus)
    .selectAll('option')
    .data(scenarioOrder)
    .join('option')
    .attr('value', (d) => d)
    .text((d) => `${scenarioLabels[d]} | ${scenarioDescriptions[d]}`);

  syncControls();
}

function bindControls() {
  controls.location.addEventListener('change', (event) => setState({ location: event.target.value, insight: 'custom' }));
  controls.scenarios.addEventListener('change', () => {
    const visibleScenarios = [...controls.scenarios.querySelectorAll('input:checked')].map((input) => input.value);
    setState({ visibleScenarios, insight: 'custom' });
  });
  controls.threshold.addEventListener('input', (event) => setState({ threshold: Number(event.target.value), insight: 'custom' }));
  controls.horizon.addEventListener('input', (event) => setState({ horizon: Number(event.target.value), insight: 'custom' }));
  controls.focus.addEventListener('change', (event) => setState({ focusScenario: event.target.value, insight: 'custom' }));
  controls.metric.addEventListener('change', (event) => setState({ metric: event.target.value, insight: 'custom' }));
  document.getElementById('reset-button').addEventListener('click', () => setState({ ...defaultState, insight: 'overview' }));
  document.getElementById('copy-link').addEventListener('click', copyCurrentLink);
  document.getElementById('play-button').addEventListener('click', togglePlayback);
  document.getElementById('reset-map').addEventListener('click', resetMap);
  document.querySelectorAll('[data-insight]').forEach((button) => {
    button.addEventListener('click', () => setState(insights[button.dataset.insight]));
  });
}

function syncControls() {
  controls.location.value = state.location;
  controls.focus.value = state.focusScenario;
  controls.metric.value = state.metric;
  controls.threshold.value = state.threshold;
  controls.horizon.value = state.horizon;
  controls.thresholdValue.textContent = `${state.threshold.toFixed(1)} degC`;
  controls.horizonValue.textContent = state.horizon;
  controls.scenarios.querySelectorAll('input').forEach((input) => {
    input.checked = state.visibleScenarios.includes(input.value);
  });
  document.querySelectorAll('[data-insight]').forEach((button) => {
    button.setAttribute('aria-pressed', state.insight === button.dataset.insight);
  });
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function locationData(locationName, scenario, horizon = state.horizon) {
  return (dataByLocation.get(locationName) || [])
    .filter((d) => d.scenario === scenario && d.year <= horizon)
    .sort((a, b) => d3.ascending(a.year, b.year));
}

function metricValue(datum) {
  return state.metric === 'temperature' ? datum.temperature : datum.anomaly;
}

function metricLabel() {
  return state.metric === 'temperature' ? 'Estimated temperature (degC)' : 'Temperature anomaly (degC)';
}

function thresholdValueForLocation(locationName) {
  if (state.metric === 'temperature') return (locationByName.get(locationName)?.baseline || 0) + state.threshold;
  return state.threshold;
}

function crossingYear(locationName, scenario, threshold = state.threshold) {
  const points = locationData(locationName, scenario, 2100).filter((d) => d.year >= 2015);
  return points.find((d) => d.anomaly >= threshold)?.year ?? null;
}

function horizonAverage(locationName, scenario, metric = state.metric) {
  const start = Math.max(2015, state.horizon - 4);
  const points = locationData(locationName, scenario).filter((d) => d.year >= start);
  return d3.mean(points, (d) => metric === 'temperature' ? d.temperature : d.anomaly);
}

function rankedLocations(metric = state.metric) {
  return locations.map((location) => ({
    ...location,
    value: horizonAverage(location.location, state.focusScenario, metric),
    anomaly: horizonAverage(location.location, state.focusScenario, 'anomaly'),
    crossing: crossingYear(location.location, state.focusScenario)
  }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => d3.descending(a.value, b.value));
}

function render() {
  renderSummary();
  renderBadges();
  renderMap();
  renderMainChart();
  renderComparisonChart();
  renderSpreadChart();
}

function renderSummary() {
  const crossing = crossingYear(state.location, state.focusScenario, state.threshold);
  const warming = horizonAverage(state.location, state.focusScenario, state.metric);
  const ranked = rankedLocations();
  const rank = ranked.findIndex((d) => d.location === state.location) + 1;
  const insightText = insightNotes[state.insight] || insightNotes.custom;

  document.getElementById('summary-location').textContent = state.location;
  document.getElementById('summary-crossing').textContent = crossing
    ? `${scenarioLabels[state.focusScenario]} | ${crossing}`
    : `Not by ${state.horizon}`;
  document.getElementById('summary-warming').textContent = Number.isFinite(warming)
    ? `${warming.toFixed(1)} degC | ${scenarioLabels[state.focusScenario]}`
    : 'No projection';
  document.getElementById('summary-rank').textContent = rank > 0 ? `${rank} of ${ranked.length}` : 'NA';
  document.getElementById('main-chart-title').textContent = `${state.location}: projected local warming`;
  document.getElementById('comparison-title').textContent = `${scenarioLabels[state.focusScenario]} across locations in ${state.horizon}`;
  document.getElementById('state-note').textContent = insightText;
  document.getElementById('play-button').textContent = playing ? 'Pause' : 'Play';
}

function renderBadges() {
  const badges = [
    `Location: ${state.location}`,
    `Pathway: ${scenarioLabels[state.focusScenario]}`,
    `Horizon: ${state.horizon}`,
    `Threshold: ${state.threshold.toFixed(1)} degC`,
    `Metric: ${state.metric === 'temperature' ? 'absolute' : 'anomaly'}`,
    `${state.visibleScenarios.length} pathways visible`
  ];
  document.getElementById('active-badges').innerHTML = badges.map((badge) => `<span>${badge}</span>`).join('');
}

function renderMap() {
  const width = 620;
  const height = 390;
  const ranked = rankedLocations(state.metric);
  const valueExtent = d3.extent(ranked, (d) => d.value);
  const radius = d3.scaleSqrt().domain(valueExtent).range([7, 22]);
  const color = d3.scaleSequential()
    .domain(valueExtent)
    .interpolator(state.metric === 'temperature'
      ? d3.interpolateYlOrRd
      : d3.interpolateRgbBasis(['#2b83ba', '#d08a20', '#c94c5c']));
  const projection = d3.geoNaturalEarth1().fitExtent([[18, 16], [width - 18, height - 24]], { type: 'Sphere' });
  const path = d3.geoPath(projection);

  const svg = d3.select('#map-chart').html('').append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const layer = svg.append('g').attr('transform', mapTransform);
  layer.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));
  layer.append('path').attr('class', 'graticule').attr('d', path(d3.geoGraticule10()));

  const points = layer.selectAll('.location-point')
    .data(ranked, (d) => d.location)
    .join('circle')
    .attr('class', (d) => `location-point${d.location === state.location ? ' selected' : ''}`)
    .attr('cx', (d) => projection([d.lon, d.lat])[0])
    .attr('cy', (d) => projection([d.lon, d.lat])[1])
    .attr('r', (d) => radius(d.value))
    .attr('fill', (d) => color(d.value))
    .attr('opacity', (d) => d.location === state.location ? 1 : 0.82)
    .on('click', (_, d) => setState({ location: d.location, insight: 'custom' }))
    .on('mouseenter', (event, d) => showLocationTooltip(event, d, ranked))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  points.append('title').text((d) => d.location);

  layer.selectAll('.location-label')
    .data(ranked)
    .join('text')
    .attr('class', (d) => `location-label${d.location === state.location ? ' selected' : ''}`)
    .attr('x', (d) => projection([d.lon, d.lat])[0] + radius(d.value) + 4)
    .attr('y', (d) => projection([d.lon, d.lat])[1] + 4)
    .text((d) => d.location);

  const legend = svg.append('g').attr('transform', `translate(${width - 180},${height - 54})`);
  const legendScale = d3.scaleLinear().domain(valueExtent).range([0, 130]);
  const stops = d3.range(0, 131, 2);
  legend.selectAll('rect').data(stops).join('rect')
    .attr('x', (d) => d)
    .attr('width', 2)
    .attr('height', 8)
    .attr('fill', (d) => color(legendScale.invert(d)));
  legend.append('text').attr('class', 'map-label').attr('x', 0).attr('y', -6).text(metricLabel());
  legend.append('text').attr('class', 'map-label').attr('x', 0).attr('y', 24).text(`${valueExtent[0].toFixed(1)} degC`);
  legend.append('text').attr('class', 'map-label').attr('x', 130).attr('y', 24).attr('text-anchor', 'end').text(`${valueExtent[1].toFixed(1)} degC`);

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      mapTransform = event.transform;
      layer.attr('transform', mapTransform);
    });
  svg.call(zoom).call(zoom.transform, mapTransform);
}

function renderMainChart() {
  const width = 1040;
  const height = 570;
  const margin = { top: 26, right: 160, bottom: 55, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const visible = state.visibleScenarios;
  const historical = locationData(state.location, 'historical');
  const projections = visible.flatMap((scenario) => locationData(state.location, scenario));
  const allPoints = [...historical, ...projections];
  const yValues = [...allPoints.map(metricValue), thresholdValueForLocation(state.location)];
  const yExtent = d3.extent(yValues.filter(Number.isFinite));
  const yPadding = Math.max(0.5, (yExtent[1] - yExtent[0]) * 0.12);
  const x = d3.scaleLinear().domain([1950, state.horizon]).range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([Math.min(yExtent[0] - yPadding, state.metric === 'anomaly' ? -1 : yExtent[0] - yPadding), yExtent[1] + yPadding])
    .nice()
    .range([innerHeight, 0]);
  const line = d3.line()
    .defined((d) => Number.isFinite(metricValue(d)))
    .x((d) => x(d.year))
    .y((d) => y(metricValue(d)));

  const svg = d3.select('#temperature-chart').html('').append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  plot.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(8).tickSize(-innerWidth).tickFormat(''));
  plot.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
  plot.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(8).tickFormat((d) => `${d} deg`));
  svg.append('text').attr('class', 'axis-label').attr('x', margin.left + innerWidth / 2).attr('y', height - 10).attr('text-anchor', 'middle').text('Year');
  svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -(margin.top + innerHeight / 2)).attr('y', 18).attr('text-anchor', 'middle').text(metricLabel());

  const thresholdY = y(thresholdValueForLocation(state.location));
  plot.append('line').attr('class', 'threshold-line').attr('x1', 0).attr('x2', innerWidth).attr('y1', thresholdY).attr('y2', thresholdY);
  plot.append('text').attr('class', 'threshold-label').attr('x', 8).attr('y', thresholdY - 8).text(`${state.threshold.toFixed(1)} degC local anomaly threshold`);
  plot.append('line').attr('class', 'horizon-line').attr('x1', x(state.horizon)).attr('x2', x(state.horizon)).attr('y1', 0).attr('y2', innerHeight);

  plot.append('path').datum(historical).attr('class', 'historical-line').attr('d', line);

  visible.forEach((scenario) => {
    const points = locationData(state.location, scenario);
    plot.append('path')
      .datum(points)
      .attr('class', `scenario-line${scenario === state.focusScenario ? ' focused' : ''}`)
      .attr('stroke', scenarioColors[scenario])
      .attr('d', line)
      .on('click', () => setState({ focusScenario: scenario, insight: 'custom' }));

    const crossing = crossingYear(state.location, scenario, state.threshold);
    if (crossing) {
      const point = points.find((d) => d.year === crossing);
      if (point) {
        plot.append('circle')
          .attr('class', 'crossing-dot')
          .attr('cx', x(point.year))
          .attr('cy', y(metricValue(point)))
          .attr('r', 5)
          .attr('fill', scenarioColors[scenario]);
      }
    }

    const last = points.at(-1);
    if (last) {
      plot.append('text')
        .attr('x', innerWidth + 10)
        .attr('y', y(metricValue(last)) + 5)
        .attr('fill', scenarioColors[scenario])
        .attr('font-weight', scenario === state.focusScenario ? 850 : 650)
        .text(`${scenarioLabels[scenario]} ${metricValue(last).toFixed(1)}`);
    }
  });

  const hoverLine = plot.append('line').attr('class', 'hover-line').attr('y1', 0).attr('y2', innerHeight).style('display', 'none');
  plot.append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', (event) => {
      const [mouseX] = d3.pointer(event);
      const year = Math.max(1950, Math.min(state.horizon, Math.round(x.invert(mouseX))));
      hoverLine.attr('x1', x(year)).attr('x2', x(year)).style('display', null);
      showYearTooltip(event, year);
    })
    .on('mouseleave', () => {
      hoverLine.style('display', 'none');
      hideTooltip();
    });
}

function renderComparisonChart() {
  const width = 1000;
  const height = 470;
  const margin = { top: 24, right: 90, bottom: 50, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const values = rankedLocations();
  const average = d3.mean(values, (d) => d.value);
  const x = d3.scaleLinear().domain([0, d3.max(values, (d) => d.value) * 1.12]).nice().range([0, innerWidth]);
  const y = d3.scaleBand().domain(values.map((d) => d.location)).range([0, innerHeight]).padding(0.35);

  const svg = d3.select('#comparison-chart').html('').append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  plot.append('g').attr('class', 'grid').call(d3.axisBottom(x).ticks(7).tickSize(innerHeight).tickFormat(''));
  plot.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat((d) => `${d} deg`));
  plot.append('line').attr('class', 'threshold-line').attr('x1', x(average)).attr('x2', x(average)).attr('y1', 0).attr('y2', innerHeight);
  plot.append('text').attr('class', 'annotation-text').attr('x', x(average) + 5).attr('y', 12).text(`mean ${average.toFixed(1)} degC`);

  const rows = plot.selectAll('.comparison-row')
    .data(values)
    .join('g')
    .attr('class', (d) => `comparison-row${d.location === state.location ? ' selected' : ''}`)
    .attr('transform', (d) => `translate(0,${y(d.location) + y.bandwidth() / 2})`)
    .on('click', (_, d) => setState({ location: d.location, insight: 'custom' }))
    .on('mouseenter', (event, d) => showLocationTooltip(event, d, values))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  rows.append('rect').attr('x', 0).attr('y', -y.bandwidth() / 2).attr('width', innerWidth).attr('height', y.bandwidth()).attr('fill', 'transparent');
  rows.append('line').attr('x1', 0).attr('x2', (d) => x(d.value)).attr('stroke', scenarioColors[state.focusScenario]).attr('stroke-width', 4);
  rows.append('circle').attr('cx', (d) => x(d.value)).attr('r', 8).attr('fill', scenarioColors[state.focusScenario]);
  rows.append('text').attr('class', (d) => `bar-label${d.location === state.location ? ' selected' : ''}`).attr('x', -12).attr('text-anchor', 'end').attr('dominant-baseline', 'middle').text((d) => d.location);
  rows.append('text').attr('class', 'bar-label').attr('x', (d) => x(d.value) + 13).attr('dominant-baseline', 'middle').attr('font-weight', 800).text((d) => `${d.value.toFixed(1)} degC`);

  svg.append('text').attr('class', 'axis-label').attr('x', margin.left + innerWidth / 2).attr('y', height - 8).attr('text-anchor', 'middle').text(`Five-year mean ending ${state.horizon} | ${metricLabel()}`);
}

function renderSpreadChart() {
  const width = 1000;
  const height = 330;
  const margin = { top: 24, right: 40, bottom: 48, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const years = d3.range(2015, state.horizon + 1);
  const spreadRows = years.map((year) => {
    const values = state.visibleScenarios
      .map((scenario) => locationData(state.location, scenario, 2100).find((d) => d.year === year)?.anomaly)
      .filter(Number.isFinite);
    return {
      year,
      min: d3.min(values),
      max: d3.max(values),
      spread: values.length ? d3.max(values) - d3.min(values) : null
    };
  }).filter((d) => Number.isFinite(d.spread));
  const x = d3.scaleLinear().domain([2015, state.horizon]).range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([Math.min(0, d3.min(spreadRows, (d) => d.min) || 0), d3.max(spreadRows, (d) => d.max) || 1])
    .nice()
    .range([innerHeight, 0]);
  const ySpread = d3.scaleLinear().domain([0, d3.max(spreadRows, (d) => d.spread) || 1]).nice().range([innerHeight, 0]);
  const area = d3.area().x((d) => x(d.year)).y0((d) => y(d.min)).y1((d) => y(d.max));
  const line = d3.line().x((d) => x(d.year)).y((d) => ySpread(d.spread));

  const svg = d3.select('#spread-chart').html('').append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  plot.append('g').attr('class', 'grid').call(d3.axisLeft(ySpread).ticks(5).tickSize(-innerWidth).tickFormat(''));
  plot.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
  plot.append('g').attr('class', 'axis').call(d3.axisLeft(ySpread).ticks(5).tickFormat((d) => `${d} deg`));
  plot.append('path').datum(spreadRows).attr('class', 'spread-band').attr('d', area);
  plot.append('path').datum(spreadRows).attr('class', 'spread-line').attr('d', line);

  const last = spreadRows.at(-1);
  if (last) {
    plot.append('text').attr('class', 'annotation-text').attr('x', x(last.year) - 8).attr('y', ySpread(last.spread) - 10).attr('text-anchor', 'end').text(`pathway gap ${last.spread.toFixed(1)} degC`);
  }
  svg.append('text').attr('class', 'axis-label').attr('x', margin.left + innerWidth / 2).attr('y', height - 8).attr('text-anchor', 'middle').text('Year');
  svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -(margin.top + innerHeight / 2)).attr('y', 18).attr('text-anchor', 'middle').text('Scenario spread (degC)');
}

function showYearTooltip(event, year) {
  const rows = [];
  if (year <= 2014) {
    const point = locationData(state.location, 'historical', 2014).find((d) => d.year === year);
    if (point) rows.push(`<span>Historical: ${metricValue(point).toFixed(2)} degC</span>`);
  } else {
    state.visibleScenarios.forEach((scenario) => {
      const point = locationData(state.location, scenario, 2100).find((d) => d.year === year);
      if (point) rows.push(`<span style="color:${scenarioColors[scenario]}">${scenarioLabels[scenario]}: ${metricValue(point).toFixed(2)} degC</span>`);
    });
  }
  showTooltip(event, `<h3>${state.location} | ${year}</h3><p>${metricLabel()}</p>${rows.join('')}`);
}

function showLocationTooltip(event, datum, ranked) {
  const values = ranked.map((d) => d.value).filter(Number.isFinite).sort((a, b) => a - b);
  const rank = ranked.findIndex((d) => d.location === datum.location) + 1;
  const percentile = d3.bisectRight(values, datum.value) / values.length;
  const average = d3.mean(values);
  const delta = datum.value - average;
  const width = Math.max(4, Math.min(100, percentile * 100));
  showTooltip(event, `
    <h3>${datum.location}</h3>
    <p>${datum.region} | ${scenarioLabels[state.focusScenario]} | ${state.horizon}</p>
    <span>${metricLabel()}: ${datum.value.toFixed(2)} degC</span>
    <span>${delta >= 0 ? '+' : ''}${delta.toFixed(2)} degC vs location mean</span>
    <span>Rank ${rank} of ${ranked.length}</span>
    <div class="tooltip-mini"><span style="width:${width}%"></span></div>
  `);
}

function showTooltip(event, html) {
  controls.tooltip.innerHTML = html;
  controls.tooltip.hidden = false;
  moveTooltip(event);
}

function moveTooltip(event) {
  const pad = 16;
  const rect = controls.tooltip.getBoundingClientRect();
  const left = Math.min(window.innerWidth - rect.width - pad, event.clientX + pad);
  const top = Math.min(window.innerHeight - rect.height - pad, event.clientY + pad);
  controls.tooltip.style.left = `${Math.max(pad, left)}px`;
  controls.tooltip.style.top = `${Math.max(pad, top)}px`;
}

function hideTooltip() {
  controls.tooltip.hidden = true;
}

async function copyCurrentLink(event) {
  try {
    await navigator.clipboard?.writeText(location.href);
    event.currentTarget.textContent = 'Copied';
  } catch {
    event.currentTarget.textContent = 'Copy failed';
  }
  setTimeout(() => {
    event.currentTarget.textContent = 'Copy view link';
  }, 1200);
}

function togglePlayback() {
  playing = !playing;
  if (playing) {
    playTimer = window.setInterval(() => {
      const next = state.horizon >= 2100 ? 2030 : state.horizon + 5;
      setState({ horizon: next, insight: state.insight === 'overview' ? 'custom' : state.insight });
    }, 650);
  } else {
    window.clearInterval(playTimer);
  }
  renderSummary();
}

function resetMap() {
  mapTransform = d3.zoomIdentity;
  renderMap();
}

window.addEventListener('resize', scheduleRender);

init().catch((error) => {
  console.error(error);
  document.querySelector('.explorer').insertAdjacentHTML('afterbegin', `
    <p class="project3-error">Project 3 could not load its climate CSV files. Try refreshing or running through a local server.</p>
  `);
});

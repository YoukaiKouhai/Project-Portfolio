import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const scenarioOrder = ['ssp126', 'ssp245', 'ssp370', 'ssp585'];
const scenarioLabels = {
  historical: 'Historical',
  ssp126: 'SSP1-2.6',
  ssp245: 'SSP2-4.5',
  ssp370: 'SSP3-7.0',
  ssp585: 'SSP5-8.5',
};
const scenarioDescriptions = {
  ssp126: 'strong mitigation',
  ssp245: 'intermediate emissions',
  ssp370: 'high emissions',
  ssp585: 'very high emissions',
};
const scenarioColors = {
  ssp126: '#2b83ba',
  ssp245: '#68b984',
  ssp370: '#f2a541',
  ssp585: '#c94c5c',
};

const state = {
  location: 'San Diego',
  visibleScenarios: new Set(scenarioOrder),
  focusScenario: 'ssp245',
  threshold: 2,
  horizon: 2100,
};

const locationSelect = document.getElementById('location-select');
const scenarioControls = document.getElementById('scenario-controls');
const thresholdSlider = document.getElementById('threshold-slider');
const thresholdValue = document.getElementById('threshold-value');
const horizonSlider = document.getElementById('horizon-slider');
const horizonValue = document.getElementById('horizon-value');
const focusScenarioSelect = document.getElementById('focus-scenario');
const tooltip = document.getElementById('climate-tooltip');

const data = await d3.csv('climate_locations.csv', (row) => ({
  ...row,
  year: Number(row.year),
  anomaly: Number(row.anomaly_c),
  temperature: Number(row.temp_c),
}));
const locations = await d3.csv('locations.csv', (row) => ({
  ...row,
  baseline: Number(row.baseline_c),
}));

const locationNames = locations.map((d) => d.location);
const dataByLocation = d3.group(data, (d) => d.location);

function populateControls() {
  d3.select(locationSelect)
    .selectAll('option')
    .data(locations)
    .join('option')
    .attr('value', (d) => d.location)
    .text((d) => `${d.location} · ${d.region}`);

  d3.select(scenarioControls)
    .selectAll('label')
    .data(scenarioOrder)
    .join('label')
    .html((scenario) => `
      <input type="checkbox" value="${scenario}" checked>
      <span style="color:${scenarioColors[scenario]}">${scenarioLabels[scenario]}</span>
    `);

  d3.select(focusScenarioSelect)
    .selectAll('option')
    .data(scenarioOrder)
    .join('option')
    .attr('value', (d) => d)
    .text((d) => `${scenarioLabels[d]} · ${scenarioDescriptions[d]}`);

  locationSelect.value = state.location;
  focusScenarioSelect.value = state.focusScenario;
}

function locationData(location, scenario) {
  return (dataByLocation.get(location) || [])
    .filter((d) => d.scenario === scenario)
    .filter((d) => d.year <= state.horizon)
    .sort((a, b) => d3.ascending(a.year, b.year));
}

function crossingYear(location, scenario, threshold) {
  const points = locationData(location, scenario).filter((d) => d.year >= 2015);
  return points.find((d) => d.anomaly >= threshold)?.year ?? null;
}

function horizonAverage(location, scenario) {
  const start = Math.max(2015, state.horizon - 4);
  const points = locationData(location, scenario).filter((d) => d.year >= start);
  return d3.mean(points, (d) => d.anomaly);
}

function showTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

function renderSummary() {
  const crossing = crossingYear(state.location, state.focusScenario, state.threshold);
  const warming = horizonAverage(state.location, state.focusScenario);

  document.getElementById('summary-location').textContent = state.location;
  document.getElementById('summary-crossing').textContent = crossing
    ? `${scenarioLabels[state.focusScenario]} · ${crossing}`
    : `Not by ${state.horizon}`;
  document.getElementById('summary-warming').textContent = Number.isFinite(warming)
    ? `${warming.toFixed(1)}°C · ${scenarioLabels[state.focusScenario]}`
    : 'No projection';

  thresholdValue.textContent = `${state.threshold.toFixed(1)}°C`;
  horizonValue.textContent = state.horizon;
  document.getElementById('main-chart-title').textContent = `${state.location}: projected local warming`;
  document.getElementById('comparison-title').textContent =
    `${scenarioLabels[state.focusScenario]} warming across locations in ${state.horizon}`;
}

function renderMainChart() {
  const width = 1040;
  const height = 570;
  const margin = { top: 25, right: 155, bottom: 55, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const visible = [...state.visibleScenarios];
  const historical = locationData(state.location, 'historical');
  const projections = visible.flatMap((scenario) => locationData(state.location, scenario));
  const allPoints = [...historical, ...projections];
  const yExtent = d3.extent([...allPoints.map((d) => d.anomaly), state.threshold]);
  const yPadding = Math.max(0.5, (yExtent[1] - yExtent[0]) * 0.12);

  const x = d3.scaleLinear().domain([1950, state.horizon]).range([0, innerWidth]);
  const y = d3
    .scaleLinear()
    .domain([Math.min(-1, yExtent[0] - yPadding), Math.max(2, yExtent[1] + yPadding)])
    .nice()
    .range([innerHeight, 0]);

  const line = d3
    .line()
    .defined((d) => Number.isFinite(d.anomaly))
    .x((d) => x(d.year))
    .y((d) => y(d.anomaly));

  const svg = d3
    .select('#temperature-chart')
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  plot
    .append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(8).tickSize(-innerWidth).tickFormat(''));
  plot
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
  plot.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(8).tickFormat((d) => `${d}°`));

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .text('Year');
  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(margin.top + innerHeight / 2))
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .text('Temperature anomaly (°C)');

  plot
    .append('line')
    .attr('class', 'threshold-line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', y(state.threshold))
    .attr('y2', y(state.threshold));
  plot
    .append('text')
    .attr('class', 'threshold-label')
    .attr('x', 8)
    .attr('y', y(state.threshold) - 8)
    .text(`${state.threshold.toFixed(1)}°C threshold`);

  plot
    .append('path')
    .datum(historical)
    .attr('class', 'historical-line')
    .attr('d', line);

  visible.forEach((scenario) => {
    const points = locationData(state.location, scenario);
    plot
      .append('path')
      .datum(points)
      .attr('class', `scenario-line${scenario === state.focusScenario ? ' focused' : ''}`)
      .attr('stroke', scenarioColors[scenario])
      .attr('d', line)
      .on('click', () => {
        state.focusScenario = scenario;
        focusScenarioSelect.value = scenario;
        render();
      });

    const crossing = crossingYear(state.location, scenario, state.threshold);
    if (crossing) {
      const point = points.find((d) => d.year === crossing);
      plot
        .append('circle')
        .attr('class', 'crossing-dot')
        .attr('cx', x(point.year))
        .attr('cy', y(point.anomaly))
        .attr('r', 5)
        .attr('fill', scenarioColors[scenario]);
    }

    const last = points.at(-1);
    if (last) {
      plot
        .append('text')
        .attr('x', innerWidth + 10)
        .attr('y', y(last.anomaly) + 5)
        .attr('fill', scenarioColors[scenario])
        .attr('font-weight', scenario === state.focusScenario ? 750 : 600)
        .text(`${scenarioLabels[scenario]} ${last.anomaly.toFixed(1)}°`);
    }
  });

  const hoverLine = plot
    .append('line')
    .attr('class', 'hover-line')
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .style('display', 'none');

  plot
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', (event) => {
      const [mouseX] = d3.pointer(event);
      const year = Math.max(1950, Math.min(state.horizon, Math.round(x.invert(mouseX))));
      hoverLine.attr('x1', x(year)).attr('x2', x(year)).style('display', null);

      const rows = [];
      if (year <= 2014) {
        const point = historical.find((d) => d.year === year);
        if (point) rows.push(`<span>Historical: ${point.anomaly.toFixed(2)}°C</span>`);
      } else {
        visible.forEach((scenario) => {
          const point = locationData(state.location, scenario).find((d) => d.year === year);
          if (point) {
            rows.push(
              `<span style="color:${scenarioColors[scenario]}">${scenarioLabels[scenario]}: ${point.anomaly.toFixed(2)}°C</span>`,
            );
          }
        });
      }

      showTooltip(
        event,
        `<strong>${state.location} · ${year}</strong>${rows.join('')}`,
      );
    })
    .on('mouseleave', () => {
      hoverLine.style('display', 'none');
      hideTooltip();
    });
}

function renderComparisonChart() {
  const width = 1000;
  const height = 470;
  const margin = { top: 20, right: 80, bottom: 50, left: 145 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const values = locationNames
    .map((location) => ({
      location,
      region: locations.find((d) => d.location === location).region,
      anomaly: horizonAverage(location, state.focusScenario),
    }))
    .filter((d) => Number.isFinite(d.anomaly))
    .sort((a, b) => d3.descending(a.anomaly, b.anomaly));

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(values, (d) => d.anomaly) * 1.12])
    .nice()
    .range([0, innerWidth]);
  const y = d3
    .scaleBand()
    .domain(values.map((d) => d.location))
    .range([0, innerHeight])
    .padding(0.35);

  const svg = d3
    .select('#comparison-chart')
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  plot
    .append('g')
    .attr('class', 'grid')
    .call(d3.axisBottom(x).ticks(7).tickSize(innerHeight).tickFormat(''));
  plot
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat((d) => `${d}°`));

  const rows = plot
    .selectAll('.comparison-row')
    .data(values)
    .join('g')
    .attr('class', (d) => `comparison-row${d.location === state.location ? ' selected' : ''}`)
    .attr('transform', (d) => `translate(0,${y(d.location) + y.bandwidth() / 2})`)
    .on('click', (_, d) => {
      state.location = d.location;
      locationSelect.value = d.location;
      render();
    })
    .on('mouseenter', (event, d) => {
      showTooltip(
        event,
        `<strong>${d.location}</strong><span>${d.region}</span><span>${scenarioLabels[state.focusScenario]}: ${d.anomaly.toFixed(2)}°C</span>`,
      );
    })
    .on('mouseleave', hideTooltip);

  rows
    .append('rect')
    .attr('x', 0)
    .attr('y', -y.bandwidth() / 2)
    .attr('width', innerWidth)
    .attr('height', y.bandwidth())
    .attr('fill', 'transparent');
  rows
    .append('line')
    .attr('x1', 0)
    .attr('x2', (d) => x(d.anomaly))
    .attr('stroke', scenarioColors[state.focusScenario])
    .attr('stroke-width', 4);
  rows
    .append('circle')
    .attr('cx', (d) => x(d.anomaly))
    .attr('r', 8)
    .attr('fill', scenarioColors[state.focusScenario]);
  rows
    .append('text')
    .attr('x', -12)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .text((d) => d.location);
  rows
    .append('text')
    .attr('x', (d) => x(d.anomaly) + 13)
    .attr('dominant-baseline', 'middle')
    .attr('font-weight', 700)
    .text((d) => `${d.anomaly.toFixed(1)}°C`);

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .text(`Five-year mean anomaly ending ${state.horizon} (°C)`);
}

function render() {
  renderSummary();
  renderMainChart();
  renderComparisonChart();
}

populateControls();

locationSelect.addEventListener('change', (event) => {
  state.location = event.target.value;
  render();
});
scenarioControls.addEventListener('change', () => {
  state.visibleScenarios = new Set(
    [...scenarioControls.querySelectorAll('input:checked')].map((input) => input.value),
  );
  if (!state.visibleScenarios.has(state.focusScenario) && state.visibleScenarios.size) {
    state.focusScenario = [...state.visibleScenarios][0];
    focusScenarioSelect.value = state.focusScenario;
  }
  render();
});
thresholdSlider.addEventListener('input', (event) => {
  state.threshold = Number(event.target.value);
  render();
});
horizonSlider.addEventListener('input', (event) => {
  state.horizon = Number(event.target.value);
  render();
});
focusScenarioSelect.addEventListener('change', (event) => {
  state.focusScenario = event.target.value;
  if (!state.visibleScenarios.has(state.focusScenario)) {
    state.visibleScenarios.add(state.focusScenario);
    scenarioControls.querySelector(`input[value="${state.focusScenario}"]`).checked = true;
  }
  render();
});
document.getElementById('reset-button').addEventListener('click', () => {
  state.location = 'San Diego';
  state.visibleScenarios = new Set(scenarioOrder);
  state.focusScenario = 'ssp245';
  state.threshold = 2;
  state.horizon = 2100;

  locationSelect.value = state.location;
  focusScenarioSelect.value = state.focusScenario;
  thresholdSlider.value = state.threshold;
  horizonSlider.value = state.horizon;
  scenarioControls.querySelectorAll('input').forEach((input) => {
    input.checked = true;
  });
  render();
});

render();

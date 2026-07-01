import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const BLUEBIKES_STATIONS_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
const BLUEBIKES_TRAFFIC_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
const BOSTON_BIKE_LANES_URL = 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson';
const CAMBRIDGE_BIKE_LANES_URL = 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson';

const departuresByMinute = Array.from({ length: 1440 }, () => []);
const arrivalsByMinute = Array.from({ length: 1440 }, () => []);
const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');
const svg = d3.select('#map').select('svg');

const map = new mapboxgl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
      },
    ],
  },
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 10,
  maxZoom: 18,
});

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat();
  }

  const minMinute = (minute - 60 + 1440) % 1440;
  const maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    return tripsByMinute.slice(minMinute).concat(tripsByMinute.slice(0, maxMinute + 1)).flat();
  }

  return tripsByMinute.slice(minMinute, maxMinute + 1).flat();
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (trips) => trips.length,
    (trip) => trip.start_station_id,
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (trips) => trips.length,
    (trip) => trip.end_station_id,
  );

  return stations.map((station) => {
    const id = station.short_name;

    return {
      ...station,
      arrivals: arrivals.get(id) ?? 0,
      departures: departures.get(id) ?? 0,
      totalTraffic: (arrivals.get(id) ?? 0) + (departures.get(id) ?? 0),
    };
  });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);

  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(2000, 0, 1, 0, minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDepartureRatio(station) {
  return station.totalTraffic === 0 ? 0.5 : station.departures / station.totalTraffic;
}

function getStationPopup(station) {
  return `
    <div class="station-popup">
      <strong>${station.name}</strong>
      <dl>
        <dt>Total</dt><dd>${d3.format(',')(station.totalTraffic)}</dd>
        <dt>Arrivals</dt><dd>${d3.format(',')(station.arrivals)}</dd>
        <dt>Departures</dt><dd>${d3.format(',')(station.departures)}</dd>
      </dl>
    </div>
  `;
}

function addBikeLaneLayer(id, sourceId, data, color) {
  map.addSource(sourceId, {
    type: 'geojson',
    data,
  });

  map.addLayer({
    id,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': color,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 16, 4],
      'line-opacity': 0.5,
    },
  });
}

function parseTrip(trip) {
  trip.started_at = new Date(trip.started_at);
  trip.ended_at = new Date(trip.ended_at);

  departuresByMinute[minutesSinceMidnight(trip.started_at)].push(trip);
  arrivalsByMinute[minutesSinceMidnight(trip.ended_at)].push(trip);

  return trip;
}

map.on('load', async () => {
  addBikeLaneLayer('boston-bike-lanes', 'boston-route', BOSTON_BIKE_LANES_URL, '#168a65');
  addBikeLaneLayer('cambridge-bike-lanes', 'cambridge-route', CAMBRIDGE_BIKE_LANES_URL, '#2a9d8f');

  const [stationData] = await Promise.all([
    d3.json(BLUEBIKES_STATIONS_URL),
    d3.csv(BLUEBIKES_TRAFFIC_URL, parseTrip),
  ]);
  const stations = stationData.data.stations;
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(computeStationTraffic(stations), (station) => station.totalTraffic)])
    .range([0, 25]);
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
  });

  const circles = svg
    .selectAll('circle')
    .data(computeStationTraffic(stations), (station) => station.short_name)
    .join('circle')
    .attr('r', (station) => radiusScale(station.totalTraffic))
    .style('--departure-ratio', (station) => stationFlow(getDepartureRatio(station)))
    .on('mouseenter focus click', (event, station) => {
      popup
        .setLngLat([+station.lon, +station.lat])
        .setHTML(getStationPopup(station))
        .addTo(map);
    })
    .on('mouseleave blur', () => popup.remove());

  function updatePositions() {
    circles
      .attr('cx', (station) => getCoords(station).cx)
      .attr('cy', (station) => getCoords(station).cy);
  }

  function updateScatterPlot(timeFilter) {
    const filteredStations = computeStationTraffic(stations, timeFilter);
    radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);

    circles
      .data(filteredStations, (station) => station.short_name)
      .join('circle')
      .attr('r', (station) => radiusScale(station.totalTraffic))
      .style('--departure-ratio', (station) => stationFlow(getDepartureRatio(station)));

    updatePositions();
  }

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'inline';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(timeFilter);
  }

  updatePositions();
  updateTimeDisplay();

  timeSlider.addEventListener('input', updateTimeDisplay);
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});

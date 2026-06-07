// Import functions from global.js
import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let query = '';
let selectedYear = null;

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value((d) => d.value).sort(null);

function getProjectYear(project) {
  return String(project.year || 'Unknown');
}

function matchesSearch(project) {
  const values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

function getSearchFilteredProjects(projects) {
  return projects.filter(matchesSearch);
}

function getYearData(projects) {
  const rolledData = d3.rollups(
    projects,
    (projectGroup) => projectGroup.length,
    getProjectYear,
  );

  return rolledData
    .map(([year, count]) => ({ label: year, value: count }))
    .sort((a, b) => d3.descending(a.label, b.label));
}

function updateSelectedClasses() {
  svg
    .selectAll('path')
    .attr('class', (d) => (d.data.label === selectedYear ? 'selected' : null))
    .attr('aria-pressed', (d) => String(d.data.label === selectedYear));

  legend
    .selectAll('li')
    .attr('class', (d) => `legend-item${d.label === selectedYear ? ' selected' : ''}`)
    .attr('aria-pressed', (d) => String(d.label === selectedYear));
}

function toggleYear(year, projects) {
  selectedYear = selectedYear === year ? null : year;
  updateView(projects);
}

function renderPieChart(projects, allProjects) {
  const data = getYearData(projects);
  const availableYears = new Set(data.map((d) => d.label));

  if (selectedYear && !availableYears.has(selectedYear)) {
    selectedYear = null;
  }

  const colors = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(data.map((d) => d.label));

  const arcData = sliceGenerator(data);

  svg.selectAll('path').remove();
  svg.selectAll('text').remove();
  legend.selectAll('li').remove();

  if (data.length === 0) {
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('class', 'empty-chart-label')
      .text('No projects');
    return;
  }

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d) => colors(d.data.label))
    .attr('style', (d) => `--color:${colors(d.data.label)}`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.label}: ${d.data.value} projects`)
    .on('click', (event, d) => toggleYear(d.data.label, allProjects))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleYear(d.data.label, allProjects);
      }
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d) => `--color:${colors(d.label)}`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.label}: ${d.value} projects`)
    .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (event, d) => toggleYear(d.label, allProjects))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleYear(d.label, allProjects);
      }
    });

  updateSelectedClasses();
}

function updateView(projects) {
  const searchedProjects = getSearchFilteredProjects(projects);
  const visibleProjects = selectedYear
    ? searchedProjects.filter((project) => getProjectYear(project) === selectedYear)
    : searchedProjects;

  renderProjects(visibleProjects, projectsContainer, 'h2');
  renderPieChart(searchedProjects, projects);
}

// Immediately-invoked async function to load projects
(async function loadProjects() {
  try {
    const projects = await fetchJSON('../lib/projects.json');

    if (!projectsContainer) {
      console.error('No container with class "projects" found in HTML.');
      return;
    }

    if (!Array.isArray(projects) || projects.length === 0) {
      renderProjects([], projectsContainer, 'h2');
      renderPieChart([], []);
      return;
    }

    searchInput.addEventListener('input', (event) => {
      query = event.target.value;
      updateView(projects);
    });

    updateView(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
})();

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

const repoCommitUrl = 'https://github.com/YoukaiKouhai/Project-Portfolio/commit/';
const chartWidth = 1000;
const chartHeight = 600;
const chartMargin = { top: 20, right: 30, bottom: 45, left: 60 };
const usableArea = {
  top: chartMargin.top,
  right: chartWidth - chartMargin.right,
  bottom: chartHeight - chartMargin.bottom,
  left: chartMargin.left,
  width: chartWidth - chartMargin.left - chartMargin.right,
  height: chartHeight - chartMargin.top - chartMargin.bottom,
};

let data = [];
let commits = [];
let filteredCommits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;
let xScale;
let yScale;
let brushSelection = null;
let currentStoryIndex = -1;

const commitProgressInput = document.getElementById('commit-progress');
const commitTime = document.getElementById('commit-time');
const languageColors = d3.scaleOrdinal(d3.schemeTableau10);
const brushBehavior = d3
  .brush()
  .extent([
    [usableArea.left, usableArea.top],
    [usableArea.right, usableArea.bottom],
  ])
  .on('start brush end', brushed);

async function loadData() {
  return d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(lines) {
  return d3
    .groups(lines, (d) => d.commit)
    .map(([commit, commitLines]) => {
      const first = commitLines[0];
      const { author, date, time, timezone, datetime } = first;
      const commitInfo = {
        id: commit,
        url: `${repoCommitUrl}${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: commitLines.length,
      };

      Object.defineProperty(commitInfo, 'lines', {
        value: commitLines,
        configurable: false,
        enumerable: false,
        writable: false,
      });

      return commitInfo;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function getTimePeriod(date) {
  const hour = date.getHours();

  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function addStat(dl, label, value) {
  dl.append('dt').html(label);
  dl.append('dd').text(value);
}

function renderCommitInfo(lines, commitData) {
  const fileLengths = d3.rollups(
    lines,
    (fileLines) => d3.max(fileLines, (line) => line.line),
    (line) => line.file,
  );
  const longestFile = d3.greatest(fileLengths, (file) => file[1]);
  const workByPeriod = d3.rollups(
    lines,
    (periodLines) => periodLines.length,
    (line) => getTimePeriod(line.datetime),
  );
  const workByDay = d3.rollups(
    lines,
    (dayLines) => dayLines.length,
    (line) => line.datetime.toLocaleDateString('en', { weekday: 'long' }),
  );

  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');
  addStat(dl, 'Total <abbr title="Lines of code">LOC</abbr>', d3.format(',')(lines.length));
  addStat(dl, 'Total commits', d3.format(',')(commitData.length));
  addStat(dl, 'Files', d3.format(',')(d3.group(lines, (d) => d.file).size));
  addStat(dl, 'Average line length', `${d3.format('.1f')(d3.mean(lines, (d) => d.length) || 0)} chars`);
  addStat(dl, 'Maximum depth', d3.max(lines, (d) => d.depth) ?? 0);
  addStat(dl, 'Longest file', `${longestFile?.[0] || 'Unknown'} (${d3.format(',')(longestFile?.[1] || 0)} lines)`);
  addStat(dl, 'Average file length', `${d3.format('.1f')(d3.mean(fileLengths, (d) => d[1]) || 0)} lines`);
  addStat(dl, 'Most active time', d3.greatest(workByPeriod, (d) => d[1])?.[0] || 'Unknown');
  addStat(dl, 'Most active day', d3.greatest(workByDay, (d) => d[1])?.[0] || 'Unknown');
}

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const dateElement = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id.slice(0, 7);
  dateElement.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime.toLocaleString('en', { timeStyle: 'medium' });
  author.textContent = commit.author;
  lines.textContent = d3.format(',')(commit.totalLines);
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const point = Number.isFinite(event.clientX)
    ? { x: event.clientX, y: event.clientY }
    : {
        x: event.currentTarget.getBoundingClientRect().right,
        y: event.currentTarget.getBoundingClientRect().top,
      };

  tooltip.style.left = `${point.x + 12}px`;
  tooltip.style.top = `${point.y + 12}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function getSelectedCommits(selection) {
  return selection ? filteredCommits.filter((commit) => isCommitSelected(selection, commit)) : [];
}

function renderSelectionCount(selection) {
  const selectedCommits = getSelectedCommits(selection);
  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = getSelectedCommits(selection);
  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';

  if (selectedCommits.length === 0) return;

  const lines = selectedCommits.flatMap((commit) => commit.lines);
  const breakdown = d3.rollup(
    lines,
    (languageLines) => languageLines.length,
    (line) => line.type,
  );

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.insertAdjacentHTML(
      'beforeend',
      `<dt>${language}</dt><dd>${d3.format(',')(count)} lines (${formatted})</dd>`,
    );
  }
}

function brushed(event) {
  brushSelection = event.selection;
  d3.selectAll('.commit-dot').classed('selected', (commit) => isCommitSelected(brushSelection, commit));
  renderSelectionCount(brushSelection);
  renderLanguageBreakdown(brushSelection);
}

function getXDomain(commitData) {
  const dateExtent = d3.extent(commitData, (d) => d.datetime);

  if (!dateExtent[0]) {
    return timeScale.domain();
  }

  return dateExtent[0].getTime() === dateExtent[1].getTime()
    ? [d3.timeDay.offset(dateExtent[0], -1), d3.timeDay.offset(dateExtent[0], 1)]
    : dateExtent;
}

function getRadiusScale(commitData) {
  const [minLines = 0, maxLines = 0] = d3.extent(commitData, (d) => d.totalLines);

  return d3
    .scaleSqrt()
    .domain(minLines === maxLines ? [0, maxLines || 1] : [minLines, maxLines])
    .range([3, 24]);
}

function wireDotInteractions(selection) {
  selection
    .attr('tabindex', 0)
    .attr('aria-label', (d) => `${d.id.slice(0, 7)}, ${d.totalLines} lines edited`)
    .on('mouseenter focus click', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave blur', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function renderScatterPlot(commitData) {
  xScale = d3.scaleTime().domain(getXDomain(commitData)).range([usableArea.left, usableArea.right]).nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  const svg = d3
    .select('#chart')
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${chartWidth} ${chartHeight}`)
    .attr('class', 'commit-chart')
    .style('overflow', 'visible');

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`));

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', chartWidth / 2)
    .attr('y', chartHeight - 4)
    .attr('text-anchor', 'middle')
    .text('Commit date');

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -chartHeight / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .text('Time of day');

  svg.append('g').attr('class', 'dots');
  svg.append('g').attr('class', 'brush').call(brushBehavior);
  svg.select('.dots').raise();

  updateScatterPlot(commitData);
}

function updateScatterPlot(commitData) {
  const svg = d3.select('#chart').select('svg');
  const rScale = getRadiusScale(commitData);
  const sortedCommits = d3.sort(commitData, (d) => -d.totalLines);

  xScale.domain(getXDomain(commitData)).nice();

  svg
    .select('.x-axis')
    .transition()
    .duration(250)
    .call(d3.axisBottom(xScale));

  const dots = svg
    .select('g.dots')
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('class', 'commit-dot')
          .attr('cx', (d) => xScale(d.datetime))
          .attr('cy', (d) => yScale(d.hourFrac))
          .attr('r', 0)
          .call(wireDotInteractions),
      (update) => update,
      (exit) => exit.remove(),
    );

  dots
    .transition()
    .duration(250)
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines));

  svg.select('.brush').raise();
  svg.select('.dots').raise();
  d3.selectAll('.commit-dot').classed('selected', (commit) => isCommitSelected(brushSelection, commit));
  renderSelectionCount(brushSelection);
  renderLanguageBreakdown(brushSelection);
}

function getVisibleLines(commitData) {
  return commitData.flatMap((commit) => commit.lines);
}

function updateFileDisplay(commitData) {
  const files = d3
    .groups(getVisibleLines(commitData), (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.select('dt').append('small');
          div.append('dd');
        }),
      (update) => update,
      (exit) => exit.remove(),
    );

  filesContainer.select('dt > code').text((d) => d.name);
  filesContainer
    .select('dt > small')
    .text((d) => `${d3.format(',')(d.lines.length)} lines`);

  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines, (line) => `${line.commit}-${line.file}-${line.line}`)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color:${languageColors(d.type)}`)
    .attr('title', (d) => `${d.type} line ${d.line} in ${d.file}`);
}

function updateMetaView() {
  filteredCommits = commits.filter((commit) => commit.datetime <= commitMaxTime);
  const visibleLines = getVisibleLines(filteredCommits);

  renderCommitInfo(visibleLines, filteredCommits);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

function onTimeSliderChange({ syncSlider = false } = {}) {
  commitProgress = Number(commitProgressInput.value);
  commitMaxTime = timeScale.invert(commitProgress);
  commitTime.dateTime = commitMaxTime.toISOString();
  commitTime.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  if (syncSlider) {
    commitProgressInput.value = commitProgress;
  }

  updateMetaView();
}

function renderStory() {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits, (d) => d.id)
    .join('div')
    .attr('class', 'step')
    .attr('data-commit-index', (d, i) => i)
    .html((d, i) => {
      const fileCount = d3.rollups(d.lines, (lines) => lines.length, (line) => line.file).length;
      return `
        <p class="step-kicker">Commit ${i + 1} of ${commits.length}</p>
        <p>
          On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
          I made <a href="${d.url}" target="_blank" rel="noopener noreferrer">${
            i > 0 ? 'another commit' : 'my first commit'
          }</a>.
        </p>
        <p>I edited ${d3.format(',')(d.totalLines)} lines across ${fileCount} files.</p>
      `;
    });
}

function onStepEnter(response) {
  const storyIndex = Number(response.element.dataset.commitIndex);
  const commit = commits[storyIndex];
  if (!commit) return;
  if (storyIndex === currentStoryIndex) return;

  currentStoryIndex = storyIndex;

  commitProgress = timeScale(commit.datetime);
  commitProgressInput.value = commitProgress;
  commitMaxTime = commit.datetime;
  commitTime.dateTime = commitMaxTime.toISOString();
  commitTime.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  updateMetaView();

  d3.selectAll('.step').classed('active', false);
  d3.select(response.element).classed('active', true);
}

function updateStoryFromScroll() {
  const steps = [...document.querySelectorAll('#scatter-story .step')];
  const triggerY = window.innerHeight * 0.55;
  const activeStep = steps.find((step) => {
    const rect = step.getBoundingClientRect();
    return rect.top <= triggerY && rect.bottom >= triggerY;
  });

  if (activeStep && !activeStep.classList.contains('active')) {
    onStepEnter({ element: activeStep });
  }
}

function setupScrollytelling() {
  const scroller = scrollama();
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry) {
        onStepEnter({ element: visibleEntry.target });
      }
    },
    {
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0, 0.5, 1],
    },
  );

  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.55,
    })
    .onStepEnter(onStepEnter);

  document.querySelectorAll('#scatter-story .step').forEach((step) => observer.observe(step));
  window.addEventListener('scroll', updateStoryFromScroll, { passive: true });
  window.addEventListener('resize', () => {
    scroller.resize();
    updateStoryFromScroll();
  });
  window.setInterval(updateStoryFromScroll, 250);
  updateStoryFromScroll();
}

try {
  data = await loadData();
  commits = processCommits(data);
  filteredCommits = commits;
  timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);
  commitMaxTime = timeScale.invert(commitProgress);

  renderStory();
  renderScatterPlot(filteredCommits);
  onTimeSliderChange({ syncSlider: true });
  commitProgressInput.addEventListener('input', () => onTimeSliderChange());
  setupScrollytelling();
} catch (error) {
  d3.select('#stats').html(`<p class="error-message">Unable to load code metadata: ${error.message}</p>`);
}

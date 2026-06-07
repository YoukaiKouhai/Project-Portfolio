import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const repoCommitUrl = 'https://github.com/YoukaiKouhai/Project-Portfolio/commit/';

let commits = [];
let xScale;
let yScale;

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

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
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
        totalLines: lines.length,
      };

      Object.defineProperty(commitInfo, 'lines', {
        value: lines,
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

function renderCommitInfo(data, commitData) {
  const fileLengths = d3.rollups(
    data,
    (lines) => d3.max(lines, (line) => line.line),
    (line) => line.file,
  );
  const longestFile = d3.greatest(fileLengths, (file) => file[1]);
  const workByPeriod = d3.rollups(
    data,
    (lines) => lines.length,
    (line) => getTimePeriod(line.datetime),
  );
  const workByDay = d3.rollups(
    data,
    (lines) => lines.length,
    (line) => line.datetime.toLocaleDateString('en', { weekday: 'long' }),
  );

  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');
  addStat(dl, 'Total <abbr title="Lines of code">LOC</abbr>', d3.format(',')(data.length));
  addStat(dl, 'Total commits', d3.format(',')(commitData.length));
  addStat(dl, 'Files', d3.format(',')(d3.group(data, (d) => d.file).size));
  addStat(dl, 'Average line length', `${d3.format('.1f')(d3.mean(data, (d) => d.length))} chars`);
  addStat(dl, 'Maximum depth', d3.max(data, (d) => d.depth));
  addStat(dl, 'Longest file', `${longestFile?.[0] || 'Unknown'} (${d3.format(',')(longestFile?.[1] || 0)} lines)`);
  addStat(dl, 'Average file length', `${d3.format('.1f')(d3.mean(fileLengths, (d) => d[1]))} lines`);
  addStat(dl, 'Most active time', d3.greatest(workByPeriod, (d) => d[1])?.[0] || 'Unknown');
  addStat(dl, 'Most active day', d3.greatest(workByDay, (d) => d[1])?.[0] || 'Unknown');
}

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id.slice(0, 7);
  date.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
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
  return selection ? commits.filter((commit) => isCommitSelected(selection, commit)) : [];
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
  const selection = event.selection;

  d3.selectAll('.commit-dot').classed('selected', (commit) => isCommitSelected(selection, commit));
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderScatterPlot(commitData) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 45, left: 60 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  const dateExtent = d3.extent(commitData, (d) => d.datetime);
  const [minLines, maxLines] = d3.extent(commitData, (d) => d.totalLines);

  xScale = d3
    .scaleTime()
    .domain(dateExtent[0].getTime() === dateExtent[1].getTime()
      ? [d3.timeDay.offset(dateExtent[0], -1), d3.timeDay.offset(dateExtent[0], 1)]
      : dateExtent)
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  const rScale = d3
    .scaleSqrt()
    .domain(minLines === maxLines ? [0, maxLines] : [minLines, maxLines])
    .range([3, 24]);

  const svg = d3
    .select('#chart')
    .html('')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
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
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`),
    );

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height - 4)
    .attr('text-anchor', 'middle')
    .text('Commit date');

  svg
    .append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .text('Time of day');

  const dots = svg.append('g').attr('class', 'dots');
  const sortedCommits = d3.sort(commitData, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('class', 'commit-dot')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
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

  svg.call(
    d3
      .brush()
      .extent([
        [usableArea.left, usableArea.top],
        [usableArea.right, usableArea.bottom],
      ])
      .on('start brush end', brushed),
  );
  svg.selectAll('.dots, .overlay ~ *').raise();
}

try {
  const data = await loadData();
  commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
} catch (error) {
  d3.select('#stats').html(`<p class="error-message">Unable to load code metadata: ${error.message}</p>`);
}

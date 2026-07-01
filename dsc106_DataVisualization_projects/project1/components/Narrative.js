import { renderStoryChart } from './charts.js';

export function setupNarrative(products) {
  const steps = Array.from(document.querySelectorAll('.step'));
  const title = document.querySelector('#story-chart-title');
  const status = document.querySelector('#story-status');

  function activate(step) {
    steps.forEach((item) => item.classList.toggle('is-active', item === step));
    const key = step.dataset.step;
    renderStoryChart('#story-chart', products, key);
    title.textContent = {
      overview: 'Store-level processing and price',
      processing: 'NOVA class 4 drives the shelf difference',
      price: 'Whole Foods is the price outlier',
      nutrition: 'Health is a multi-variable question'
    }[key];
    status.textContent = `${steps.indexOf(step) + 1} of ${steps.length}`;
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) activate(visible.target);
  }, { threshold: [0.35, 0.55, 0.75] });

  steps.forEach((step) => observer.observe(step));
  activate(steps[0]);
}

export function setupProgress() {
  const bar = document.querySelector('#read-progress-bar');
  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

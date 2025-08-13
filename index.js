import { fetchJSON, renderProjects } from './global.js';

(async function loadLatestProjects() {
  try {
    // Fetch all projects data
    const projects = await fetchJSON('./lib/projects.json');

    // Take only the first three projects
    const latestProjects = projects.slice(0, 3);

    // Find the container on the home page
    const projectsContainer = document.querySelector('.projects');

    if (!projectsContainer) {
      console.error('No container with class "projects" found on the home page.');
      return;
    }

    // Render the latest projects inside the container
    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
})();

import { fetchGitHubData } from './global.js';  // make sure you import it

(async function loadGitHubStats() {
  try {
    const githubData = await fetchGitHubData('YoukaiKouhai');

    const profileStats = document.querySelector('#profile-stats');

    if (profileStats && githubData) {
      profileStats.innerHTML = `
        <h2>GitHub Profile Stats</h2>
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
      `;
    }
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
})();

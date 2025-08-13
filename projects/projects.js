// Import functions from global.js
import { fetchJSON, renderProjects } from '../global.js';

// Immediately-invoked async function to load projects
(async function loadProjects() {
  try {
    // 1. Fetch the project data from the JSON file
    const projects = await fetchJSON('../lib/projects.json');

    // 2. Select the container for the projects
    const projectsContainer = document.querySelector('.projects');

    // Safety check: if no container is found
    if (!projectsContainer) {
      console.error('No container with class "projects" found in HTML.');
      return;
    }

    // 3. Render the projects
    if (projects && projects.length > 0) {
      renderProjects(projects, projectsContainer, 'h2');
    } else {
      // Optional: Display placeholder if no projects are found
      projectsContainer.innerHTML = '<p>No projects available at this time.</p>';
    }

  } catch (error) {
    console.error('Error loading projects:', error);
  }
})();

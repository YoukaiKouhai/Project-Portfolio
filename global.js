function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('colorScheme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // The current tab may block storage; the visible theme can still update.
  }
}

const savedTheme = getSavedTheme();
document.documentElement.dataset.theme = savedTheme;

// Theme switcher functionality
function setupThemeSwitcher() {
  // Insert the color scheme switcher at the top right of the body
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select id="colorSchemeSelect">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );

  const select = document.getElementById('colorSchemeSelect');

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    select.value = theme;
    saveTheme(theme);
  }

  // Listen for changes
  select.addEventListener('change', (event) => {
    setTheme(event.target.value);
  });

  setTheme(savedTheme);
}

// Helper function
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Navigation functionality
function setupNavigation() {
  const pages = [
    { url: '', title: 'Home' },
    { url: 'CV/', title: 'CV' },
    { url: 'projects/', title: 'Projects' },
    { url: 'meta/', title: 'Meta' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/YoukaiKouhai', title: 'GitHub' }
  ];

  // Detect environment
  const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/" 
    : "/Project-Portfolio/";

  // Create nav element
  const nav = document.createElement('nav');
  
  // Build menu
  pages.forEach(p => {
    const a = document.createElement('a');
    a.href = p.url.startsWith('http') ? p.url : BASE_PATH + p.url;
    a.textContent = p.title;
    
    // Highlight current page
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
    
    // Open external links in new tab
    if (a.host !== location.host) {
      a.target = "_blank";
      a.rel = "noopener noreferrer"; // Security best practice
    }
    
    nav.append(a);
  });

  // Insert nav based on page
  const isHomePage = location.pathname === BASE_PATH || 
                     location.pathname === BASE_PATH + "index.html";
  
  if (isHomePage) {
    const h1 = document.querySelector("h1");
    h1 ? h1.insertAdjacentElement("afterend", nav) : document.body.prepend(nav);
  } else {
    document.body.prepend(nav);
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('IT`S ALIVE!');
  setupThemeSwitcher();
  setupNavigation();
});

// Async function to fetch JSON data
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    // Optional: log the response to inspect in DevTools
    console.log(response);

    // Parse and return the JSON data
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    // Validate containerElement
    if (!(containerElement instanceof HTMLElement)) {
        console.error('renderProjects: Invalid container element.');
        return;
    }

    // Validate heading level
    const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadings.includes(headingLevel)) {
        console.warn(`Invalid heading level "${headingLevel}". Defaulting to "h2".`);
        headingLevel = 'h2';
    }

    // Clear previous content
    containerElement.innerHTML = '';

    // Check if projects data is valid
    if (!Array.isArray(projects) || projects.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.textContent = 'No projects available at the moment.';
        containerElement.appendChild(placeholder);
        return;
    }

    const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "/"
        : "/Project-Portfolio/";

    function resolveProjectUrl(url) {
        if (!url) {
            return '';
        }

        return url.startsWith('http') || url.startsWith('/')
            ? url
            : BASE_PATH + url;
    }

    // Loop through projects and create article elements
    projects.forEach(project => {
        const article = document.createElement('article');
        const projectUrl = resolveProjectUrl(project.url);

        // Create heading
        const heading = document.createElement(headingLevel);
        if (projectUrl) {
            const headingLink = document.createElement('a');
            headingLink.href = projectUrl;
            headingLink.textContent = project.title || 'Untitled Project';
            heading.appendChild(headingLink);
        } else {
            heading.textContent = project.title || 'Untitled Project';
        }

        // Create image
        const img = document.createElement('img');
        img.src = project.image || 'placeholder.jpg';
        img.alt = project.title || 'Project Image';

        const projectDetails = document.createElement('div');
        projectDetails.className = 'project-details';

        // Create description
        const desc = document.createElement('p');
        desc.textContent = project.description || 'No description available.';

        const year = document.createElement('p');
        year.className = 'project-year';
        year.textContent = project.year ? `Year: ${project.year}` : 'Year: Unknown';

        projectDetails.appendChild(desc);
        projectDetails.appendChild(year);

        if (projectUrl) {
            const link = document.createElement('a');
            link.className = 'project-link';
            link.href = projectUrl;
            link.textContent = 'View project';
            projectDetails.appendChild(link);
        }

        // Append elements to article
        article.appendChild(heading);
        article.appendChild(img);
        article.appendChild(projectDetails);

        // Append article to container
        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}


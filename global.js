// Theme switcher functionality
function setupThemeSwitcher() {
  // Insert the color scheme switcher at the top right of the body
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select id="colorSchemeSelect">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );

  const select = document.getElementById('colorSchemeSelect');

  function setColorScheme(scheme) {
    if (scheme === 'light dark') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.removeProperty('color-scheme');
    } else {
      document.documentElement.setAttribute('data-theme', scheme);
      document.documentElement.style.setProperty('color-scheme', scheme);
    }
    select.value = scheme;
    localStorage.colorScheme = scheme;
  }

  // Initialize theme from localStorage or system preference
  function initTheme() {
    const savedScheme = localStorage.colorScheme || 'light dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // If automatic, use system preference
    if (savedScheme === 'light dark') {
      document.documentElement.style.setProperty(
        'color-scheme', 
        systemPrefersDark ? 'dark' : 'light'
      );
    }
    
    setColorScheme(savedScheme);
  }

  // Listen for changes
  select.addEventListener('input', (event) => {
    setColorScheme(event.target.value);
  });

  // Watch for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.colorScheme === 'light dark') {
      document.documentElement.style.setProperty(
        'color-scheme', 
        e.matches ? 'dark' : 'light'
      );
    }
  });

  initTheme();
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

    // Loop through projects and create article elements
    projects.forEach(project => {
        const article = document.createElement('article');

        // Create heading
        const heading = document.createElement(headingLevel);
        heading.textContent = project.title || 'Untitled Project';

        // Create image
        const img = document.createElement('img');
        img.src = project.image || 'placeholder.jpg';
        img.alt = project.title || 'Project Image';

        // Create description
        const desc = document.createElement('p');
        desc.textContent = project.description || 'No description available.';

        // Append elements to article
        article.appendChild(heading);
        article.appendChild(img);
        article.appendChild(desc);

        // Append article to container
        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}


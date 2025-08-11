document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action^="mailto:"]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();  // stop default submission

    const formData = new FormData(form);
    let params = [];

    for (let [name, value] of formData) {
      // encode value for URL, skip empty fields optionally
      if (value.trim() !== '') {
        params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
      }
    }

    const baseMailto = form.action; // e.g., "mailto:you@example.com"
    const url = `${baseMailto}?${params.join('&')}`;

    // Open mail client with constructed URL
    location.href = url;
  });
});

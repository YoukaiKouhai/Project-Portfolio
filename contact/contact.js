const form = document.querySelector('#contact-form');
const message = form.querySelector('textarea');
const response = document.querySelector('#contact-response');

// Use the native POST: a cross-origin fetch cannot verify Google's response.
// Without JavaScript the same form opens Google's response in a new tab.
form.target = response.querySelector('iframe').name;
message.addEventListener('input', () => message.setCustomValidity(''));
form.addEventListener('submit', (event) => {
  if (!message.value.trim()) {
    event.preventDefault();
    message.setCustomValidity('Please enter a message.');
    message.reportValidity();
    return;
  }
  response.hidden = false;
  document.querySelector('#response-heading').focus();
});

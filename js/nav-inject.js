// nav-inject.js: Injects the shared navigation bar into each page
fetch('nav.html')
  .then(res => res.text())
  .then(html => {
    const navContainer = document.createElement('div');
    navContainer.innerHTML = html;
    document.body.insertBefore(navContainer, document.body.firstChild);
    // Highlight current page
    const links = navContainer.querySelectorAll('a');
    links.forEach(link => {
      if (window.location.pathname.endsWith(link.getAttribute('href'))) {
        link.classList.add('active');
      }
    });
  });

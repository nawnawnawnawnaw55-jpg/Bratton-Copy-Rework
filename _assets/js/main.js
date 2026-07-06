// Fix sticky nav: MutationObserver moves nav out of #site-header to <body>
// This is necessary because position:sticky fails when the nav is nested inside
// a container (#site-header) that has no scrollable overflow room.
(function(){
  var observer = new MutationObserver(function(mutations, obs){
    var nav = document.getElementById('main-nav');
    var sh = document.getElementById('site-header');
    if (nav && sh && nav.parentNode === sh) {
      sh.parentNode.insertBefore(nav, sh.nextSibling);
      obs.disconnect();
    }
  });
  var sh = document.getElementById('site-header');
  if (sh) observer.observe(sh, { childList: true, subtree: true });
})();

// Mobile menu — wait for #menu-toggle to appear (header loads via fetch, so
// there's a race condition). Using MutationObserver ensures we attach after
// the header template is injected, regardless of load order.
(function(){
  var initialized = false;
  var navEl = null;
  var toggleEl = null;
  var overlay = null;
  var closeBtn = null;

  function setupMenu() {
    if (initialized) return;
    toggleEl = document.getElementById('menu-toggle');
    navEl = document.getElementById('main-nav');
    if (!toggleEl || !navEl) return;

    initialized = true;

    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    // Inject close button into the nav panel
    closeBtn = document.createElement('button');
    closeBtn.className = 'nav__close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close menu');
    navEl.insertBefore(closeBtn, navEl.firstChild);

    // Remove any bare toggle listeners added by inline scripts by cloning
    var newToggle = toggleEl.cloneNode(true);
    toggleEl.parentNode.replaceChild(newToggle, toggleEl);
    toggleEl = newToggle;
    toggleEl.id = 'menu-toggle';

    function open() {
      navEl.classList.add('nav--open');
      overlay.classList.add('menu-overlay--visible');
      toggleEl.classList.add('mobile-menu-btn--open');
      toggleEl.innerHTML = '&times;';
      document.body.style.overflow = 'hidden';
    }

    function close() {
      navEl.classList.remove('nav--open');
      overlay.classList.remove('menu-overlay--visible');
      toggleEl.classList.remove('mobile-menu-btn--open');
      toggleEl.innerHTML = '&#x2630;';
      document.body.style.overflow = '';
    }

    toggleEl.addEventListener('click', function(e) {
      e.stopImmediatePropagation();
      navEl.classList.contains('nav--open') ? close() : open();
    });

    closeBtn.addEventListener('click', function(e) {
      e.stopImmediatePropagation();
      close();
    });

    overlay.addEventListener('click', close);

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navEl.classList.contains('nav--open')) close();
    });

    // Dropdown toggles on mobile
    document.querySelectorAll('.nav__dropdown > .nav__link').forEach(function(link){
      link.addEventListener('click', function(e){
        if (window.innerWidth < 768){
          e.preventDefault();
          this.parentElement.classList.toggle('open');
        }
      });
    });
  }

  // Try immediately (in case header loaded before main.js)
  setupMenu();

  // If not ready, watch for the menu-toggle to appear
  if (!initialized) {
    var siteHeader = document.getElementById('site-header');
    if (siteHeader) {
      var obs2 = new MutationObserver(function() {
        setupMenu();
        if (initialized) obs2.disconnect();
      });
      obs2.observe(siteHeader, { childList: true, subtree: true });
    }
    // Fallback: watch the whole document
    var bodyObs = new MutationObserver(function() {
      setupMenu();
      if (initialized) bodyObs.disconnect();
    });
    bodyObs.observe(document.documentElement, { childList: true, subtree: true });

    // Safety timeout: stop observing after 5 seconds
    setTimeout(function() {
      obs2.disconnect && obs2.disconnect();
      bodyObs.disconnect();
    }, 5000);
  }

  // ===== Scroll-aware header show/hide (mobile only) =====
  var lastScrollY = window.scrollY;
  var ticking = false;
  var HIDE_THRESHOLD = 80;

  function onScroll() {
    var siteHeader = document.getElementById('site-header');
    var mainNav = document.getElementById('main-nav');
    if (!siteHeader || !mainNav) return;
    var currentScrollY = window.scrollY;
    var isMobile = window.innerWidth < 768;

    if (!isMobile) {
      if (siteHeader.classList.contains('site-header--hidden')) {
        siteHeader.classList.remove('site-header--hidden');
        mainNav.classList.remove('site-header--hidden');
      }
      lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY > HIDE_THRESHOLD) {
      if (currentScrollY > lastScrollY) {
        siteHeader.classList.add('site-header--hidden');
        mainNav.classList.add('site-header--hidden');
      } else if (currentScrollY < lastScrollY) {
        siteHeader.classList.remove('site-header--hidden');
        mainNav.classList.remove('site-header--hidden');
      }
    } else {
      siteHeader.classList.remove('site-header--hidden');
      mainNav.classList.remove('site-header--hidden');
    }

    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(onScroll, 100);
  });
})();

// ===== Angular Parallax Scroll Driver =====
// Drives multi-speed scrolling on overlapping cluster items and bg shapes
(function(){
  var clusterEl = document.getElementById('angular-scroll-cluster');
  var sectionEl = clusterEl ? clusterEl.closest('.angular-parallax-section') : null;
  if (!clusterEl || !sectionEl) return;

  var items = clusterEl.querySelectorAll('.angular-scroll-item[data-parallax-speed]');
  var bgShapes = sectionEl.querySelectorAll('.angular-parallax-bg-shape[data-parallax-speed]');
  var ticking = false;

  function updateParallax() {
    var sectionRect = sectionEl.getBoundingClientRect();
    var windowH = window.innerHeight;

    // Only drive when section is in viewport
    if (sectionRect.bottom < -100 || sectionRect.top > windowH + 100) {
      ticking = false;
      return;
    }

    // Calculate scroll progress through the section (0 = top enters, 1 = bottom exits)
    var scrollOffset = windowH - sectionRect.top;
    var sectionHeight = sectionRect.height + windowH;
    var progress = Math.max(0, Math.min(1, scrollOffset / sectionHeight));

    // Map progress for each item using its speed factor
    var baseTranslate = (progress - 0.5) * 60; // max ±30px base translation

    items.forEach(function(item) {
      var speed = parseFloat(item.getAttribute('data-parallax-speed')) || 1;
      var yOff = baseTranslate * speed;
      item.style.transform = item.style.transform.replace(/translateY\([^)]*\)/, '') + ' translateY(' + yOff.toFixed(1) + 'px)';
    });

    bgShapes.forEach(function(shape) {
      var speed = parseFloat(shape.getAttribute('data-parallax-speed')) || 1;
      var yOff = baseTranslate * speed;
      shape.style.transform = shape.style.transform.replace(/translateY\([^)]*\)/, '') + ' translateY(' + yOff.toFixed(1) + 'px)';
    });

    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  // Initial call
  setTimeout(updateParallax, 300);
})();

// ===== Medical Library Video Handler =====
// Replaces placeholder links with Vimeo embeds (same behavior as v2 g5_master.js)
(function(){
  document.addEventListener('click', function(e){
    var link = e.target.closest('.g5-mlvideo-wrapper a');
    if (!link) return;
    var vimeoId = link.getAttribute('title');
    if (!vimeoId) return;
    e.preventDefault();
    var wrapper = link.closest('.g5-mlvideo-wrapper');
    wrapper.innerHTML = '<iframe src="https://player.vimeo.com/video/' + vimeoId + '?title=0&byline=0&portrait=0&autoplay=1" ' +
      'style="width:100%;max-width:640px;aspect-ratio:640/435;border:0" ' +
      'webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
  });
})();

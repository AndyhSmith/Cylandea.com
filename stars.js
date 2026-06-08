// stars.js: subtle starfield + footer year, shared across pages.
(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var c = document.getElementById('stars');
  if (!c) return;

  // Respect users who prefer reduced motion: draw nothing, save battery.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var ctx = c.getContext('2d');
  var w, h, stars = [];
  var COUNT = 160; // keep subtle

  function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }
  addEventListener('resize', resize);
  resize();

  function makeStar() {
    return { x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, s: Math.random() * 1.3 + 0.2, v: Math.random() * 0.3 + 0.1 };
  }
  for (var i = 0; i < COUNT; i++) stars.push(makeStar());

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      p.y += p.v;
      if (p.y > h) { p.x = Math.random() * w; p.y = -10; }
      ctx.globalAlpha = p.z;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fillStyle = '#8bd8ff';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

// Homepage app cards: a filmstrip that eases to the next screenshot now and then.
// Each card runs its own random timer, so they don't all move at once.
(function () {
  var cards = document.querySelectorAll('.app-shot[data-shots]');
  if (!cards.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  cards.forEach(function (card) {
    var shots = shuffle(card.getAttribute('data-shots').split(','));
    card.innerHTML = '';
    var track = document.createElement('div');
    track.className = 'app-track';
    shots.forEach(function (src) {
      var img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      track.appendChild(img);
    });
    card.appendChild(track);
    if (reduce) return;

    var imgs = track.querySelectorAll('img');
    var i = 0, dir = 1;

    // Pad the strip so any screenshot (first/last included) can sit dead center,
    // with its neighbours peeking in on both sides.
    function layout() {
      var iw = imgs[0].getBoundingClientRect().width;
      if (!iw) return false;
      var pad = Math.max(0, (card.clientWidth - iw) / 2);
      track.style.paddingLeft = pad + 'px';
      track.style.paddingRight = pad + 'px';
      return true;
    }
    function targetFor(idx) {
      // Measure with rects so the card's own padding/position never skews centering.
      var cr = card.getBoundingClientRect();
      var ir = imgs[idx].getBoundingClientRect();
      return card.scrollLeft + (ir.left - cr.left) - (card.clientWidth - ir.width) / 2;
    }
    function center(idx) { card.scrollLeft = targetFor(idx); }

    function init() { if (layout()) center(i); }
    if (imgs[0].complete && imgs[0].naturalWidth) init();
    else imgs[0].addEventListener('load', init);
    addEventListener('resize', function () { if (layout()) center(i); });

    if (reduce) return;

    // Glide slowly to a target scroll position over ~3s with a soft ease.
    function glide(to) {
      var from = card.scrollLeft, delta = to - from;
      if (Math.abs(delta) < 1) return;
      var dur = 3000, start = null;
      function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        card.scrollLeft = from + delta * ease(p);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function step() {
      i += dir;
      if (i >= imgs.length) { i = imgs.length - 1; dir = -1; }
      else if (i < 0) { i = 0; dir = 1; }
      glide(targetFor(i));
      schedule();
    }
    function schedule() {
      // Long, staggered pauses between gentle moves, independent per card.
      setTimeout(step, 5000 + Math.random() * 5000);
    }
    schedule();
  });
})();

// App-page gallery: click a partly cut-off screenshot to shift the row that way,
// or swipe/drag sideways. The mouse wheel is left alone so the page scrolls normally.
(function () {
  var galleries = document.querySelectorAll('.gallery');
  if (!galleries.length) return;
  var PEEK = 46; // px of the neighbouring screenshot left visible after a shift

  galleries.forEach(function (g) {
    // Note: no wheel handling on purpose. Vertical wheel should scroll the page,
    // not the screenshots. Use drag/swipe or click the peeking edge to navigate.

    // Drag to pan.
    var down = false, startX = 0, startLeft = 0, moved = 0;
    g.addEventListener('pointerdown', function (e) {
      down = true; moved = 0; startX = e.clientX; startLeft = g.scrollLeft;
      g.classList.add('dragging');
    });
    g.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      g.scrollLeft = startLeft - dx;
    });
    function end() { down = false; g.classList.remove('dragging'); }
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
    g.addEventListener('pointerleave', end);

    // Click the cut-off screenshot on either edge to shift toward it, keeping a peek.
    g.addEventListener('click', function (e) {
      if (moved > 6) return; // that was a drag, not a click
      var fig = e.target.closest('figure');
      if (!fig) return;
      var c = g.getBoundingClientRect(), f = fig.getBoundingClientRect();
      if (f.right > c.right + 1) {
        g.scrollTo({ left: g.scrollLeft + (f.left - c.left) - PEEK, behavior: 'smooth' });
      } else if (f.left < c.left - 1) {
        g.scrollTo({ left: g.scrollLeft + (f.right - c.right) + PEEK, behavior: 'smooth' });
      }
    });
  });
})();

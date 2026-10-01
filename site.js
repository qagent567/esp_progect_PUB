document.documentElement.classList.add('js');
const toggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('navigation');
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('open', open);
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    toggle.focus();
  }
});
window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

// Optional visual effects. The page remains readable when scripting or animation is unavailable.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const progress = document.querySelector('.scroll-progress');
let progressFrame = 0;

function updateProgress() {
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const amount = distance > 0 ? window.scrollY / distance : 0;
  progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
  document.querySelector('.header').classList.toggle('is-scrolled', window.scrollY > 32);
  progressFrame = 0;
}

function scheduleProgress() {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
}

window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress, { passive: true });
updateProgress();

const revealTargets = document.querySelectorAll(
  '.project-brief article, .section-head, .steps article, .greenhouse, .setup-grid > *, ' +
  '.capability-grid article, .sensor-cycle li, .gallery-card, .feature, ' +
  '.scenario-list article, .demo > *, .roadmap article, .faq-items, .closing > *, .portal-card, .visual-panel, .detail-card'
);
let revealObserver;

function configureReveal() {
  if (revealObserver) revealObserver.disconnect();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('motion-ready');
    revealTargets.forEach(element => element.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 40px 0px' });

  revealTargets.forEach(element => {
    element.classList.add('reveal');
    if (!element.classList.contains('is-visible')) revealObserver.observe(element);
  });
  document.documentElement.classList.add('motion-ready');
}

configureReveal();
reducedMotion.addEventListener('change', configureReveal);

const heroArt = document.querySelector('.hero-art');
let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;

function moveHero() {
  heroArt.style.setProperty('--pointer-x', `${pointerX}px`);
  heroArt.style.setProperty('--pointer-y', `${pointerY}px`);
  pointerFrame = 0;
}

heroArt?.addEventListener('pointermove', event => {
  if (!finePointer.matches || reducedMotion.matches) return;
  const bounds = heroArt.getBoundingClientRect();
  pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
  pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 14;
  if (!pointerFrame) pointerFrame = requestAnimationFrame(moveHero);
});

heroArt?.addEventListener('pointerleave', () => {
  pointerX = 0;
  pointerY = 0;
  if (!pointerFrame) pointerFrame = requestAnimationFrame(moveHero);
});

if (finePointer.matches) {
  document.querySelectorAll('.steps article, .capability-grid article, .feature, .gallery-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reducedMotion.matches) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--glow-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--glow-y', `${event.clientY - bounds.top}px`);
    });
  });
}

// A small decorative network behind the hero. Pause it offscreen and for reduced motion.
const hero = document.querySelector('.hero');
const networkCanvas = document.querySelector('.hero-network');
const networkContext = networkCanvas?.getContext('2d');
if (networkContext) {
  let networkWidth = 0;
  let networkHeight = 0;
  let networkNodes = [];
  let networkFrame = 0;
  let networkLastDraw = 0;
  let networkVisible = true;
  let networkPointer = null;

  function resizeNetwork() {
    const bounds = hero.getBoundingClientRect();
    networkWidth = Math.max(1, Math.round(bounds.width));
    networkHeight = Math.max(1, Math.round(bounds.height));
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    networkCanvas.width = Math.round(networkWidth * ratio);
    networkCanvas.height = Math.round(networkHeight * ratio);
    networkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = networkWidth < 650 ? 12 : 23;
    networkNodes = Array.from({length:count}, () => ({
      x:Math.random(), y:Math.random(), phase:Math.random() * Math.PI * 2,
      radius:Math.random() * 1.5 + 1
    }));
  }

  function drawNetwork(time) {
    networkFrame = requestAnimationFrame(drawNetwork);
    if (time - networkLastDraw < 32) return;
    networkLastDraw = time;
    const seconds = time / 1000;
    networkContext.clearRect(0, 0, networkWidth, networkHeight);
    const points = networkNodes.map(node => ({
      x:node.x * networkWidth + Math.sin(seconds * .55 + node.phase) * 14,
      y:node.y * networkHeight + Math.cos(seconds * .42 + node.phase) * 12,
      radius:node.radius
    }));

    points.forEach((point, index) => {
      for (let next = index + 1; next < points.length; next++) {
        const other = points[next];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance > 155) continue;
        networkContext.strokeStyle = `rgba(155,244,188,${(1 - distance / 155) * .23})`;
        networkContext.lineWidth = .8;
        networkContext.beginPath();
        networkContext.moveTo(point.x, point.y);
        networkContext.lineTo(other.x, other.y);
        networkContext.stroke();
      }
      networkContext.fillStyle = 'rgba(194,255,191,.57)';
      networkContext.beginPath();
      networkContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      networkContext.fill();
    });

    if (networkPointer) {
      const glow = networkContext.createRadialGradient(networkPointer.x,networkPointer.y,0,networkPointer.x,networkPointer.y,140);
      glow.addColorStop(0,'rgba(188,242,132,.11)');
      glow.addColorStop(1,'rgba(188,242,132,0)');
      networkContext.fillStyle = glow;
      networkContext.fillRect(networkPointer.x - 140,networkPointer.y - 140,280,280);
    }
  }

  function updateNetwork() {
    const shouldRun = networkVisible && !reducedMotion.matches && !document.hidden;
    if (shouldRun && !networkFrame) networkFrame = requestAnimationFrame(drawNetwork);
    if (!shouldRun && networkFrame) {
      cancelAnimationFrame(networkFrame);
      networkFrame = 0;
      networkContext.clearRect(0,0,networkWidth,networkHeight);
    }
  }

  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const bounds = hero.getBoundingClientRect();
    networkPointer = {x:event.clientX - bounds.left,y:event.clientY - bounds.top};
  });
  hero.addEventListener('pointerleave', () => { networkPointer = null; });
  reducedMotion.addEventListener('change', updateNetwork);
  document.addEventListener('visibilitychange', updateNetwork);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      networkVisible = entries[0].isIntersecting;
      updateNetwork();
    }, {threshold:.01}).observe(hero);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resizeNetwork).observe(hero);
  else window.addEventListener('resize',resizeNetwork,{passive:true});
  resizeNetwork();
  updateNetwork();
}

// Images remain ordinary links when dialog support or JavaScript is unavailable.
const imageDialog = document.querySelector('.image-dialog');
let imageTrigger = null;
if (imageDialog && typeof imageDialog.showModal === 'function') {
  document.querySelectorAll('.gallery-image').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      imageTrigger = link;
      const source = link.querySelector('img');
      const enlarged = imageDialog.querySelector('img');
      enlarged.src = link.href;
      enlarged.alt = source.alt;
      imageDialog.querySelector('figcaption').textContent = link.closest('figure').querySelector('figcaption strong').textContent;
      imageDialog.showModal();
      document.body.classList.add('lightbox-open');
      imageDialog.querySelector('.image-dialog-close').focus();
    });
  });
  imageDialog.querySelector('.image-dialog-close').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', event => {
    if (event.target === imageDialog) imageDialog.close();
  });
  imageDialog.addEventListener('close', () => {
    document.body.classList.remove('lightbox-open');
    if (imageTrigger) imageTrigger.focus({preventScroll:true});
  });
}

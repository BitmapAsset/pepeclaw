// ========== SCROLL ANIMATIONS ==========
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.anim').forEach((el) => observer.observe(el));

// ========== PARALLAX ON HERO ==========
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const heroImg = document.querySelector('.hero-img');
      if (heroImg && scrollY < window.innerHeight) {
        heroImg.style.transform = `scale(1.05) translateY(${scrollY * 0.3}px)`;
      }
      ticking = false;
    });
    ticking = true;
  }
});

// ========== COPY COMMAND ==========
function copyCmd(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.closest('.install-snippet, .code-block').querySelector('.copy-text');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }
  });
}

// ========== TABS ==========
function switchTab(index) {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach((t, i) => t.classList.toggle('active', i === index));
  panels.forEach((p, i) => p.classList.toggle('active', i === index));
}

// ========== NOTIFY FORM ==========
function handleNotify(e) {
  e.preventDefault();
  const success = document.getElementById('notify-success');
  if (success) {
    success.classList.add('show');
    e.target.querySelector('input').value = '';
  }
}

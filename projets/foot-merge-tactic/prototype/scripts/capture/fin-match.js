new Promise((r) => {
  const t0 = Date.now();
  const clic = (e) => e && e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const iv = setInterval(() => {
    const b = document.querySelector('.match-panneau .match-jouer');
    if (b && b.textContent.includes('2e mi-temps')) clic(b);
    if (b && b.textContent.includes('Continuer')) { clearInterval(iv); clic(b); setTimeout(() => r('continuer ' + (Date.now() - t0)), 1500); }
    if (Date.now() - t0 > 320000) { clearInterval(iv); r('délai'); }
  }, 500);
})

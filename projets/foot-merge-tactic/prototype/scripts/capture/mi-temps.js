new Promise((r) => {
  document.querySelector('.partie-jouer-mini').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  setTimeout(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes("Coup d'"));
    b && b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const t0 = Date.now();
    const iv = setInterval(() => {
      const c = document.querySelector('.match-changements');
      if (c || Date.now() - t0 > 100000) { clearInterval(iv); r(c ? 'mi-temps ' + (Date.now() - t0) : 'pas de mi-temps'); }
    }, 500);
  }, 800);
})

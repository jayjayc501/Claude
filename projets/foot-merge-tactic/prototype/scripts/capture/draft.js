(async () => {
  const z = (ms) => new Promise((r) => setTimeout(r, ms));
  const clic = (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const log = [];
  // 15/11 : premier écran, choix du mode : on lance le championnat.
  const accueil = document.querySelector(".accueil-bouton");
  if (accueil) { clic(accueil); await z(500); }
  for (let i = 0; i < 11; i++) {
    const c = document.querySelector(".prepa-case.draft-libre");
    if (!c) { log.push("plus de case"); break; }
    clic(c); await z(500);
    const cartes = [...document.querySelectorAll(".offre-carte:not(.cher)")];
    if (!cartes.length) { log.push("aucune carte abordable"); break; }
    clic(cartes[i % cartes.length]); await z(900);
  }
  log.push("budget " + document.querySelector(".prepa-budget, .draft-budget")?.textContent);
  log.push("ordi " + document.querySelector(".draft-ordi-tete")?.textContent);
  return log.join(" | ");
})()

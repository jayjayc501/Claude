(async () => {
  const z = (ms) => new Promise((r) => setTimeout(r, ms));
  // Achète une copie (fusion) si le mercato en propose une, via la fiche.
  const f = document.querySelector(".prepa-carte.fusion");
  if (!f) return "pas de copie";
  f.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
  f.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
  f.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await z(600);
  const b = document.querySelector(".fiche-action:not(.impossible)");
  if (!b) return "pas de bouton";
  b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await z(500);
  return "fusion achetée";
})()

// Générateur aléatoire à graine (mulberry32) : le même nombre de départ
// donne toujours la même suite, donc le même match.

export class Aleatoire {
  private etat: number;

  constructor(graine: number) {
    this.etat = graine >>> 0;
  }

  /** Nombre entre 0 (inclus) et 1 (exclu). */
  suivant(): number {
    this.etat = (this.etat + 0x6d2b79f5) >>> 0;
    let t = this.etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  entre(min: number, max: number): number {
    return min + (max - min) * this.suivant();
  }

  entier(maxExclu: number): number {
    return Math.floor(this.suivant() * maxExclu);
  }
}

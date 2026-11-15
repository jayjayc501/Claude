// 1 contre 1 en ligne (15/11, concepteur : « Créer une partie » donne un lien à
// envoyer sur WhatsApp ; l'ami l'ouvre dans son navigateur, sans compte ; chacun a
// 10 minutes pour faire son équipe ; le match est calculé sur le serveur et on le
// regarde tous les deux en même temps, mi-temps comprise).
//
// Ce fichier relie l'écran d'attente, l'écran de préparation (draft, mercato,
// équipe automatique, chrono, « Prêt ») et l'écran du match (films du serveur, lus
// à l'heure du serveur). Le téléphone demande l'état de la partie toutes les 1,5 s.

import { ArbitreEnLigne, ClientEnLigne, jetons, lienPartie } from "../enligne/client";
import { type ChoixEquipe, equipeDepuisChoix } from "../enligne/equipes";
import type { VuePartie } from "../enligne/serveur";
import { GrainesLocales } from "../jeu/graines";
import { Partie, REGLES } from "../jeu/partie";
import { chargerInfluences } from "../sim/influences";
import type { Donnees } from "../sim/donnees";
import type { Equipe, Reglages } from "../sim/types";
import { ouvrirCaseDraft } from "./draft";
import { EcranMatch, type HabillageMatch } from "./ecranMatch";
import { type ControlePartie, EcranPreparation } from "./ecranPreparation";
import { EcranSalon } from "./ecranSalon";
import { type DonneesPrepa, type Fiche, Preparation, donneesPrepa } from "./preparation";

/** Ce que le reste de la page fournit (données du jeu, zone d'affichage, retour à l'accueil). */
export interface Socle {
  donnees: Donnees;
  reglages: Reglages;
  contenu: HTMLElement;
  planOrdi: { poste: string; cellule: number }[];
  deck: DonneesPrepa["deck"];
  fiches: Record<string, Fiche>;
  couleurs: Record<string, string>;
  accueil(): void;
}

const EN_LIGNE = REGLES.enLigne;
/** Le match s'ouvre un peu avant le coup d'envoi : le bandeau des bonus a le temps de passer. */
const OUVERTURE_AVANT_MS = 4500;
/** À la fin d'un chrono, le téléphone envoie ce qu'il a (équipe, changements) un peu avant. */
const ENVOI_AVANT_MS = 2500;

const minutes = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Identifiant de partie dans un lien ou un code collé. */
export function idDepuis(lienOuCode: string): string | null {
  const m = /#p=([a-z0-9]+)/i.exec(lienOuCode) ?? /^\s*([a-z0-9]{6,12})\s*$/i.exec(lienOuCode);
  return m ? m[1]!.toLowerCase() : null;
}

export class UnContreUn {
  private readonly client = new ClientEnLigne();
  private readonly salon = new EcranSalon();
  private id = "";
  private jeton = "";
  private vue: VuePartie | null = null;
  private actif = false;
  private minuteurSondage: number | undefined;
  private minuteurTic: number | undefined;
  private ecran: "salon" | "prepa" | "match" = "salon";
  private cleSalon = "";

  // Équipe (draft local, avec la graine de draft donnée par le serveur).
  private partie: Partie | null = null;
  private prepa!: Preparation;
  private preparation!: EcranPreparation;
  private offres = new Map<string, string[]>();
  private autoN = 0;
  private equipeEnvoyee = false;
  private envoiEnCours = false;

  // Match.
  private readonly arbitre = new ArbitreEnLigne();
  private match: EcranMatch | null = null;
  private telechargement: [boolean, boolean] = [false, false];
  private equipesAffichees: [Equipe, Equipe] | null = null;
  private choixAffiches: [ChoixEquipe, ChoixEquipe] | null = null;
  private miTemps = false;
  private miTempsSynchro = false;
  private miTempsEnvoye = false;
  private secondeLancee = false;

  constructor(private readonly s: Socle) {}

  // ---- Entrée --------------------------------------------------------------

  async creer(): Promise<void> {
    this.reinitialiser();
    this.montrerSalon({ titre: "Nouvelle partie", attente: "Création de la partie…" });
    const r = await this.client.demander({ action: "creer" });
    if (!r.ok || !r.partie || !r.jeton) return this.echec(r.erreur ?? "Le serveur ne répond pas.");
    this.entrer(r.partie, r.jeton);
  }

  async rejoindre(id: string): Promise<void> {
    this.reinitialiser();
    this.montrerSalon({ titre: "1 contre 1", attente: "Connexion à la partie…" });
    const r = await this.client.demander({ action: "rejoindre", id, jeton: jetons.lire(id) ?? undefined });
    if (!r.ok || !r.partie || !r.jeton) return this.echec(r.erreur ?? "Le serveur ne répond pas.");
    this.entrer(r.partie, r.jeton);
  }

  /** Quitte la partie (retour à l'accueil). Le serveur la mène quand même à son terme. */
  quitter(): void {
    this.actif = false;
    window.clearTimeout(this.minuteurSondage);
    window.clearInterval(this.minuteurTic);
    this.match?.fermer();
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      // sans historique : sans conséquence
    }
  }

  private reinitialiser(): void {
    this.quitter();
    this.vue = null;
    this.partie = null;
    this.offres = new Map();
    this.equipeEnvoyee = false;
    this.envoiEnCours = false;
    this.match = null;
    this.arbitre.mt1 = null;
    this.arbitre.mt2 = null;
    this.telechargement = [false, false];
    this.equipesAffichees = null;
    this.choixAffiches = null;
    this.miTemps = false;
    this.miTempsSynchro = false;
    this.miTempsEnvoye = false;
    this.secondeLancee = false;
    this.cleSalon = "";
  }

  private entrer(v: VuePartie, jeton: string): void {
    this.id = v.id;
    this.jeton = jeton;
    jetons.ecrire(v.id, jeton);
    try {
      history.replaceState(null, "", `${location.pathname}${location.search}#p=${v.id}`);
    } catch {
      // sans historique : le lien reste celui de la page
    }
    this.actif = true;
    this.recevoir(v);
    if (v.etat === "equipes") this.signalerArrivee();
    const sonder = async () => {
      if (!this.actif) return;
      const r = await this.client.demander({ action: "etat", id: this.id, jeton: this.jeton });
      if (!this.actif) return;
      if (r.ok && r.partie) this.recevoir(r.partie);
      else if (r.erreur && !r.erreur.startsWith("Pas de connexion")) return this.echec(r.erreur);
      this.minuteurSondage = window.setTimeout(sonder, EN_LIGNE.sondageMs);
    };
    this.minuteurSondage = window.setTimeout(sonder, EN_LIGNE.sondageMs);
    this.minuteurTic = window.setInterval(() => this.tic(), 250);
  }

  private recevoir(v: VuePartie): void {
    const avant = this.vue?.etat;
    this.vue = v;
    if (v.equipePrete[0]) this.equipeEnvoyee = true;
    if (v.miTempsPret[0]) this.miTempsEnvoye = true;
    if (avant === "attente" && v.etat === "equipes") this.signalerArrivee();
    this.tic();
  }

  private signalerArrivee(): void {
    this.construirePreparation();
    this.montrerPrepa();
    this.preparation.signaler(`${this.vue!.camp === 0 ? "Ton ami est là ! " : ""}Tu as 10 minutes pour faire ton équipe, puis appuie sur « Prêt ».`);
  }

  private echec(texte: string): void {
    this.quitter();
    this.montrerSalon({ titre: "1 contre 1", texte, erreur: true, boutons: [{ texte: "Retour à l'accueil", action: () => this.s.accueil() }] });
  }

  // ---- Ce qui dépend de l'heure (4 fois par seconde) -----------------------

  private tic(): void {
    const v = this.vue;
    if (!this.actif || !v) return;
    const t = this.client.maintenant();
    switch (v.etat) {
      case "attente":
        return this.montrerSalon({
          titre: "Ta partie est prête",
          texte: "Envoie ce lien à ton ami. Il l'ouvre dans son navigateur, sans compte ; dès qu'il arrive, vous avez 10 minutes chacun pour faire votre équipe.",
          lien: lienPartie(v.id),
          attente: "En attente de ton ami…",
          boutons: [{ texte: "Annuler", secondaire: true, action: () => this.s.accueil() }],
        });
      case "equipes": {
        const reste = (v.finEquipes ?? t) - t;
        if (!this.equipeEnvoyee) {
          if (!this.partie) this.construirePreparation();
          if (this.ecran !== "prepa") this.montrerPrepa();
          this.preparation.majChrono();
          if (reste <= ENVOI_AVANT_MS && !this.envoiEnCours) void this.envoyerEquipe(true);
          return;
        }
        this.montrerSalon({ titre: "Équipe envoyée ✓", texte: v.equipePrete[1] ? "Ton ami est prêt aussi." : "Ton ami fait encore son équipe. Le match commence dès qu'il est prêt, ou à la fin des 10 minutes.", attente: "…" });
        return this.salon.majAttente(v.equipePrete[1] ? "Calcul du match…" : `Temps restant : ${minutes(reste)}`);
      }
      case "calcul1":
        return this.montrerSalon({ titre: "Coup d'envoi bientôt", texte: "Le serveur calcule la 1re mi-temps.", attente: "Calcul du match…" });
      default:
        return this.ticMatch(v, t);
    }
  }

  private ticMatch(v: VuePartie, t: number): void {
    if (v.films.mt1 && !this.arbitre.mt1) {
      this.telecharger(1, v);
      if (this.ecran !== "match") this.montrerSalon({ titre: "Coup d'envoi bientôt", texte: this.texteAuto(v), attente: "Téléchargement du match…" });
      return;
    }
    if (!this.arbitre.mt1) return;
    if (!this.match) {
      if (v.etat === "fini") return this.montrerFin(v);
      if (t < v.debutMt1! - OUVERTURE_AVANT_MS) {
        this.montrerSalon({ titre: "Coup d'envoi bientôt", texte: this.texteAuto(v), attente: "…" });
        return this.salon.majAttente(`Coup d'envoi dans ${Math.ceil((v.debutMt1! - t) / 1000)} s`);
      }
      this.ouvrirMatch(v);
    }
    const m = this.match!;
    // Mi-temps : sans réponse avant la fin du temps, on envoie l'équipe telle qu'elle est.
    if (v.etat === "mt1" && m.aLaMiTemps && !this.miTempsEnvoye && v.finMiTemps !== null && v.finMiTemps - t <= ENVOI_AVANT_MS && !this.envoiEnCours) void this.envoyerMiTemps();
    if (this.miTemps && this.ecran === "prepa") this.preparation.majChrono();
    // 2e mi-temps : film reçu, reprise à l'heure du serveur.
    if (v.films.mt2 && !this.arbitre.mt2) this.telecharger(2, v);
    if (this.arbitre.mt2 && !this.secondeLancee && m.aLaMiTemps && t >= v.debutMt2! - OUVERTURE_AVANT_MS) {
      this.secondeLancee = true;
      this.miTemps = false;
      this.choixAffiches = v.equipesMt2;
      this.equipesAffichees = this.equipesDe(v.equipesMt2!);
      this.montrerMatch();
      m.lancerSecondeMiTemps();
    }
  }

  private texteAuto(v: VuePartie): string {
    if (v.auto[0]) return "Le temps était fini : ton équipe a été faite automatiquement.";
    if (v.auto[1]) return "Ton ami n'a pas fini à temps : son équipe a été faite automatiquement.";
    return "Les deux équipes sont prêtes.";
  }

  private telecharger(n: 1 | 2, v: VuePartie): void {
    if (this.telechargement[n - 1]) return;
    this.telechargement[n - 1] = true;
    this.client
      .film(this.id, this.jeton, n, v.camp, this.s.donnees.largeurM, this.s.donnees.longueurM)
      .then((f) => {
        if (n === 1) this.arbitre.mt1 = f;
        else this.arbitre.mt2 = f;
        this.tic();
      })
      .catch(() => {
        this.telechargement[n - 1] = false; // nouvel essai au prochain tic
      });
  }

  private montrerFin(v: VuePartie): void {
    const s = v.score;
    this.montrerSalon({ titre: "Match terminé", texte: s ? `Score final : ${s[0]} – ${s[1]} (toi – ton ami).` : "Le match est fini.", boutons: [{ texte: "Retour à l'accueil", action: () => this.s.accueil() }] });
    this.actif = false;
  }

  // ---- Écrans ------------------------------------------------------------------

  private montrerSalon(c: Parameters<EcranSalon["montrer"]>[0]): void {
    const cle = JSON.stringify(c);
    if (this.ecran !== "salon" || cle !== this.cleSalon) {
      this.match?.fermer();
      this.salon.montrer(c);
      this.cleSalon = cle;
    }
    if (this.ecran !== "salon" || this.s.contenu.firstChild !== this.salon.racine) {
      this.s.contenu.replaceChildren(this.salon.racine);
      window.scrollTo({ top: 0 });
    }
    this.ecran = "salon";
  }

  private montrerPrepa(): void {
    this.match?.fermer();
    this.preparation.rendre();
    this.s.contenu.replaceChildren(this.preparation.racine);
    this.ecran = "prepa";
    window.scrollTo({ top: 0 });
  }

  private montrerMatch(): void {
    if (!this.match) return;
    this.s.contenu.replaceChildren(this.match.racine);
    if (this.ecran !== "match") this.match.ouvrir(true);
    this.ecran = "match";
    window.scrollTo({ top: 0 });
  }

  // ---- Préparation -------------------------------------------------------------

  private construirePreparation(graineEnPlus = 0): void {
    const v = this.vue!;
    this.partie = new Partie(this.s.donnees, (v.graineDraft + graineEnPlus) % 2 ** 31, this.s.planOrdi);
    this.offres = new Map();
    const d: DonneesPrepa = {
      ...donneesPrepa(),
      deck: this.s.deck,
      joueurs: this.s.fiches,
      effectif: [],
      composition: [],
      mercato: [],
      budget: REGLES.budgetDepart,
      chrono: "",
      groupe: { nom: "1 contre 1", match: "Toi contre ton ami", equipes: [] },
    };
    const partie = this.partie;
    const tactique = this.prepa?.etat.tactique;
    this.prepa = new Preparation(this.s.donnees, d);
    this.prepa.reserve = partie.reserve;
    this.prepa.tirage = () => partie.tirerMercato();
    this.prepa.relanceCout = REGLES.relanceCout;
    this.prepa.bonusFusion = chargerInfluences().fusion.notesParNiveau;
    if (tactique) this.prepa.choisirTactique(tactique);
    this.preparation = new EcranPreparation(
      this.prepa,
      () => {
        if (!partie.draftFini(0)) partie.camps[0]!.composition = this.prepa.etat.composition.map((p) => ({ ...p }));
      },
      this.controle(),
    );
  }

  /** Recopie l'équipe du draft dans l'écran de préparation. */
  private synchroniser(): void {
    const c = this.partie!.camps[0]!;
    this.prepa.etat = { ...this.prepa.etat, effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((p) => ({ ...p })), budget: c.budget };
  }

  private controle(): ControlePartie {
    const partie = () => this.partie!;
    return {
      enDraft: () => !partie().draftFini(0),
      casePermise: (poste, cellule) => partie().casePermise(0, poste, cellule),
      aGarder: () => partie().aGarder(0),
      ouvrirCase: (poste, cellule) =>
        ouvrirCaseDraft({
          partie: partie(),
          prepa: this.prepa,
          preparation: this.preparation,
          offres: this.offres,
          poste,
          cellule,
          choisi: (texte) => {
            let message = texte;
            if (partie().draftFini(0)) {
              this.prepa.etat = { ...this.prepa.etat, mercato: partie().tirerMercato() };
              message = "Draft terminé ! Complète ton banc au mercato, puis appuie sur « Prêt ».";
            }
            this.synchroniser();
            this.preparation.rendre();
            this.preparation.signaler(message);
          },
        }),
      ordi: () => ({ titulaires: 0, banc: 0, choix: [] }),
      championnat: () => ({ journee: 1, total: 1, fini: false, prochain: "ton ami", classement: [], resultats: [] }),
      titre: () => ({ titre: "1 contre 1", sous: "contre ton ami" }),
      miTemps: () => (this.miTemps && this.match ? { score: this.match.scoreActuel, joueur: (id) => this.match!.infosJoueur(id) } : null),
      jouer: () => {
        if (this.miTemps) void this.envoyerMiTemps();
        else void this.envoyerEquipe(false);
      },
      nouvelle: () => this.s.accueil(),
      autoPossible: () => !this.equipeEnvoyee && !this.miTemps,
      auto: (qualite) => {
        // Chaque appui donne une autre équipe (nouveau tirage), comme en championnat.
        this.construirePreparation(++this.autoN * 7919);
        const b = this.partie!.equipeAuto(0, qualite, this.prepa.d.bancMax, this.prepa.d.fusionsMax);
        this.prepa.etat = { ...this.prepa.etat, mercato: this.partie!.tirerMercato() };
        this.synchroniser();
        this.montrerPrepa();
        this.preparation.signaler(`Équipe ${qualite === "haute" ? "haute qualité" : "moyenne"} : note moyenne ${b.moyenne.toFixed(0)}, ${b.depense} pièces dépensées. Rappuie pour une autre, ou « Prêt ».`);
      },
      chrono: () => {
        const v = this.vue;
        if (!v) return null;
        const t = this.client.maintenant();
        if (this.miTemps) return v.finMiTemps === null ? null : minutes(v.finMiTemps - t);
        return v.etat === "equipes" && v.finEquipes !== null ? minutes(v.finEquipes - t) : null;
      },
      libelleJouer: () => (this.miTemps ? (this.miTempsEnvoye ? "✓ Prêt" : "Prêt ▶") : "Prêt ▶"),
      jouerActif: () => (this.miTemps ? !this.miTempsEnvoye : !this.equipeEnvoyee),
    };
  }

  private choixActuel(): ChoixEquipe {
    const e = this.prepa.etat;
    return { effectif: e.effectif.map((m) => ({ id: m.id, fusions: m.fusions })), composition: e.composition.map((p) => ({ ...p })), tactique: e.tactique };
  }

  /** « Prêt » : envoie l'équipe. `fin` : le chrono se termine, on complète d'abord le draft s'il le faut. */
  private async envoyerEquipe(fin: boolean): Promise<void> {
    if (this.equipeEnvoyee || this.envoiEnCours || !this.partie) return;
    if (fin && !this.prepa.pret()) {
      // Draft pas fini : les cases restantes sont remplies comme le ferait l'ordinateur.
      while (!this.partie.draftFini(0) && this.partie.ordiChoisir(0));
      this.synchroniser();
    }
    if (!this.prepa.pret()) {
      if (!fin) this.preparation.signaler("Il faut 11 titulaires.", true);
      else this.equipeEnvoyee = true; // le serveur fera une équipe automatique
      return;
    }
    this.envoiEnCours = true;
    const r = await this.client.demander({ action: "equipe", id: this.id, jeton: this.jeton, equipe: this.choixActuel() });
    this.envoiEnCours = false;
    if (r.ok && r.partie) {
      this.equipeEnvoyee = true;
      this.recevoir(r.partie);
    } else if (r.erreur?.includes("déjà envoyée") || r.erreur?.startsWith("Trop tard")) {
      this.equipeEnvoyee = true;
      this.tic();
    } else this.preparation.signaler(r.erreur ?? "Envoi impossible, réessaie.", true);
  }

  // ---- Match ---------------------------------------------------------------------

  private equipesDe(c: [ChoixEquipe, ChoixEquipe]): [Equipe, Equipe] {
    return [
      { ...equipeDepuisChoix(c[0], "Toi"), nationalite: "Toi" },
      { ...equipeDepuisChoix(c[1], "Ton ami"), nationalite: "Ton ami" },
    ];
  }

  private ouvrirMatch(v: VuePartie): void {
    this.choixAffiches = v.equipes!;
    this.equipesAffichees = this.equipesDe(v.equipes!);
    const prep = donneesPrepa();
    const habillage: HabillageMatch = {
      nomNous: "Toi",
      nomEux: "Ton ami",
      tactiques: prep.tactiques,
      styles: prep.styles,
      infos: (id, camp = 0) => {
        const f = this.s.fiches[id];
        if (!f) return undefined;
        const fusions = this.choixAffiches?.[camp].effectif.find((m) => m.id === id)?.fusions ?? 0;
        return { couleur: this.s.couleurs[f.pays] ?? "#1F3A93", style: f.style, fusions };
      },
      changements: () => this.ouvrirChangements(),
      finMatch: () => this.s.accueil(),
      enLigne: {
        maintenant: () => this.client.maintenant(),
        debut: (periode) => (periode === 1 ? this.vue!.debutMt1! : (this.vue!.debutMt2 ?? Infinity)),
        finMiTemps: () => this.vue?.finMiTemps ?? null,
        pret: () => void this.envoyerMiTemps(),
        estPret: () => this.miTempsEnvoye,
      },
    };
    this.match = new EcranMatch(this.s.donnees, this.s.reglages, () => this.equipesAffichees!, habillage, new GrainesLocales(), this.arbitre);
    this.s.contenu.replaceChildren(this.match.racine);
    this.ecran = "match";
    this.match.ouvrir();
    window.scrollTo({ top: 0 });
  }

  /** Mi-temps : l'écran de préparation sert aux changements (places, remplaçants, tactique). */
  private ouvrirChangements(): void {
    if (!this.miTempsSynchro) {
      // L'équipe jouée est celle du serveur (elle a pu être faite automatiquement).
      if (!this.partie) this.construirePreparation();
      const c = this.choixAffiches![0];
      this.prepa.etat = { ...this.prepa.etat, effectif: c.effectif.map((m) => ({ ...m })), composition: c.composition.map((p) => ({ ...p })), tactique: c.tactique ?? this.prepa.etat.tactique, mercato: [] };
      this.miTempsSynchro = true;
    }
    this.miTemps = true;
    this.montrerPrepa();
  }

  /** « Prêt » à la mi-temps : envoie l'équipe (changée ou non) et revient au match. */
  private async envoyerMiTemps(): Promise<void> {
    if (this.miTempsEnvoye || this.envoiEnCours) return;
    const base = this.miTempsSynchro ? this.choixActuel() : this.choixAffiches![0];
    const forcee = this.match?.tactiqueForcee(0);
    const choix: ChoixEquipe = { ...base, ...(forcee ? { tactique: forcee } : {}) };
    this.envoiEnCours = true;
    const r = await this.client.demander({ action: "mitemps", id: this.id, jeton: this.jeton, equipe: choix });
    this.envoiEnCours = false;
    if (r.ok && r.partie) {
      this.miTempsEnvoye = true;
      this.recevoir(r.partie);
    } else if (r.erreur?.includes("déjà envoyés") || r.erreur?.startsWith("Trop tard")) this.miTempsEnvoye = true;
    else if (this.ecran === "prepa") return this.preparation.signaler(r.erreur ?? "Envoi impossible, réessaie.", true);
    if (this.ecran === "prepa") this.montrerMatch();
    this.match?.majMiTemps();
  }
}

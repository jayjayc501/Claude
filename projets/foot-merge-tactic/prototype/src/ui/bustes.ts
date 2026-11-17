// Bustes des joueurs (images de référence de la maquette du 12/11, générées
// avec Kling : pas les visuels définitifs). Incluses dans la page à la
// construction (greffon de scripts/assembler.ts).

import AM from "../../../docs/maquette-interface/bustes/bust-AM.png";
import AS from "../../../docs/maquette-interface/bustes/bust-AS.png";
import BL from "../../../docs/maquette-interface/bustes/bust-BL.png";
import CB from "../../../docs/maquette-interface/bustes/bust-CB.png";
import DA from "../../../docs/maquette-interface/bustes/bust-DA.png";
import DK from "../../../docs/maquette-interface/bustes/bust-DK.png";
import EL from "../../../docs/maquette-interface/bustes/bust-EL.png";
import HF from "../../../docs/maquette-interface/bustes/bust-HF.png";
import IS from "../../../docs/maquette-interface/bustes/bust-IS.png";
import JM from "../../../docs/maquette-interface/bustes/bust-JM.png";
import KM from "../../../docs/maquette-interface/bustes/bust-KM.png";
import LM from "../../../docs/maquette-interface/bustes/bust-LM.png";
import MO from "../../../docs/maquette-interface/bustes/bust-MO.png";
import MV from "../../../docs/maquette-interface/bustes/bust-MV.png";
import NV from "../../../docs/maquette-interface/bustes/bust-NV.png";
import PA from "../../../docs/maquette-interface/bustes/bust-PA.png";
import RC from "../../../docs/maquette-interface/bustes/bust-RC.png";
import TR from "../../../docs/maquette-interface/bustes/bust-TR.png";

export const BUSTES: Record<string, string> = { AM, AS, BL, CB, DA, DK, EL, HF, IS, JM, KM, LM, MO, MV, NV, PA, RC, TR };

/** Tête dans chaque image (fractions de la largeur et de la hauteur) : centre
 *  et rayon, pour cadrer le visage dans une pastille ronde. Mesuré sur les images. */
export const TETES: Record<string, { cx: number; cy: number; r: number }> = {
  AM: { cx: 0.51, cy: 0.237, r: 0.333 }, AS: { cx: 0.51, cy: 0.237, r: 0.333 }, BL: { cx: 0.51, cy: 0.237, r: 0.333 },
  CB: { cx: 0.594, cy: 0.289, r: 0.302 }, DA: { cx: 0.521, cy: 0.289, r: 0.302 }, DK: { cx: 0.495, cy: 0.34, r: 0.297 },
  EL: { cx: 0.526, cy: 0.227, r: 0.349 }, HF: { cx: 0.484, cy: 0.309, r: 0.307 }, IS: { cx: 0.594, cy: 0.289, r: 0.302 },
  JM: { cx: 0.495, cy: 0.34, r: 0.297 }, KM: { cx: 0.521, cy: 0.289, r: 0.302 }, LM: { cx: 0.526, cy: 0.227, r: 0.349 },
  MO: { cx: 0.583, cy: 0.299, r: 0.396 }, MV: { cx: 0.49, cy: 0.361, r: 0.365 }, NV: { cx: 0.484, cy: 0.309, r: 0.307 },
  PA: { cx: 0.526, cy: 0.227, r: 0.349 }, RC: { cx: 0.49, cy: 0.361, r: 0.365 }, TR: { cx: 0.51, cy: 0.216, r: 0.281 },
};

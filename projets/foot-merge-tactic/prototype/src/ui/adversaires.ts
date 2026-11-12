// Figurines de l'équipe adverse : bustes de la maquette recolorés en rouge et
// retournés (scripts/recolorer-adversaires.py). Références pour le prototype.

import RMO from "../images/adversaires/rouge-MO.png";
import RAM from "../images/adversaires/rouge-AM.png";
import RCB from "../images/adversaires/rouge-CB.png";
import REL from "../images/adversaires/rouge-EL.png";
import RDK from "../images/adversaires/rouge-DK.png";
import RMV from "../images/adversaires/rouge-MV.png";
import RJM from "../images/adversaires/rouge-JM.png";
import RTR from "../images/adversaires/rouge-TR.png";
import RKM from "../images/adversaires/rouge-KM.png";
import RBL from "../images/adversaires/rouge-BL.png";
import RHF from "../images/adversaires/rouge-HF.png";

/** Gardien d'abord, puis les joueurs de champ. */
export const GARDIEN_ROUGE = RMO;
export const CHAMP_ROUGE: Record<string, string> = { AM: RAM, CB: RCB, EL: REL, DK: RDK, MV: RMV, JM: RJM, TR: RTR, KM: RKM, BL: RBL, HF: RHF };

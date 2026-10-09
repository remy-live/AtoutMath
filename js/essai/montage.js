// LA COQUILLE DE LA PAGE AUTONOME — trois lignes, et c'est tout ce qu'elle fait.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// L'atelier entier vit dans `ui/atelierToile.js`, que la modale de l'application
// monte aussi. Cette page n'en est qu'un des deux écrans ; elle existe parce
// qu'un fichier qu'on envoie par courriel s'ouvre d'un double-clic, sans serveur
// — voir `tools/paquetAtelier.mjs`, qui recoud le tout en un seul document.
//
// LE DRAPEAU « PRÊT » EST POSÉ ICI, et pas dans l'atelier : c'est la PAGE que la
// sonde attend, et l'atelier n'a pas à savoir qu'une sonde existe.

import { monterAtelier } from '../ui/atelierToile.js';

monterAtelier(document.getElementById('ae-racine'));
document.documentElement.dataset.atelierEssai = 'pret';

// LES PIÈCES D'ÉCHECS IMPORTÉES — vide pour l'instant.
//
// Ce fichier est ÉCRIT PAR UN OUTIL :
//
//     node outils/importerPieces.mjs <dossier-des-svg> "mention de licence"
//
// Tant qu'il rend « null », l'application se sert des dessins maison
// (ui/piecesEchecs.js). Dès qu'on y installe un jeu de pièces — celui de
// Wikimedia Commons, par exemple —, l'écran ET la fiche imprimée s'en servent
// sans autre changement : le lecteur de chemins (ui/cheminSvg.js) sait
// redessiner un « path » dans un PDF, ce que jsPDF ne sait pas faire seul.
//
// LE FICHIER EXISTE MÊME VIDE, EXPRÈS. Un import statique d'un fichier absent
// casserait le chargement de l'application entière, et un import dynamique
// obligerait à rendre asynchrone un dessin qui ne l'est pas.

export const PIECES_IMPORTEES = null;
export const CADRE_IMPORTE = null;
export const MENTION_PIECES = '';

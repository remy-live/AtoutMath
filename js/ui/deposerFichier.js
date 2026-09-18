// DÉPOSER UN FICHIER SUR LA PAGE POUR L'IMPORTER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RETOUR D'UN PROFESSEUR qui a essayé d'importer un export :
//
//   « dans ton json tu as ta première partie qui donne la compatibilité avec la
//     v2 d'AtoutMath → donc ça veut dire que l'app doit l'accepter si tu drag
//     and drop le json dans l'app. […] j'ai passé 3 plombes à chercher le bouton
//     d'import et les zones de drop n'ont pas semblé fonctionner. »
//
// IL N'Y AVAIT AUCUNE ZONE DE DÉPÔT — c'est pour cela qu'elles ne marchaient
// pas. `dataTransfer.files` n'apparaissait nulle part dans le logiciel. Déposer
// un fichier sur la page faisait donc ce que le navigateur fait par défaut : il
// QUITTE l'application pour afficher le fichier. Le travail en cours reste,
// mais on a l'impression que tout a disparu, et rien n'a été importé.
//
// CE QUE LE FICHIER DIT DE LUI-MÊME, il le disait déjà : `format` vaut
// « atoutmath/v2 » et `kind` vaut « teacher_content » ou « student_progress ».
// C'est ce qui permet de savoir quoi en faire sans rien demander. On y a ajouté
// une ligne `aPropos`, en français, pour la personne qui ouvre le fichier dans
// un éditeur — la machine n'en a pas besoin, elle.
//
// ON ACCEPTE LE DÉPÔT N'IMPORTE OÙ SUR LA PAGE, et non sur un rectangle qu'il
// faudrait trouver : un rectangle à viser, c'est un rectangle qu'on cherche
// trois plombes.

import { showToast, showAlert } from './modal.js';
import { applyImport } from '../core/importExport.js';

const ID_VOILE = 'depot-fichier-voile';

/** Le glissement porte-t-il des FICHIERS ? Sinon c'est un geste interne. */
function desFichiers(e) {
    const t = e.dataTransfer && e.dataTransfer.types;
    if (!t) return false;
    // `types` est un DOMStringList sur certains navigateurs : pas de `.includes`.
    return Array.prototype.indexOf.call(t, 'Files') >= 0;
}

function voile(montrer) {
    let el = document.getElementById(ID_VOILE);
    if (!montrer) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = ID_VOILE;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div><b>Déposez le fichier</b><br>'
        + 'un export AtoutMath (.json) : parcours, ou progression d\'un élève</div>';
    document.body.appendChild(el);
}

/**
 * CE QU'ON A DÉPOSÉ, ET CE QU'ON EN FAIT.
 *
 * On ne devine pas d'après l'extension : on LIT le fichier et l'on regarde ce
 * qu'il déclare. Un fichier qui ne dit pas son format n'est pas le nôtre, et le
 * dire franchement vaut mieux que de l'importer à moitié.
 */
async function avaler(fichier) {
    if (!fichier) return;
    // Un fichier de dix mégaoctets n'est pas un export : on ne l'ouvre même pas.
    if (fichier.size > 20 * 1024 * 1024) {
        return showAlert(`« ${fichier.name} » est trop gros pour être un export AtoutMath.`);
    }
    let texte;
    try {
        texte = await fichier.text();
    } catch (e) {
        return showAlert(`« ${fichier.name} » n'a pas pu être lu.`);
    }
    let data;
    try {
        data = JSON.parse(texte);
    } catch (e) {
        return showAlert(`« ${fichier.name} » n'est pas un fichier AtoutMath : `
            + 'ce n\'est pas du JSON. Les exports portent l\'extension .json et '
            + 'commencent par « "format": "atoutmath/v2" ».');
    }
    if (!data || typeof data !== 'object') {
        return showAlert(`« ${fichier.name} » ne contient pas d'export AtoutMath.`);
    }
    // ON DIT CE QU'ON VA FAIRE AVANT DE LE FAIRE. Le fichier porte son genre :
    // autant s'en servir pour annoncer, plutôt que de laisser l'import se
    // dérouler en silence et se demander ensuite s'il s'est passé quelque chose.
    const quoi = data.kind === 'teacher_content' || data.type === 'teacher_paths'
        ? 'des parcours'
        : (data.kind === 'student_progress' || data.type === 'student_progress')
            ? 'une progression d\'élève' : null;
    if (quoi) showToast(`Import de ${quoi} depuis « ${fichier.name} »…`, 'info', 2500);
    await applyImport(data, document.getElementById('import-export-modal'));
}

/**
 * BRANCHER LE DÉPÔT, une fois pour toutes.
 *
 * `dragover` DOIT appeler `preventDefault`, sinon le navigateur refuse le
 * dépôt — et c'est la moitié du problème d'origine. On l'appelle même quand on
 * ne saura pas quoi faire du fichier : mieux vaut un message qui explique que
 * l'application qui disparaît au profit d'un fichier texte.
 */
export function brancherDepotDeFichier(doc = document) {
    if (doc.__depotFichier) return;
    doc.__depotFichier = true;

    // Le compteur : `dragenter`/`dragleave` partent aussi quand on survole un
    // enfant. Sans lui, le voile clignote à chaque élément traversé.
    let profondeur = 0;

    doc.addEventListener('dragenter', (e) => {
        if (!desFichiers(e)) return;
        e.preventDefault();
        profondeur++;
        voile(true);
    });
    doc.addEventListener('dragover', (e) => {
        if (!desFichiers(e)) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    doc.addEventListener('dragleave', (e) => {
        if (!desFichiers(e)) return;
        profondeur = Math.max(0, profondeur - 1);
        if (!profondeur) voile(false);
    });
    doc.addEventListener('drop', (e) => {
        if (!desFichiers(e)) return;
        e.preventDefault();
        profondeur = 0;
        voile(false);
        const fichiers = [...((e.dataTransfer && e.dataTransfer.files) || [])];
        if (!fichiers.length) return;
        if (fichiers.length > 1) {
            showToast(`${fichiers.length} fichiers déposés — on ne lit que le premier.`,
                'info', 4000);
        }
        avaler(fichiers[0]);
    });
}

// Saisie d'un code de parcours donné par le professeur.
//
// Le code encode désormais le parcours complet (étapes, surcharges, politique,
// barème) : un parcours noté partagé par lien arrive chez l'élève avec son
// barème, ce qui était impossible avec l'ancien format à 2 lettres par jeu.

import { Shortcodes } from '../core/shortcodes.js';
import { laCameraEstPossible, ouvrirLeScanner } from './scannerQr.js';
import { hydratePath } from '../core/path.js';
import { resolvePolicy } from '../core/policy.js';
import { showAlert, showToast } from './modal.js';
import { state } from '../core/state.js';
import { estUneBoite } from '../core/boite.js';

export function initStudentCodeUI() {
    const btnSubmit = document.getElementById('btn-submit-code');
    const input = document.getElementById('student-code-input');
    const modal = document.getElementById('code-modal');

    const submit = () => {
        const code = (input.value || '').trim();
        if (!code) return;
        if (!applyCode(code)) {
            showAlert('Code invalide ou parcours introuvable. Vérifie la saisie avec ton professeur.');
            return;
        }
        input.value = '';
        if (modal) modal.style.display = 'none';
    };

    if (btnSubmit) btnSubmit.onclick = submit;
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

    const btnClose = document.getElementById('btn-close-code');
    if (btnClose) btnClose.onclick = () => { if (modal) modal.style.display = 'none'; };

    // ── LE SCANNER ────────────────────────────────────────────────────────
    //
    // RÉMY, pour les tablettes hors ligne de sa sœur : « on ne peut pas ne pas
    // passer par l application du qr code et avoir une fenêtre intégré dans
    // l appli ce serait le mieux ». L'appareil photo passe le lien au
    // NAVIGATEUR PAR DÉFAUT, qui n'est pas forcément celui où l'application
    // est en cache : hors ligne, l'élève tombe alors sur une page blanche.
    //
    // LE BOUTON NE PARAÎT QUE S'IL PEUT SERVIR. Voir `laCameraEstPossible` :
    // hors contexte sécurisé, `getUserMedia` n'existe pas du tout.
    // L'INSTALLATION EST AUSSI ICI, et c'est le second écran où elle compte :
    // le professeur dit « tape ton code » ou « scanne », l'élève ouvre cette
    // fenêtre, et c'est le seul endroit TOUJOURS atteignable — l'écran vide,
    // lui, disparaît dès qu'une séance arrive.
    const btnInstall = document.getElementById('btn-installer-zone');
    if (btnInstall) {
        import('./installer.js')
            .then(m => m.poserDesQuePossible(btnInstall))
            .catch(() => { /* la fenêtre du code vaut mieux sans que cassée */ });
    }

    const btnScan = document.getElementById('btn-scanner-code');
    if (btnScan && laCameraEstPossible()) {
        btnScan.hidden = false;
        btnScan.onclick = () => scannerUnCodeDeSeance({
            surCodeOuvert: () => {
                if (input) input.value = '';
                if (modal) modal.style.display = 'none';
            },
            surEchec: () => showAlert('Ce QR code vient bien d\'AtoutMath, mais son '
                + 'parcours ne s\'ouvre pas. Montre-le à ton professeur.')
        });
    }
}

/**
 * SCANNER UN CODE DE SÉANCE, ET L'OUVRIR — le seul endroit qui sache le faire.
 *
 * ── POURQUOI CETTE FONCTION EXISTE ────────────────────────────────────────
 *
 * Le scanner s'ouvre maintenant de TROIS endroits : la fenêtre du code, la
 * porte d'entrée (Rémy : « il faut sur l'écran d'ailleurs un bouton pour
 * scanner directement le qr code »), et l'écran du parcours — sans quoi un
 * élève qui a déjà une séance n'a plus aucun moyen d'en recevoir une autre
 * hors ligne. Trois copies de la même dizaine de lignes, c'est deux de trop :
 * la leçon mesurée ci-dessous n'aurait été corrigée que dans l'une d'elles.
 *
 * ── LES TROIS RÉPONSES, ET ELLES NE SE DEVINENT PAS ───────────────────────
 *
 * 1. CE N'EST PAS UN CODE D'ATOUTMATH → on rend `false`, et le scanner
 *    CONTINUE de chercher : un élève qui balaie le tableau attrape parfois
 *    l'affiche d'à côté, et refermer la fenêtre le punirait d'avoir visé.
 *
 *    ET C'EST `Shortcodes.codeDeSeanceLu` QUI TRANCHE, pas le fait d'avoir lu
 *    quelque chose : il n'accepte que ce qui se DÉCODE. Il vit dans le noyau,
 *    avec son explication et son épreuve — la leçon a été payée ici, mais elle
 *    vaut pour tout appelant.
 *
 * 2. C'EST UN CODE DE CHEZ NOUS, ET IL S'OUVRE → `surCodeOuvert`, puis on
 *    ferme.
 *
 * 3. C'EST UN CODE DE CHEZ NOUS ET IL NE S'OUVRE PAS → `surEchec`, et l'on
 *    ferme QUAND MÊME. Continuer à viser relirait le même QR code dix fois par
 *    seconde sans jamais rien changer, et l'appelant a quelque chose à dire.
 *
 * @param {object} [o]
 * @param {(code:string)=>void} [o.surCodeOuvert]
 * @param {(code:string)=>void} [o.surEchec]
 * @returns {{close:Function}|null} null si l'appareil ne peut pas scanner
 */
export function scannerUnCodeDeSeance({ surCodeOuvert, surEchec } = {}) {
    return ouvrirLeScanner({
        surCode: (texte) => {
            const code = Shortcodes.codeDeSeanceLu(texte);
            if (!code) return false;
            if (applyCode(code)) { if (surCodeOuvert) surCodeOuvert(code); }
            else if (surEchec) surEchec(code);
            return true;
        }
    });
}

/**
 * Décode un code, l'enregistre comme parcours assigné et le lance.
 * @returns {boolean} succès
 */
export function applyCode(code, { autoStart = true } = {}) {
    const path = Shortcodes.decodePath(code);
    if (!path || !path.steps.length) return false;

    const { steps, missing } = hydratePath(path);
    if (!steps.length) return false;

    // UNE BOÎTE À JEUX N'EST PAS UN DEVOIR, ET NE DOIT RIEN EN AVOIR.
    //
    // Le même code, la même lecture, le même décodeur — mais ce qui suit
    // change tout : `setStudentPath` ferait de ce lien un PARCOURS ASSIGNÉ.
    // Il s'inscrirait dans « Mon Parcours », la barre du haut basculerait en
    // mode parcours, la progression de l'appareil s'y rattacherait, et celui
    // qui a simplement ouvert un lien pour jouer au sudoku se retrouverait
    // avec un devoir à rendre. Rémy : « sans forcément avoir un parcours ».
    //
    // La boîte part donc AVANT tout cela, vers son propre écran.
    if (estUneBoite(path)) {
        path.steps = steps;
        import('./boiteUI.js').then(m => m.ouvrirLaBoite(path));
        return true;
    }
    if (missing.length) {
        showToast(`${missing.length} exercice(s) de ce parcours n'existent plus.`, 'error');
    }

    // PAS DE MESSAGE DE CONFIRMATION, ET C'EST UNE SUPPRESSION VOULUE.
    //
    // Rémy, capture de l'écran d'accueil d'un élève : « même le toast est
    // redondant ». Il l'était deux fois. Il annonçait le nom du parcours —
    // que l'écran qui s'ouvre dans la seconde écrit déjà dans son en-tête et
    // sur sa carte — et la règle de la séance, que cette même carte pose
    // juste en dessous (`run-carte-regle`). Cinq secondes de bandeau par-
    // dessus l'écran qu'il recouvrait pour répéter ce qu'il cachait.
    //
    // ET QUAND LA CARTE NE S'OUVRE PAS (`autoStart: false`), l'élève arrive
    // dans « Mon Parcours », qui écrit le nom en tête de section et la règle
    // juste dessous (voir `describePolicy` dans ui/pathView.js). Dans les deux
    // cas, le message ne servait qu'à dire « ça a marché » — ce que l'arrivée
    // du parcours dit mieux que lui.
    //
    // L'AVERTISSEMENT, LUI, RESTE : « 3 exercices de ce parcours n'existent
    // plus » n'est écrit nulle part ailleurs.
    //
    // Le code décodé, l'élève voyait la première question avant d'avoir vu son
    // parcours. Le parcours s'ouvre donc sur SA CARTE, plein écran, et c'est
    // lui qui donne le départ ; s'il préfère attendre, le parcours reste
    // chargé dans « Mon Parcours ».
    const poser = () => {
        state.setStudentPath(path.steps, {
            pathId: path.id,
            name: path.name,
            code,
            policy: resolvePolicy(path.policy)
        });
        import('./navigation.js').then(m => m.setTopNavMode('path'));
        if (autoStart) {
            import('../core/runner.js').then(({ Runner }) => {
                new Runner({ path, deviceMode: 'none', isStudentPath: true }).start();
            });
        }
    };

    // LE MÊME PARCOURS, UNE SECONDE FOIS — ET C'EST SA QUESTION.
    //
    // RÉMY, après l'essai sur tablette : « Quand on rescanne à nouveau, si le
    // parcours est identique au précédente, l'élève choisit ou non de
    // redémarrer à zéro. »
    //
    // LES TROIS CHEMINS PASSENT ICI, et c'est pourquoi la question est ici et
    // non dans le scanner : le code tapé à la main, le QR code visé au
    // tableau, et le lien ouvert deux fois. Dans les trois cas l'élève revient
    // sur la même séance, et dans les trois cas il doit pouvoir choisir.
    //
    // ELLE NE SE POSE QUE S'IL Y A QUELQUE CHOSE À REPRENDRE. Scanner deux
    // fois de suite sans rien avoir fait entre les deux arrive — on vise mal,
    // on recommence — et une fenêtre dont les deux réponses font la même chose
    // apprend à cliquer sans lire.
    //
    // ON COMPTE SUR LES ÉTAPES DU PARCOURS EN COURS, et non sur celles qu'on
    // vient de décoder : ce sont elles qui portent les `stepId` auxquels les
    // étapes faites se réfèrent. Le parcours étant le même — `pathId` est
    // l'empreinte du contenu —, les deux listes se correspondent une à une.
    const encours = state.studentPath;
    const dejaFait = (encours && encours.pathId && encours.pathId === path.id)
        ? (encours.completed || []) : [];
    if (!dejaFait.length) {
        poser();
        return true;
    }

    // LE VOILE DU LIEN NE RESTE PAS DERRIÈRE LA QUESTION. Arrivé par
    // `?code=`, l'écran porte « Chargement du parcours… » (voir
    // `html.depuis-code` dans css/layout.css) : on lirait la question
    // par-dessus une page qui se déclare en train de charger, alors que c'est
    // nous qui attendons une réponse.
    document.documentElement.classList.add('parcours-pret');
    import('./repriseDuParcours.js')
        .then(m => m.demanderLaReprise({
            nom: path.name, steps: encours.steps, faites: dejaFait
        }))
        .then(choix => {
            if (choix === 'zero') state.recommencerLeParcours(path.id);
            poser();
        })
        // UNE FENÊTRE QUI NE S'OUVRE PAS NE DOIT PAS AVALER LA SÉANCE : on
        // reprend, c'est-à-dire exactement ce que le logiciel faisait avant que
        // cette question existe.
        .catch(() => poser());
    return true;
}

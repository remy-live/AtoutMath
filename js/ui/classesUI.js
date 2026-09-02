// MES CLASSES — l'écran où un professeur suit ses élèves.
//
// TROIS NIVEAUX DE LECTURE, ET ON N'EN VOIT QU'UN À LA FOIS.
//
//   1. LA CLASSE, d'un coup d'œil : une grille de pastilles colorées, une
//      ligne par élève, une colonne par compétence. On y cherche les LIGNES
//      rouges (un élève qui décroche) et les COLONNES rouges (une notion à
//      reprendre avec tout le monde) — c'est tout ce qu'un tableau de classe
//      apporte, et c'est visuel parce que ça se cherche des yeux, pas en
//      lisant des nombres.
//
//   2. LA PHRASE, élève par élève : une force, une difficulté, des chiffres.
//      Elle est SOUS la grille et non dans une infobulle : c'est ce qu'on lit
//      avant de décider, pas une précision qu'on va chercher.
//
//   3. LE DÉTAIL, quand on clique un élève : toutes ses compétences, ses
//      erreurs encore ouvertes, son temps de travail.
//
// CE QU'ON REFUSE D'AFFICHER : une couleur sur deux questions. Une pastille
// grise dit « pas encore assez pour juger », et c'est une information — un
// tableau de bord qui se trompe avec assurance fait plus de dégâts qu'un
// tableau vide.

import { showModal, showToast, showConfirm } from './modal.js';
import { globalStore } from '../core/store.js';
import {
    creerClasse, poserEleve, retirerEleve, renommerEleve,
    lireFichierEleve, elevesTries
} from '../core/classes.js';
import { bilanClasse, SIGNAUX } from '../core/bilan.js';
import { classesDeDemo, LEGENDE_PROFILS } from '../core/demoClasses.js';
import { LEVELS } from '../core/mastery.js';
import { state } from '../core/state.js';

/**
 * LE PARCOURS DE DÉMONSTRATION DOIT ÊTRE DANS LA BIBLIOTHÈQUE, sinon la
 * démonstration s'arrête à mi-chemin.
 *
 * Les cinq classes portent le travail ; l'engrenage du parcours montre à qui
 * il a été donné. Sans le parcours lui-même dans la liste du professeur, il n'y
 * a rien à ouvrir : on verrait des bilans sans jamais voir d'où ils viennent.
 *
 * ON NE LE DUPLIQUE PAS : son identifiant est fixe, on le remplace s'il existe.
 */
async function rangerParcoursDemo(modele) {
    const ID = 'demo_path_biblio';
    const entree = {
        id: ID, name: modele.name, data: modele,
        folderId: 'root', demo: true, timestamp: Date.now()
    };
    state.teacherPaths = [entree, ...state.teacherPaths.filter(p => p.id !== ID)];
    state.saveTeacherPaths();
}

const CLE = 'classes';

let classes = [];
let classeActiveId = null;
let eleveOuvertId = null;
// La modale « Mes classes » elle-même : « Voir son écran » doit pouvoir la
// refermer, sinon l'écran de l'élève reste caché derrière elle.
let modaleClasses = null;
let rafraichir = () => {};

// --- Stockage ---------------------------------------------------------------

export async function chargerClasses() {
    classes = (await globalStore.get(CLE, [])) || [];
    if (!classeActiveId && classes.length) classeActiveId = classes[0].id;
    return classes;
}

async function enregistrer() {
    await globalStore.set(CLE, classes);
}

function classeActive() {
    return classes.find(c => c.id === classeActiveId) || null;
}

function majClasse(nouvelle) {
    classes = classes.map(c => (c.id === nouvelle.id ? nouvelle : c));
    return enregistrer().then(rafraichir);
}

// --- Rendu ------------------------------------------------------------------

const pc = (x) => Math.round(x * 100) + ' %';
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le nombre de colonnes de la grille : au-delà, on ne cherche plus, on scanne. */
const COLONNES = 8;

function pastille(comp) {
    if (!comp) return `<span class="cl-case cl-case--vide" title="Pas travaillé">·</span>`;
    if (!comp.fiable) {
        return `<span class="cl-case cl-case--flou"
            title="${esc(comp.nom)} — ${comp.essais} question${comp.essais > 1 ? 's' : ''}, pas assez pour juger">?</span>`;
    }
    const l = LEVELS[comp.niveau] || LEVELS.NA;
    return `<span class="cl-case cl-case--${comp.niveau.toLowerCase()}"
        title="${esc(comp.nom)} — ${l.label}, ${pc(comp.taux)} sur ${comp.essais} questions">${l.short}</span>`;
}

function grilleHtml(b) {
    if (!b.eleves.length) return '';
    // Les colonnes : les notions où la classe est le plus en peine d'abord.
    // C'est l'ordre utile — la première colonne est celle du prochain cours.
    const colonnes = b.competences.slice(0, COLONNES);
    if (!colonnes.length) {
        return `<p class="cl-vide">Pas encore assez de travail pour dresser un tableau.
            Il faut au moins cinq questions par compétence.</p>`;
    }
    const eleves = [...b.eleves].sort((a, z) => a.nom.localeCompare(z.nom, 'fr'));

    const entetes = colonnes.map(c =>
        `<th class="cl-col"><span class="cl-col-nom" title="${esc(c.nom)}">${esc(c.nom)}</span></th>`).join('');

    const lignes = eleves.map(e => {
        const par = new Map(e.competences.map(c => [c.skillId, c]));
        const cases = colonnes.map(c => `<td>${pastille(par.get(c.skillId))}</td>`).join('');
        const muet = e.questions ? '' : ' cl-ligne--muette';
        // LE SIGNAL EST DANS LA LIGNE, PAS SOUS LE TABLEAU. Rémy : « c'est
        // tellement indigeste le bilan […] le prof ne le lira jamais. » Le
        // détail chiffré vit dans l'infobulle, la phrase entière dans le
        // panneau qu'on ouvre en cliquant le nom.
        const signaux = (e.signaux || []).map(g =>
            `<span class="cl-signal cl-signal--${g.code}" title="${esc(g.nom)} — ${esc(g.detail)}"
                aria-label="${esc(g.nom)}">${g.icone}</span>`).join('');
        return `<tr class="cl-ligne${muet}" data-eleve="${e.id}">
            <th class="cl-eleve" scope="row">
                <button type="button" class="cl-nom" data-ouvre="${e.id}">${esc(e.nom)}</button>
                <span class="cl-eleve-chiffre">${e.questions ? pc(e.reussite) : '—'}</span>
            </th>
            <td class="cl-signaux">${signaux}</td>${cases}</tr>`;
    }).join('');

    return `<div class="cl-bloc-grille"><div class="cl-grille-boite">
        <table class="cl-grille">
            <thead><tr>
                <th class="cl-coin">Élève</th>
                <th class="cl-col cl-col--signal" title="Chez qui aller voir">⚑</th>
                ${entetes}
            </tr></thead>
            <tbody>${lignes}</tbody>
        </table>
    </div>
    <div class="cl-legende">
        ${['E', 'A', 'EC', 'NA'].map(k =>
        `<span class="cl-lg"><span class="cl-case cl-case--${k.toLowerCase()}">${LEVELS[k].short}</span>${LEVELS[k].label}</span>`).join('')}
        <span class="cl-lg"><span class="cl-case cl-case--flou">?</span>Pas assez de questions</span>
    </div>
    <div class="cl-legende cl-legende--signaux">
        ${Object.values(SIGNAUX).map(g =>
        `<span class="cl-lg"><span class="cl-signal">${g.icone}</span>${esc(g.nom)}</span>`).join('')}
    </div></div>`;
}

// LE BLOC DE PHRASES A ÉTÉ RETIRÉ, et c'est une correction, pas une perte.
//
// Rémy : « c'est tellement indigeste le bilan, tu mets le bilan hors tableau,
// il faut mieux faire, le prof ne le lira jamais. » Vingt-quatre paragraphes
// sous une grille demandent trois minutes, et personne n'a trois minutes en
// début d'heure. Ce qui les remplace est la colonne des signaux, DANS le
// tableau — et la phrase entière n'a pas disparu : elle s'affiche dans le
// panneau qu'on ouvre en cliquant un nom, c'est-à-dire au moment où on veut
// vraiment la lire, pour un élève et un seul.

/**
 * LE PANNEAU DE CÔTÉ — une phrase, celle de l'élève qu'on regarde.
 *
 * Rémy : « pourquoi pas une phrase à droite du tableau ». Sous la grille, les
 * vingt-quatre phrases demandaient trois minutes et n'étaient jamais lues. À
 * droite, il n'y en a qu'UNE — celle de la ligne survolée —, elle apparaît sans
 * qu'on ait rien à cliquer, et le tableau garde toute sa largeur.
 *
 * Le panneau ne remplace pas le détail complet : il donne de quoi décider
 * pendant qu'on balaie, et le clic ouvre le reste.
 */
function coteHtml(e) {
    if (!e) return '<p class="cl-vide">Survole un élève pour voir son bilan.</p>';
    const signaux = (e.signaux || []).map(g =>
        `<li class="cl-cote-signal"><span class="cl-signal">${g.icone}</span>
            <span>${esc(g.detail)}</span></li>`).join('');
    return `<h4 class="cl-cote-nom">${esc(e.nom)}</h4>
        ${signaux ? `<ul class="cl-cote-signaux">${signaux}</ul>` : ''}
        <p class="cl-cote-phrase">${esc(e.phrase)}</p>
        <div class="cl-cote-kpis">
            <span><b>${e.questions}</b> questions</span>
            <span><b>${e.questions ? pc(e.reussite) : '—'}</b> de réussite</span>
            <span><b>${e.minutes}</b> min</span>
        </div>
        <button type="button" class="cl-detail-btn" data-ouvre="${esc(e.id)}">Tout voir</button>`;
}

function detailHtml(e) {
    const comp = e.competences;
    const lignes = comp.map(c => {
        const l = LEVELS[c.niveau] || LEVELS.NA;
        return `<tr>
            <td>${esc(c.nom)}</td>
            <td class="cl-d-niveau">${c.fiable ? l.short : '?'}</td>
            <td class="cl-d-nb">${c.justes}/${c.essais}</td>
            <td class="cl-d-barre">
                <span class="cl-barre"><span style="width:${Math.round(c.taux * 100)}%"></span></span>
            </td>
        </tr>`;
    }).join('');

    const erreurs = e.aRevoir.length ? `
        <h4 class="cl-d-titre">Ce qui reste à revoir</h4>
        <ul class="cl-erreurs">${e.aRevoir.map(x => `
            <li><span class="cl-err-q">${esc(x.questionText)}</span>
                ${(x.given || x.expected) ? `<span class="cl-err-r">${x.given
        ? `a répondu <b>${esc(x.given)}</b>` : ''}${(x.given && x.expected) ? ' · ' : ''}${x.expected
        ? `attendu <b>${esc(x.expected)}</b>` : ''}</span>` : ''}
                <span class="cl-err-n">${x.count} fois</span></li>`).join('')}</ul>`
        : '<p class="cl-vide">Aucune erreur en attente.</p>';

    return `
        <p class="cl-d-phrase">${esc(e.phrase)}</p>
        <div class="cl-d-kpis">
            <span><b>${e.questions}</b> questions</span>
            <span><b>${e.questions ? pc(e.reussite) : '—'}</b> de réussite</span>
            <span><b>${e.minutes}</b> min de travail</span>
            ${e.seances ? `<span><b>${e.seances}</b> séance${e.seances > 1 ? 's' : ''}</span>` : ''}
            ${e.joursDepuis !== null ? `<span>vu il y a <b>${e.joursDepuis}</b> j</span>` : ''}
        </div>
        ${comp.length ? `<h4 class="cl-d-titre">Compétences</h4>
        <table class="cl-detail"><tbody>${lignes}</tbody></table>` : ''}
        ${erreurs}`;
}

function ecranHtml() {
    const c = classeActive();
    const onglets = classes.map(x =>
        `<button type="button" class="cl-onglet${x.id === classeActiveId ? ' cl-onglet--actif' : ''}"
            data-classe="${x.id}">${esc(x.nom)}
            <span class="cl-onglet-n">${(x.eleves || []).length}</span></button>`).join('');

    const barre = `<div class="cl-barre-onglets">${onglets}
        <button type="button" class="cl-onglet cl-onglet--plus" data-nouvelle>+ Nouvelle classe</button></div>`;

    // LE BANDEAU DE DÉMONSTRATION, TANT QU'IL Y A DE FAUSSES CLASSES.
    // On ne doit jamais avoir à se demander si un chiffre est vrai : une
    // décision pédagogique prise sur des élèves inventés serait pire que pas
    // de tableau du tout.
    const demo = classes.some(x => x.demo)
        ? `<div class="cl-bandeau-demo">
            <span>⚠️ <b>Données de démonstration</b> — ces élèves n'existent pas.</span>
            <button type="button" class="cl-btn cl-btn--mini cl-btn--fin" data-effacer-demo>
                Tout effacer</button>
        </div>` : '';

    if (!c) {
        return barre + demo + `<p class="cl-vide">Crée une classe, puis dépose les fichiers de progression
            que tes élèves t'ont envoyés — un fichier par élève.</p>
            <p class="cl-vide">Pour voir à quoi ressemble l'écran plein, tu peux aussi
            <button type="button" class="cl-lien" data-demo>charger cinq classes de
            démonstration</button>. Elles s'effacent d'un clic.</p>`;
    }

    const b = bilanClasse(c);
    const eleve = b.eleves.find(e => e.id === eleveOuvertId);

    // LA PHRASE SE MET À CÔTÉ DU TABLEAU, ET UNE SEULE À LA FOIS.
    //
    // Rémy : « pourquoi pas une phrase à droite du tableau ». C'est la bonne
    // place — sous la grille, les vingt-quatre phrases ne se lisaient pas ; à
    // droite, celle de l'élève qu'on survole s'affiche pendant qu'on balaie,
    // sans jamais disputer la place au tableau.
    const premier = eleve || [...b.eleves].sort((a, z) => a.nom.localeCompare(z.nom, 'fr'))[0];
    return barre + demo + `
        <div class="cl-tete">
            <p class="cl-resume">${esc(b.phrase)}</p>
            <div class="cl-actions">
                <button type="button" class="cl-btn" data-ajouter>Déposer des progressions…</button>
                <button type="button" class="cl-btn cl-btn--fin" data-supprimer>Supprimer la classe</button>
            </div>
        </div>
        <div class="cl-corps">
            ${grilleHtml(b)}
            <aside class="cl-cote" data-cote>${coteHtml(premier)}</aside>
        </div>
        ${eleve ? `<div class="cl-detail-boite">
            <div class="cl-d-tete">
                <h3>${esc(eleve.nom)}</h3>
                <button type="button" class="cl-btn cl-btn--mini" data-renommer="${eleve.id}">Renommer</button>
                <!-- VOIR CE QU'IL VOIT — la démonstration à deux écrans, en un clic.
                     C'est le seul moyen de vérifier qu'une séance est bien
                     partie : le professeur donne, et rien à l'écran ne lui dit
                     ce que l'élève trouve en arrivant. Ce bouton rattache
                     l'appareil à cet élève et bascule sur son accueil.
                     ATTENTION, ET C'EST DIT DANS LA BOÎTE : c'est un REGARD,
                     pas une usurpation. Le travail fait ensuite reste celui de
                     cet appareil, pas celui de l'élève — ses résultats à lui
                     n'arrivent que par le fichier qu'il envoie. -->
                <button type="button" class="cl-btn cl-btn--mini" data-voir="${eleve.id}"
                    title="Voir l'écran d'accueil de cet élève">Voir son écran</button>
                <button type="button" class="cl-btn cl-btn--mini cl-btn--fin" data-retirer="${eleve.id}">Retirer</button>
                <button type="button" class="cl-fermer-detail" data-ferme aria-label="Fermer le détail">×</button>
            </div>
            ${detailHtml(eleve)}
        </div>` : ''}`;
}

// --- Actions ----------------------------------------------------------------

/**
 * VOIR L'ÉCRAN D'UN ÉLÈVE — la démonstration à deux écrans, en un clic.
 *
 * LE TROU QUE ÇA BOUCHE. Le professeur donne un parcours à une classe, et rien
 * ne lui dit ce que l'élève trouve en arrivant. On vérifie en ouvrant une
 * seconde fenêtre, en se rattachant à la main, en revenant… trois gestes qu'on
 * ne fait pas, donc une chaîne qu'on ne vérifie jamais.
 *
 * CE N'EST PAS UNE USURPATION, ET LA BOÎTE LE DIT. On rattache l'APPAREIL à cet
 * élève : on voit sa séance du jour, le mot qu'on lui a écrit, son avancement à
 * zéro. Mais le travail fait ensuite reste celui de cet appareil — les
 * résultats de l'élève, eux, n'arrivent que par le fichier qu'il envoie. Le
 * professeur qui ferait l'exercice « à sa place » ne changerait rien à son
 * bilan, et il vaut mieux qu'il le sache avant que de le découvrir.
 */
async function voirCommeEleve(eleveId) {
    const classe = classeActive();
    const eleve = classe && (classe.eleves || []).find(e => e.id === eleveId);
    if (!eleve) return;
    showConfirm(`Cet appareil va afficher l'écran de <b>${esc(eleve.nom)}</b> `
        + `(${esc(classe.nom)}) : sa séance du jour, et le mot que vous lui avez laissé.`
        + '<br><br>C\'est un REGARD, pas une usurpation : ce que vous feriez ensuite '
        + 'resterait le travail de cet appareil, et n\'entrerait pas dans son bilan.',
    async () => {
        const [{ lireLiens, rafraichir }, { rattacher }, { getActiveProfileId }] =
            await Promise.all([
                import('./maSeance.js'), import('../core/rattachement.js'),
                import('../core/profile.js')
            ]);
        await globalStore.set('rattachements',
            rattacher(await lireLiens(), getActiveProfileId(), classe, eleve));
        // ON QUITTE LE MODE PROFESSEUR : voir l'écran d'un élève depuis
        // l'atelier du professeur ne montrerait pas l'écran d'un élève.
        const nav = await import('./navigation.js');
        state.isTeacherMode = false;
        document.body.classList.remove('teacher-mode');
        nav.setTopNavMode('grid');
        // ET L'ON REFERME « MES CLASSES ». Laisser la fenêtre ouverte
        // par-dessus l'écran qu'on vient de demander, c'est ne rien montrer.
        if (modaleClasses) { modaleClasses.close(); modaleClasses = null; }
        await rafraichir();
        showToast(`Écran de ${eleve.nom}. Le lien se défait depuis l'accueil.`, 'success', 6000);
    });
}

/** Un ou plusieurs fichiers déposés d'un coup : toute la classe en une fois. */
function choisirFichiers() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.multiple = true;
    input.onchange = async () => {
        const c = classeActive();
        if (!c || !input.files || !input.files.length) return;
        let courante = c;
        const refus = [];
        let poses = 0;
        for (const f of input.files) {
            let data = null;
            try { data = JSON.parse(await f.text()); } catch (e) { data = null; }
            const lu = lireFichierEleve(data);
            if (!lu.ok) { refus.push(`${f.name} : ${lu.raison}`); continue; }
            // Le nom du fichier sert de repli : un export sans profil nommé
            // vaut mieux qu'un élève appelé « Élève ».
            const nom = lu.nom || f.name.replace(/^progression_/, '').replace(/\.json$/i, '');
            courante = poserEleve(courante, nom, lu.evenements);
            poses++;
        }
        await majClasse(courante);
        if (poses) showToast(`${poses} progression${poses > 1 ? 's' : ''} déposée${poses > 1 ? 's' : ''}.`);
        // On dit CE QUI a été refusé, et pourquoi : un fichier avalé en
        // silence, c'est un élève qui manquera au tableau sans qu'on sache.
        if (refus.length) showToast(refus.join(' · '), 'error', 6000);
    };
    input.click();
}

function brancher(racine) {
    // LE SURVOL MET À JOUR LE SEUL PANNEAU, ET NON L'ÉCRAN ENTIER. Redessiner
    // vingt-six lignes et leurs cent cinquante pastilles à chaque passage de
    // souris ferait clignoter la grille sous le curseur — et l'on ne balaie
    // plus une grille qui bouge.
    racine.onmouseover = (ev) => {
        const ligne = ev.target.closest('[data-eleve]');
        const cote = racine.querySelector('[data-cote]');
        if (!ligne || !cote) return;
        const c = classeActive();
        const b = c && bilanClasse(c);
        const e = b && b.eleves.find(x => x.id === ligne.dataset.eleve);
        if (!e || cote.dataset.pour === e.id) return;
        cote.dataset.pour = e.id;
        cote.innerHTML = coteHtml(e);
    };

    racine.onclick = async (ev) => {
        const el = ev.target.closest('[data-classe],[data-nouvelle],[data-ajouter],[data-supprimer],'
            + '[data-ouvre],[data-ferme],[data-retirer],[data-renommer],[data-demo],'
            + '[data-effacer-demo],[data-voir]');
        if (!el) return;

        // LES CINQ CLASSES DE DÉMONSTRATION. Elles ne se mêlent pas aux vraies :
        // elles portent une marque, un bandeau les annonce, et le bouton
        // d'effacement ne touche qu'à elles.
        if ('demo' in el.dataset) {
            const demos = classesDeDemo({});
            classes = [...classes.filter(x => !x.demo), ...demos];
            classeActiveId = (classes.find(x => x.demo) || {}).id || classeActiveId;
            eleveOuvertId = null;
            await enregistrer();
            // LES SÉANCES VIENNENT AVEC LES CLASSES. Sans elles, les cinq
            // classes ont des journaux mais aucune séance à laquelle les
            // rattacher : l'engrenage du parcours s'ouvrirait vide, et c'est
            // justement ce qu'on veut donner à voir.
            const { seancesDeDemo, PARCOURS_DEMO } = await import('../core/demoClasses.js');
            const { lireSeances, ecrireSeances } = await import('./donnerSeance.js');
            const autres = (await lireSeances()).filter(x => !x.demo);
            await ecrireSeances([...autres, ...seancesDeDemo(demos)]);
            await rangerParcoursDemo(PARCOURS_DEMO);
            showToast('Cinq classes de démonstration chargées, avec leur séance.', 'success');
            return rafraichir();
        }
        if ('effacer-demo' in el.dataset || el.dataset.effacerDemo !== undefined) {
            return showConfirm('Effacer toutes les classes de démonstration ?', async () => {
                classes = classes.filter(x => !x.demo);
                classeActiveId = classes.length ? classes[0].id : null;
                eleveOuvertId = null;
                await enregistrer();
                // Les séances de démonstration partent avec les classes : une
                // séance dont la classe n'existe plus n'est nulle part.
                const { lireSeances, ecrireSeances } = await import('./donnerSeance.js');
                await ecrireSeances((await lireSeances()).filter(x => !x.demo));
                state.teacherPaths = state.teacherPaths.filter(p => !p.demo);
                state.saveTeacherPaths();
                rafraichir();
            });
        }

        if (el.dataset.classe) { classeActiveId = el.dataset.classe; eleveOuvertId = null; return rafraichir(); }
        if ('nouvelle' in el.dataset) {
            const nom = prompt('Nom de la classe ?', 'Ma classe');
            if (nom === null) return;
            const c = creerClasse(nom);
            classes = [...classes, c];
            classeActiveId = c.id;
            await enregistrer();
            return rafraichir();
        }
        if ('ajouter' in el.dataset) return choisirFichiers();
        if ('supprimer' in el.dataset) {
            const c = classeActive();
            if (!c) return;
            return showConfirm(`Supprimer « ${c.nom} » et les progressions déposées ?`, async () => {
                classes = classes.filter(x => x.id !== c.id);
                classeActiveId = classes.length ? classes[0].id : null;
                eleveOuvertId = null;
                await enregistrer();
                rafraichir();
            });
        }
        if (el.dataset.ouvre) {
            eleveOuvertId = eleveOuvertId === el.dataset.ouvre ? null : el.dataset.ouvre;
            return rafraichir();
        }
        if (el.dataset.voir) return voirCommeEleve(el.dataset.voir);
        if ('ferme' in el.dataset) { eleveOuvertId = null; return rafraichir(); }
        if (el.dataset.retirer) {
            const c = classeActive();
            const eleve = (c.eleves || []).find(e => e.id === el.dataset.retirer);
            if (!c || !eleve) return;
            return showConfirm(`Retirer ${eleve.nom} de la classe ?`, async () => {
                eleveOuvertId = null;
                await majClasse(retirerEleve(c, eleve.id));
            });
        }
        if (el.dataset.renommer) {
            const c = classeActive();
            const eleve = (c.eleves || []).find(e => e.id === el.dataset.renommer);
            if (!c || !eleve) return;
            const nom = prompt('Nom de l\'élève ?', eleve.nom);
            if (nom === null) return;
            return majClasse(renommerEleve(c, eleve.id, nom));
        }
    };
}

// --- Point d'entrée ---------------------------------------------------------

export async function ouvrirClasses() {
    await chargerClasses();
    const modal = showModal('Mes classes', '<div id="cl-racine"></div>', { width: '1100px' });
    modaleClasses = modal;
    const racine = modal.element.querySelector('#cl-racine');
    rafraichir = () => {
        racine.innerHTML = ecranHtml();
        // Le détail vient d'apparaître sous la liste : on l'amène sous les yeux
        // plutôt que de laisser croire que le clic n'a rien fait.
        if (eleveOuvertId) {
            const d = racine.querySelector('.cl-detail-boite');
            if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };
    brancher(racine);
    rafraichir();
    return modal;
}

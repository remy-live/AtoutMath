// MES CLASSES — l'espace du professeur, dans l'application.
//
// Rémy : « honnêtement j'ai dû chercher où étaient mes classes […] le "Mes
// classes" de la zone professeur est tellement nul, il faut un vrai espace et
// là dans cet espace, je ne peux rien configurer », puis « Pour la zone gestion
// de mes classes, fais moi qqch de classe, de beau, de simple ».
//
// ── CE QU'ON A CHOISI, ET POURQUOI
//
// DEUX ÉCRANS, PAS DIX. Le premier montre les classes, le second montre UNE
// classe. On n'y descend jamais plus bas : un troisième niveau, c'est déjà se
// perdre. Dans la classe, trois onglets qui répondent aux trois questions qu'un
// professeur se pose vraiment — qui travaille en ce moment (Le direct), qui est
// dans ma classe et avec quel billet (La liste), et qu'est-ce que je leur dis
// (La séance).
//
// LE CODE DE CLASSE EST GROS. C'est ce qu'on dicte à trente élèves debout
// devant un tableau ; il n'a rien à faire en petites capitales grises. Il se
// copie d'un clic, parce qu'on le colle aussi dans un cahier de textes.
//
// LA PASTILLE VERTE DIT LA VÉRITÉ. « En ligne » se décide en comparant l'heure
// du serveur à la dernière venue — jamais l'horloge de la tablette, qui peut
// avoir dix minutes d'avance et faire disparaître la classe entière.
//
// ON NE DEMANDE JAMAIS DE CONFIRMATION POUR RIEN, et l'on en demande une
// écrite pour ce qui ne se défait pas. Vider une classe et la supprimer
// réclament le mot EFFACER, comme dans les pages d'administration : une fenêtre
// « êtes-vous sûr ? » se clique sans lire.
//
// ── CE QU'ON N'A PAS FAIT
//
// PAS DE TABLEAU DE BORD. On aurait pu ouvrir sur des courbes ; le professeur
// qui ouvre cet écran a trente élèves devant lui et vingt secondes. Les bilans
// existent, ils sont ailleurs, et c'est très bien.

import { showToast } from './modal.js';
// LE CATALOGUE SE COMPTE, IL NE SE RECOPIE PAS. Deux phrases de cet écran
// annonçaient « 172 exercices » ; le catalogue en contient 178 depuis qu'on y
// a mis la Seconde. Un nombre écrit à la main est un nombre qui devient faux
// le jour où l'on ajoute quelque chose — et personne ne s'en aperçoit, parce
// qu'aucun test ne lit une phrase.
import { exercices as catalogueComplet } from '../data/catalog.js';
import { demander, demanderTexte, choisirIndice } from './demander.js';
import { choisirLesColonnes } from './collerListeUI.js';
import { oublierLesClasses } from './donnerSeance.js';
import { nomDuProf } from '../core/verrouProf.js';
import {
    mesClasses, creerClasse, listeDeClasse, apercuDeListe, importerListe,
    nouveauCode, refaireLesCodes, retirerEleve, ecarterEleve, leDirect,
    renommerClasse, mettreEnPause, poserConsigne, viderClasse, supprimerClasse,
    seancesDeLaClasse,
    envoyerUnMot, soufflerUnIndice, reglerLeBac,
    creerUnProfesseur, lesProfesseurs, retirerUnProfesseur,
    lesReglages, reglerUnExercice, annulerUnReglage, estEnLigne, depuis,
    accorderLaCalculatrice, retirerLaCalculatrice,
    imposerLaSeance, lancerLeChrono, arreterLeChrono, auServeur, reglagesDuSite
} from '../core/espaceProf.js';
import { noterReglagesSite } from '../core/reglagesSite.js';
import { adresseAdmin } from './classesServeur.js';
import { adresseDuPoste } from './posteEleve.js';
import { versionLisible } from '../core/versionDuSite.js';
import { copieDEssai } from '../core/copieDEssai.js';
import { getExerciseById, skillsOf } from '../data/catalog.js';
import { state } from '../core/state.js';
import { getSkill } from '../data/skills.js';
import { indicesProposes } from '../core/indice.js';
import { enBref, avancementDeClasse, depuisCombien } from '../core/avancement.js';
import { lesAlarmes, trierPourLeMur, direLesAlarmes, vigilanceDe } from '../core/vigilance.js';
import { enMinutes } from './leMoment.js';
import { ficheDeLEleve, gestesPossibles, pourquoiDebloquer } from '../core/ficheEleve.js';
import { notionsAReprendre, resumeDeClasse, ordreDuBilan, enHeures } from '../core/bilanClasse.js';
import { getSkill as laCompetence } from '../data/skills.js';

/**
 * LE NOM DE L'EXERCICE, PAS SON IDENTIFIANT.
 *
 * Le serveur ne connaît que `calc-add` : il n'a pas le catalogue, et il n'a pas
 * à l'avoir. L'application, elle, l'a — c'est donc ici qu'on traduit. Un
 * professeur qui regarde ses rangs veut lire « Additions posées », pas un nom
 * de variable ; et si l'exercice a disparu du catalogue depuis, l'identifiant
 * brut vaut mieux que rien.
 */
function nomDExercice(id) {
    if (!id) return '';
    const exo = getExerciseById(id);
    return (exo && exo.title) || id;
}

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// --- L'état de l'écran, et rien d'autre -------------------------------------
//
// Tout tient dans cet objet : ce qu'on regarde, et ce que le serveur a répondu
// la dernière fois. Aucun état caché dans le DOM — c'est ce qui permet de tout
// redessiner sans se demander ce qu'on va perdre.
let vue = null;

/**
 * PRÉVENIR QUAND L'ÉLÈVE N'EST PAS LÀ.
 *
 * Rémy : « L'indice envoyé ne semble pas passer ». Il passait — le harnais de
 * bout en bout le vérifie à chaque essai, et il arrive en une seconde. Mais sa
 * capture disait « 0 en ligne sur 30 » et « il y a 2 h » : l'indice était bien
 * parti, il dormait sur le serveur, et personne n'était devant l'écran pour le
 * recevoir.
 *
 * RIEN NE LE LUI DISAIT, et c'est le vrai défaut. « Indice soufflé à Alicia »
 * laisse croire qu'elle l'a sous les yeux. Un message qui part vers quelqu'un
 * d'absent n'est pas une panne — c'est un message en attente, et il faut le
 * dire, sinon on croit que la fonction est cassée et on cesse de s'en servir.
 */
function direSiHorsLigne(eleveId, prenom, quoi) {
    const d = vue.direct;
    if (!d || !Array.isArray(d.eleves)) return;
    const e = d.eleves.find(x => x.id === eleveId);
    if (!e || estEnLigne(e.vu, d.maintenant)) return;
    showToast(`${quoi} est parti, mais ${prenom || 'cet élève'} n'est pas en ligne `
        + `(${depuis(e.vu, d.maintenant)}). Il le verra en se reconnectant.`, 'info');
}

/** Le minuteur du direct. On l'arrête en quittant : sinon il tourne pour rien. */
let battement = null;

function arreterLeBattement() {
    if (battement) { clearInterval(battement); battement = null; }
    // Le tic-tac du décompte part avec le battement : il n'a rien à faire sur
    // un écran qu'on vient de quitter, et il chercherait un élément disparu.
    arreterLeTicTac();
}

// --- Point d'entrée ---------------------------------------------------------

/**
 * REFERMER LA PIÈCE — appelé par la croix, par Échap, et par la porte
 * « Préparer ». Le battement du direct s'arrête ici et nulle part ailleurs :
 * une requête toutes les dix secondes qui survit à la sortie d'écran est
 * exactement le genre de chose qu'on ne remarque jamais.
 */
export function fermerEspaceClasses() {
    arreterLeBattement();
    document.dispatchEvent(new CustomEvent('classe_fermee'));
    const zone = document.getElementById('zone-classe');
    if (zone) { zone.hidden = true; zone.innerHTML = ''; }
    document.body.classList.remove('classe-ouverte');
}

export async function ouvrirEspaceClasses() {
    vue = { ou: 'classes', classes: null, erreur: '', classe: null, onglet: 'direct',
            liste: null, direct: null, apercu: null, profs: null, reglages: null,
            // Les réglages du SITE — `null` tant que le serveur n'a pas répondu,
            // ce qui n'est pas la même chose que « tout est éteint ».
            reglagesSite: null,
        // L'élève dont la fiche est dépliée dans Le direct — un seul à la fois.
        fiche: null,
        // LES ÉLÈVES COCHÉS dans Le direct. Un ensemble, pas une liste : on y
        // entre et l'on en sort par le même geste, trente fois dans l'heure.
        // Il survit au battement de dix secondes (les cases sont redessinées
        // d'après lui) mais pas au changement de classe.
        choisis: new Set(),
            bilans: null, seances: null, occupe: false };

    // UNE PIÈCE, PAS UNE FENÊTRE.
    //
    // Rémy : « tu es toujours sur des popup, tu n'avais pas dit que tu
    // travaillais en onglet ? ». C'était juste : la porte portait un nom, mais
    // elle ouvrait encore une fenêtre par-dessus l'atelier.
    //
    // Une fenêtre est faite pour UNE décision courte : on la lit, on tranche,
    // elle disparaît. Cet écran-ci a trois onglets, trente élèves et un direct
    // qui bat toutes les dix secondes — on y passe l'heure. Il prend donc la
    // place de l'atelier au lieu de se poser dessus : pas de voile gris, la
    // barre du haut reste atteignable, et l'on revient par la porte
    // « Préparer », au même endroit que l'aller.
    const zone = document.getElementById('zone-classe');
    if (!zone) return;
    zone.innerHTML = '<div id="ec-racine" class="ec"></div>';
    zone.hidden = false;
    document.body.classList.add('classe-ouverte');
    document.dispatchEvent(new CustomEvent('classe_ouverte'));

    const partir = () => fermerEspaceClasses();
    // LA PORTE « PRÉPARER » FERME CETTE PIÈCE, et elle le demande par un
    // ÉVÉNEMENT plutôt qu'en important ce module.
    //
    // Elle l'importait, et la fermeture ne se faisait pas : le module se
    // charge à la demande, et le clic partait avant qu'il ne soit là. Mesuré —
    // la fonction appelée à la main refermait parfaitement, le même clic ne
    // refermait rien. Un événement part tout de suite, et n'existe que tant que
    // la pièce est ouverte : quand elle est fermée, personne n'écoute, et c'est
    // exactement ce qu'on veut.
    document.addEventListener('fermer_la_classe', partir, { once: true });
    const racine = zone.querySelector('#ec-racine');
    const redessiner = () => { racine.innerHTML = ecranHtml(); };

    racine.addEventListener('click', (e) => {
        if (e.target.closest('[data-fermer]')) { partir(); return; }
        brancher(e, redessiner);
    });
    // ENTRÉE VALIDE LE CHAMP OÙ L'ON EST. Taper une consigne puis chercher le
    // bouton à la souris, c'est une marche pour rien — et c'est la marche qu'on
    // fait vingt fois par heure pendant une séance.
    racine.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !e.target.dataset.valideSurEntree) return;
        e.preventDefault();
        const b = racine.querySelector('[' + e.target.dataset.valideSurEntree + ']');
        if (b) b.click();
    });
    // Échap ferme, comme partout ailleurs.
    racine.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') partir();
    });

    redessiner();

    const liste = await mesClasses();
    if (liste.erreur) vue.erreur = liste.erreur;
    else vue.classes = liste;
    redessiner();

    // LES RÉGLAGES DU SITE, APRÈS LES CLASSES. Ce sont les classes qu'on vient
    // voir ; le mode libre est en bas de l'écran, et rien ne presse. Une seule
    // requête, et l'interrupteur cesse d'annoncer « On regarde… ».
    const r = await reglagesDuSite();
    if (!r.erreur && r.reglages) {
        vue.reglagesSite = r.reglages;
        // Le reste de l'application l'apprend aussi : la porte d'entrée, la
        // barre du haut. C'est le même réglage pour tout le monde.
        noterReglagesSite(r.reglages);
        redessiner();
    }

    // Il n'y a plus de fenêtre à rendre : la pièce est une section de la page.
    return { fermer: partir };
}

// --- Le dessin --------------------------------------------------------------

function ecranHtml() {
    if (vue.ou === 'profs') return profsHtml();
    if (vue.ou === 'classe' && vue.classe) return classeHtml();
    return classesHtml();
}

/**
 * LES PROFESSEURS DU SERVEUR.
 *
 * Rémy : « que je puisse créer un professeur ».
 *
 * ON MONTRE LA LISTE, ET PAS SEULEMENT LE BOUTON QUI AJOUTE. Une porte qui
 * s'ouvre doit pouvoir se refermer : créer un collègue était possible et le
 * défaire ne l'était pas — la seule issue passait par la ligne de commande,
 * qu'un hébergement mutualisé n'offre pas. Une adresse mal tapée restait donc
 * là pour toujours, avec le droit d'en créer d'autres.
 */
function profsHtml() {
    const liste = vue.profs;
    const jeSuisLeFondateur = !!vue.fondateur;
    let corps;
    if (!liste) {
        corps = '<div class="ec-vide">On regarde…</div>';
    } else {
        corps = `<table class="ec-table">
            <thead><tr><th>Professeur</th><th>Adresse</th><th>Classes</th><th></th></tr></thead>
            <tbody>${liste.map(t => `
            <tr>
                <td><b>${esc(t.nom)}</b>${t.moi ? ' <span class="ec-note">(vous)</span>' : ''}</td>
                <td><code>${esc(t.email)}</code></td>
                <td class="ec-note">${t.classes || 0}</td>
                <td class="ec-actions">${(t.moi || !jeSuisLeFondateur) ? ''
                    : `<button type="button" class="ec-mini ec-mini--rouge"
                               data-retirer-prof="${esc(t.id)}" data-nom="${esc(t.nom)}"
                               data-classes="${t.classes || 0}">retirer</button>`}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    }
    return enTeteHtml('Les professeurs', 'Ceux qui peuvent ouvrir ce serveur', true) + messageHtml()
        + `<div class="ec-corps">
            ${jeSuisLeFondateur ? `<div class="ec-outils">
                <button type="button" class="ec-bouton" data-nouveau-prof>+ Ajouter un professeur</button>
            </div>` : ''}
            ${corps}
            <p class="ec-note ec-note--bloc">Chacun ne voit que SES classes : il ne peut ni lire
               ni modifier les vôtres.
               ${jeSuisLeFondateur
                    ? 'Retirer quelqu\'un vous laisse le choix — reprendre ses classes, ou les '
                      + 'effacer avec leurs élèves.'
                    : 'Ajouter ou retirer un compte revient au professeur qui a installé le '
                      + 'site : ces gestes-là touchent au serveur entier, pas à une classe.'}</p>
        </div>`;
}

/** L'en-tête, commun aux deux écrans : qui l'on est, et par où l'on revient. */
function enTeteHtml(titre, sous, retour = false) {
    return `
    <header class="ec-tete">
        <div class="ec-tete-gauche">
            ${retour ? '<button type="button" class="ec-retour" data-retour '
                + 'aria-label="Revenir à mes classes">←</button>' : ''}
            <div>
                <h1 class="ec-titre">${esc(titre)}</h1>
                <p class="ec-sous">${sous}</p>
            </div>
        </div>
        <div class="ec-tete-droite">
            <span class="ec-qui">${esc(nomDuProf() || 'Professeur')}</span>
            <button type="button" class="ec-fermer" data-fermer
                    aria-label="Fermer">&times;</button>
        </div>
    </header>`;
}

function messageHtml() {
    if (!vue.erreur) return '';
    return `<div class="ec-alerte">${esc(vue.erreur)}</div>`;
}

// ---------------------------------------------------------------- Écran 1 ---

function classesHtml() {
    const n = Array.isArray(vue.classes) ? vue.classes.length : 0;
    // ON NE DIT PAS « AUCUNE CLASSE » QUAND ON N'A PAS PU REGARDER.
    //
    // C'est la différence entre « je sais qu'il n'y en a pas » et « je ne sais
    // pas », et les confondre coûte cher : l'écran proposait « Créez votre
    // première classe » à un professeur qui en a deux mais dont la requête
    // venait d'échouer. Il en aurait créé une en double, avec un code de plus à
    // dicter, sans jamais comprendre pourquoi.
    const raté = vue.erreur && vue.classes === null;
    const sous = raté
        ? 'On n\'a pas pu lire vos classes'
        : (vue.classes === null
            ? 'On regarde…'
            : (n ? `${n} classe${n > 1 ? 's' : ''} sur ce serveur`
                 : 'Aucune classe pour l\'instant'));

    let corps;
    if (raté) {
        corps = `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Vos classes sont intactes.</p>
            <p>C'est la lecture qui a échoué, pas elles. Rien n'a été perdu, et
               il n'y a rien à recréer.</p>
            <button type="button" class="ec-bouton ec-bouton--grand" data-reessayer>
                Réessayer
            </button>
        </div>`;
    } else if (vue.classes === null) {
        corps = '<div class="ec-vide">On regarde ce que le serveur a…</div>';
    } else if (!n) {
        // L'ÉCRAN VIDE EST UNE INVITATION, PAS UN CONSTAT. C'est le premier
        // écran que Rémy verra à la rentrée prochaine : il doit dire quoi faire.
        corps = `
        <div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Créez votre première classe.</p>
            <p>Vous obtiendrez un <b>code à dicter</b> — vos élèves entrent avec lui,
               sans compte à créer — et une liste où <b>coller vos élèves</b>
               depuis Pronote ou un tableur.</p>
            <button type="button" class="ec-bouton ec-bouton--grand" data-nouvelle-classe>
                Créer une classe
            </button>
        </div>`;
    } else {
        corps = `<div class="ec-grille">
            ${vue.classes.map(carteClasseHtml).join('')}
            <button type="button" class="ec-carte ec-carte--ajout" data-nouvelle-classe>
                <span class="ec-plus">+</span>
                <span>Nouvelle classe</span>
            </button>
        </div>`;
    }

    return enTeteHtml('Mes classes', esc(sous)) + messageHtml() + corps
        + modeLibreHtml() + piedHtml();
}

function carteClasseHtml(c) {
    const n = Number(c.student_count) || 0;
    return `
    <div class="ec-carte" data-ouvrir="${esc(c.id)}" role="button" tabindex="0">
        <div class="ec-carte-haut">
            <b class="ec-carte-nom">${esc(c.name)}</b>
            ${c.level ? `<span class="ec-niveau">${esc(c.level)}</span>` : ''}
        </div>
        <div class="ec-carte-code">
            <span class="ec-code-eti">code de classe</span>
            <button type="button" class="ec-code ec-code--copie" data-copier="${esc(c.join_code)}"
                    title="Copier le code">${esc(c.join_code)}</button>
        </div>
        <div class="ec-carte-bas">
            <span class="ec-eff">${n} élève${n > 1 ? 's' : ''}</span>
            ${Number(c.locked) ? '<span class="ec-pastille ec-pastille--pause">en pause</span>' : ''}
            ${c.notice ? '<span class="ec-pastille ec-pastille--mot">consigne</span>' : ''}
            <!-- SUPPRIMER DEPUIS LA LISTE, LÀ OÙ ON LES VOIT TOUTES.
                 Rémy : « il faudrait pouvoir supprimer les classes ». Le geste
                 existait — au fond de l'onglet « La séance », À L'INTÉRIEUR de
                 la classe. C'est le bon endroit pour supprimer CELLE qu'on
                 regarde, et le mauvais pour faire le ménage : ranger ses
                 classes, c'est les voir toutes en même temps, et il fallait
                 entrer dans chacune puis en ressortir.

                 IL RESTE DISCRET, ET IL DEMANDE LE MÊME MOT ÉCRIT. Une croix
                 sur une carte qu'on clique pour ENTRER est un piège à
                 fausse manœuvre : elle est petite, à l'écart, et elle passe
                 par la même confirmation qu'ailleurs — écrire EFFACER. -->
            <button type="button" class="ec-carte-jeter" data-supprimer-carte="${esc(c.id)}"
                    data-nom="${esc(c.name)}" title="Supprimer cette classe"
                    aria-label="Supprimer la classe ${esc(c.name)}">✕</button>
        </div>
    </div>`;
}

/**
 * LE MODE LIBRE — un réglage du SITE, pas d'une classe.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Rémy : « le mode libre, mets-le en bouton dans ma zone prof (qui est admin
 * aussi du coup) ».
 *
 * CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS. Allumé, le catalogue s'ouvre aux
 * élèves : une quatrième porte « Explorer les exercices » sur l'écran d'accueil,
 * l'onglet « Exercices », tout le catalogue. Éteint, l'élève ne voit que ce
 * qu'on lui a donné.
 *
 * IL NE PASSE PAS PAR-DESSUS LE VERROU D'UNE CLASSE. Une classe verrouillée
 * reste verrouillée, mode libre ou non — c'est le réglage le plus précis qui
 * gagne, et c'est celui du professeur devant sa classe.
 *
 * POURQUOI ICI ET PAS DANS UNE CLASSE. Parce qu'il ne concerne pas une classe :
 * il concerne le site. Le poser dans l'écran d'une classe laisserait croire
 * qu'on l'allume pour les 5eB seulement.
 */
function modeLibreHtml() {
    const actif = !!vue.reglagesSite && vue.reglagesSite.modeLibre === true;
    const su = vue.reglagesSite === null;
    return `
    <section class="ec-bloc ec-bloc--site">
        <h3 class="ec-h3">Le catalogue en libre accès</h3>
        <p class="ec-note ec-note--bloc">Allumé, les élèves peuvent explorer les
           ${catalogueComplet.length} exercices en dehors de ce que vous leur
           donnez. Une classe verrouillée le reste : ce réglage-ci ne passe pas
           par-dessus.</p>
        <button type="button" class="reglage-interrupteur${actif ? ' reglage-interrupteur--actif' : ''}"
                data-mode-libre="${actif ? '1' : '0'}" aria-pressed="${actif}"
                ${su ? 'disabled' : ''}>
            <span class="reglage-interrupteur-piste" aria-hidden="true"><span></span></span>
            <span class="reglage-interrupteur-mot">${su ? 'On regarde…'
                : (actif ? 'Ouvert aux élèves' : 'Réservé à ce que vous donnez')}</span>
        </button>
    </section>
    ${inscriptionHtml()}`;
}

/**
 * L'INSCRIPTION LIBRE — la porte « Rejoindre ma classe ».
 *
 * RÉMY, en la découvrant : « à quoi sert rejoindre ma classe ? »… puis « je
 * pense qu'il faut le fermer, mais permettre la réouverture dans Mes classes,
 * au même niveau que le catalogue en libre accès ».
 *
 * AU MÊME NIVEAU, DONC : même écran, même interrupteur, un seul endroit à
 * regarder pour savoir ce qui est ouvert. Les deux réglages ne font pourtant
 * pas la même chose, et l'écran doit le dire — l'un ouvre un CATALOGUE, l'autre
 * CRÉE DES ÉLÈVES. C'est pour cela que celui-ci est fermé par défaut et que
 * l'autre ne l'est pas.
 */
function inscriptionHtml() {
    const actif = !!vue.reglagesSite && vue.reglagesSite.inscriptionLibre === true;
    const su = vue.reglagesSite === null;
    return `
    <section class="ec-bloc ec-bloc--site">
        <h3 class="ec-h3">L'inscription libre</h3>
        <p class="ec-note ec-note--bloc">Allumée, un élève peut entrer avec le code de la
           classe en tapant son prénom — pratique quand vous n'avez pas importé de liste.
           Éteinte, seuls les billets ouvrent la porte. <b>Gardez-la éteinte si votre liste
           vient de Pronote</b> : un prénom tapé de travers crée un second élève, vierge,
           à côté du vrai.</p>
        <button type="button" class="reglage-interrupteur${actif ? ' reglage-interrupteur--actif' : ''}"
                data-inscription-libre="${actif ? '1' : '0'}" aria-pressed="${actif}"
                ${su ? 'disabled' : ''}>
            <span class="reglage-interrupteur-piste" aria-hidden="true"><span></span></span>
            <span class="reglage-interrupteur-mot">${su ? 'On regarde…'
                : (actif ? 'Chacun peut s\'inscrire' : 'Billet obligatoire')}</span>
        </button>
    </section>`;
}

/** Le pied de page : les deux chemins qu'on ne veut pas cacher. */
function piedHtml() {
    return `
    <footer class="ec-pied">
        <button type="button" class="ec-lien" data-profs>Les professeurs</button>
        <span class="ec-pied-sep">·</span>
        <!-- LES PAGES D'ADMINISTRATION EXISTENT TOUJOURS, et c'est voulu :
             elles marchent sans JavaScript, sur le poste de l'établissement,
             dans un navigateur inconnu. On donne le chemin, on ne le cache
             pas — mais on n'y envoie plus personne pour les gestes courants. -->
        <a class="ec-lien" href="${esc(adresseAdmin())}index.php" target="_blank" rel="noopener">
            Santé du site &amp; sauvegardes
        </a>
        <!-- LE NUMÉRO DE VERSION, ENFIN VISIBLE. Il manquait, et son absence a
             coûté une demi-journée : Rémy regardait un écran, je lui décrivais un
             bouton, et personne ne pouvait dire que son serveur servait encore
             la version d'avant. Il est ici parce que c'est ici qu'on en a
             besoin — sur l'écran du professeur, au moment où quelque chose ne
             ressemble pas à ce qu'on lui a décrit. -->
        <span class="ec-pied-version" title="La version que ce navigateur a reçue du serveur"
              >${esc(versionLisible())}${copieDEssai() ? ' · copie d\'essai' : ''}</span>
    </footer>`;
}

// ---------------------------------------------------------------- Écran 2 ---

function classeHtml() {
    const c = vue.classe;
    const eleves = (vue.liste && vue.liste.eleves) || [];
    const info = (vue.liste && vue.liste.classe) || c;
    const sous = `<code class="ec-code ec-code--petit">${esc(c.join_code || info.joinCode || '')}</code>`
        + `<span class="ec-sous-sep">·</span>${eleves.length} élève${eleves.length > 1 ? 's' : ''}`
        + (info.locked ? '<span class="ec-sous-sep">·</span><b>en pause</b>' : '');

    const onglet = (cle, texte) => `<button type="button"
        class="ec-onglet${vue.onglet === cle ? ' ec-onglet--actif' : ''}"
        data-onglet="${cle}">${texte}</button>`;

    let corps = '';
    if (vue.onglet === 'mur') corps = murHtml();
    else if (vue.onglet === 'liste') corps = listeHtml();
    else if (vue.onglet === 'bilans') corps = bilansHtml();
    else if (vue.onglet === 'seances') corps = seancesHtml();
    else corps = directHtml();

    return enTeteHtml(info.name || c.name, sous, true) + messageHtml() + `
    <nav class="ec-onglets">
        ${onglet('direct', 'Le direct')}
        ${onglet('mur', 'Le mur')}
        ${onglet('seances', 'Les séances')}
        ${onglet('liste', 'Les élèves')}
        ${onglet('bilans', 'Les bilans')}
    </nav>
    <div class="ec-corps">${corps}</div>`;
}

// --- Onglet « Le direct » ---------------------------------------------------

function directHtml() {
    if (!vue.direct) return '<div class="ec-vide">On regarde qui travaille…</div>';
    const { eleves, maintenant } = vue.direct;
    if (!eleves.length) {
        return `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Personne dans cette classe pour l'instant.</p>
            <p>Dictez le code de classe, ou collez votre liste dans l'onglet
               <b>Les élèves</b>.</p>
        </div>`;
    }
    const enLigne = eleves.filter(e => estEnLigne(e.vu, maintenant)).length;

    // L'AVANCEMENT DE LA CLASSE, EN UNE LIGNE ET TROIS NOMBRES.
    //
    // Rémy : « il faut que la séance soit facilement visible l'avancement ». La
    // question qu'il se pose en fin d'exercice est « est-ce que je peux passer
    // à la suite ? », et elle se tranche sur un seul chiffre : combien n'ont
    // pas commencé. Trente barres individuelles ne la répondent pas — il faut
    // les lire une à une, et c'est justement ce qu'on n'a pas le temps de
    // faire debout au fond de la salle.
    const cl = avancementDeClasse(eleves.map(e => e.avancement || null));
    const pourcent = Math.round(cl.fraction * 100);
    // CE QU'ILS FONT N'EST PAS CE QUE J'AI IMPOSÉ, ET IL FAUT LE DIRE.
    //
    // Rémy : « Dans la classe, on ne voit que le parcours découverte ». C'était
    // exact et trompeur à la fois : ce titre est le nom du parcours que les
    // élèves ont RÉELLEMENT ouvert — leur dernier travail —, pas celui qu'on
    // leur a donné. Tant qu'aucune séance n'est imposée, chacun choisit dans sa
    // liste, et le direct montre ce que fait la majorité. On nomme donc les
    // deux, séparément, plutôt que de laisser croire que c'est la même chose.
    const fait = (eleves.find(e => e.avancement && e.avancement.pathName) || {}).avancement;
    const info = (vue.liste && vue.liste.classe) || {};
    const imposee = info.impose_path_id
        && (vue.seances && (vue.seances.seances || []).find(s => s.pathId === info.impose_path_id));

    // TROIS ZONES, ET C'EST LE BATTEMENT QUI L'EXIGE.
    //
    // Le battement de dix secondes réécrivait TOUT le direct, barre de pilotage
    // comprise. Or cette barre porte des champs qu'on est en train de remplir :
    // le mot à la classe, le mot au tableau, le nombre de minutes, et un
    // `<details>` qu'on vient d'ouvrir. Écrire « Prenez le cahier rouge » prend
    // plus de dix secondes : le texte disparaissait sous les doigts du
    // professeur, et le repli se refermait avec.
    //
    // On sépare donc ce qui change TOUT SEUL — l'alarme, les compteurs, les
    // rangs — de ce que le professeur MANIPULE. Le battement ne touche plus
    // qu'au premier.
    return `<div class="ec-direct-haut">` + alarmeHtml(eleves, maintenant) + `
    <p class="ec-compte">${enLigne} en ligne sur ${eleves.length}
       <span class="ec-note">— actualisé tout seul</span></p>
    ${info.impose_path_id
        ? `<p class="ec-note ec-note--bloc ec-encours-fil">Séance en cours :
            <b>${esc(imposee ? imposee.nom : 'une séance imposée')}</b> — elle s'ouvre toute
            seule chez eux, ${esc(jusquaDit())}.</p>`
        : `<p class="ec-note ec-note--bloc ec-encours-fil">Aucune séance imposée : chacun
            choisit dans sa liste. Pour en imposer une, allez dans
            <b>Les séances</b>.</p>`}
    <div class="ec-classe-avance">
        <div class="ec-classe-ligne">
            <b>${fait ? esc(fait.pathName) : 'La séance'}</b>
            <span class="ec-note">— ce qu'ils font</span>
            <span class="ec-classe-chiffres">
                <span class="ec-pastille ec-pastille--fini">${cl.finis} ${
                    cl.finis > 1 ? 'ont fini' : 'a fini'}</span>
                <span class="ec-pastille ec-pastille--cours">${cl.enCours} en cours</span>
                <span class="ec-pastille${cl.pasCommence ? ' ec-pastille--rien' : ''}"
                    >${cl.pasCommence} pas commencé</span>
            </span>
        </div>
        <div class="ec-jauge" title="${pourcent} % du travail de la classe">
            <i style="width:${pourcent}%"></i>
        </div>
    </div>
    </div>
    ${barrePiloteHtml()}
    <!-- CEUX QU'IL FAUT ALLER VOIR SONT EN HAUT.
         Le direct rangeait ses élèves par ordre alphabétique — celui de la
         liste du professeur. Un élève arrêté dont le nom commence par V est
         donc en bas, hors de l'écran, pendant que la bande d'alarme le nomme
         en haut : on lit son prénom, on ne le trouve pas, on fait défiler.
         Le tri par urgence existe déjà, il est écrit, éprouvé et documenté
         (core/vigilance.js), et le MUR s'en sert depuis toujours. Le direct
         ne l'appelait pas. -->
    <div class="ec-rangs">
        ${trierPourLeMur(eleves, maintenant, { enPause: classeEnPause() })
            .map(v => rangHtml(v.eleve, maintenant)).join('')}
    </div>`;
}

/**
 * LA BARRE D'UN ÉLÈVE, ET CE QU'ELLE DIT EN PLUS DE SE REMPLIR.
 *
 * Une barre seule ne distingue pas l'élève qui avance lentement de celui qui
 * est bloqué depuis dix minutes — et c'est POURTANT LA SEULE DIFFÉRENCE QUI
 * COMPTE : le premier n'a besoin de personne, le second attend qu'on vienne.
 * On écrit donc à côté depuis combien de temps il n'a plus répondu.
 *
 * (L'alarme proprement dite — celle qui va CHERCHER le professeur au lieu
 * d'attendre qu'il lise — reste à faire. Ici on ne fait que le dire.)
 */
function avanceHtml(av, quand, maintenant) {
    if (!av) return '<span class="ec-note ec-pasparti">Pas commencé</span>';
    const p = Math.round((av.fraction || 0) * 100);
    const classe = av.etat === 'fini' ? ' ec-jauge--fini'
        : (av.etat === 'abandonne' ? ' ec-jauge--arrete' : '');

    // DEPUIS QUAND N'A-T-IL PLUS RÉPONDU. `quand` est l'instant du dernier
    // événement portant un exercice — c'est-à-dire de la dernière réponse.
    // On ne l'écrit que passé une minute et sur un travail en cours : sur un
    // parcours terminé, « il y a 6 min » désignerait la dernière question d'un
    // devoir rendu, ce qui n'inquiète personne et encombre la ligne.
    const silence = (quand && maintenant && av.etat === 'en-cours')
        ? Math.max(0, maintenant - Math.round(quand / 1000)) : 0;
    const muet = silence >= 60
        ? ` <span class="ec-silence">· rien depuis ${esc(depuisCombien(silence))}</span>` : '';

    return `<div class="ec-avance">
        <div class="ec-jauge ec-jauge--mince${classe}"><i style="width:${p}%"></i></div>
        <span class="ec-avance-mot">${esc(enBref(av))}${muet}</span>
    </div>`;
}

/**
 * LA LIGNE D'UN ÉLÈVE — ET CE QU'ELLE CACHE.
 *
 * Rémy : « il faut aussi pouvoir cliquer sur l'élève, voir où il en est,
 * débloquer un exercice, envoyer un message ».
 *
 * LA FICHE SE DÉPLIE SOUS LA LIGNE, ELLE NE RECOUVRE RIEN. Cet écran se lit
 * debout, au fond de la salle. Si ouvrir la fiche d'un élève faisait perdre les
 * vingt-neuf autres, on ne l'ouvrirait pas pendant le cours — et un geste qu'on
 * n'ose pas faire en classe n'existe pas.
 *
 * UNE SEULE FICHE À LA FOIS, pour la même raison : trois fiches ouvertes, et la
 * liste des élèves ne tient plus à l'écran.
 */
function rangHtml(e, maintenant) {
    const ici = estEnLigne(e.vu, maintenant);
    const v = vigilanceDe(e, maintenant, { enPause: classeEnPause() });
    const ouverte = vue.fiche === e.id;
    const score = e.total
        ? `<span class="ec-score${e.justes / e.total >= 0.7 ? ' ec-score--bien' : ''}">${e.justes} / ${e.total}</span>`
        : '';
    return `
    <div class="ec-rang-hote${ouverte ? ' ec-rang-hote--ouverte' : ''}">
    <div class="ec-rang ec-rang--cliquable${ici ? ' ec-rang--ici' : ''}${e.ecarte ? ' ec-rang--ecarte' : ''}${
        v.etat === 'bloque' ? ' ec-rang--bloque' : (v.etat === 'ralenti' ? ' ec-rang--ralenti' : '')}"
        data-fiche="${esc(e.id)}" role="button" tabindex="0"
        aria-expanded="${ouverte ? 'true' : 'false'}"
        title="Voir o\u00f9 en est ${esc(e.prenom)}">
        <!-- LA CASE NE FAIT PAS PARTIE DU BOUTON : cliquer la ligne ouvre la
             fiche, cocher la case choisit l'élève. Les deux gestes sont à deux
             centimètres l'un de l'autre, et le second ne doit pas déclencher le
             premier — voir data-choix dans les gestes. -->
        <span class="ec-choix" title="Choisir ${esc(e.prenom)}">
            <input type="checkbox" data-choix="${esc(e.id)}"
                   aria-label="Choisir ${esc(e.prenom)}"
                   ${(vue.choisis && vue.choisis.has(e.id)) ? 'checked' : ''}>
        </span>
        <span class="ec-point${ici ? ' ec-point--vert' : ''}"></span>
        <div class="ec-rang-qui">
            <b>${esc(e.prenom)}</b>
            <!-- « A FINI », ÉCRIT À CÔTÉ DU NOM.
                 Rémy : « tu peux aussi écrire dans le direct au nom de l eleve
                 quand il a fini ». L information existait — « Terminé — 18 / 24
                 justes » — mais dans la colonne d avancement, à droite, sous une
                 jauge pleine. Or la question qu on se pose en marchant dans les
                 rangs est « qui a fini ? », et on la pose aux NOMS. Elle se lit
                 donc là où l oeil arrive. (Pas de guillemet oblique ici : ce
                 commentaire est DANS un gabarit.) -->
            ${aFini(e) ? '<span class="ec-fini">a fini</span>' : ''}
            <span class="ec-rang-quand">${esc(depuis(e.vu, maintenant))}</span>
        </div>
        <div class="ec-rang-quoi">
            ${e.exo ? `<span class="ec-exo">${esc(nomDExercice(e.exo))}</span>`
                    : '<span class="ec-note">—</span>'}
            ${avanceHtml(e.avancement, e.quand, maintenant)}
        </div>
        ${score}
        <span class="ec-rang-gestes">
            <button type="button" class="ec-mini" data-mot-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}" title="Lui écrire un mot">mot</button>
            <button type="button" class="ec-mini ec-mini--indice" data-indice-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}" data-exo="${esc(e.exo || '')}"
                    title="Lui souffler un coup de pouce, sans l'interrompre">indice</button>
        </span>
    </div>
    ${ouverte ? ficheHtml(e, maintenant) : ''}
    </div>`;
}

/**
 * LA FICHE : où il en est, ce qu'il a fait, et ce qu'on peut faire pour lui.
 *
 * Ce n'est PAS son bilan. Le bilan répond à « qu'est-ce que je reprends
 * lundi » et se lit assis ; celle-ci répond à « qu'est-ce que je fais pour lui,
 * là » et se lit debout, en dix secondes. Tout ce qui ne sert pas cette
 * décision-là encombre — voir `js/core/ficheEleve.js`.
 */
function ficheHtml(e, maintenant) {
    const f = ficheDeLEleve(e, maintenant, { enPause: classeEnPause() });
    const g = gestesPossibles(f);
    const pourquoi = pourquoiDebloquer(f);

    const cases = f.etapes.map(x => `<span class="ec-fiche-pas ec-fiche-pas--${x.etat}"
        title="\u00c9tape ${x.rang}${x.titre ? ' \u2014 ' + esc(x.titre) : ''} : ${MOT_ETAPE[x.etat]}"
        >${x.rang}</span>`).join('');

    return `
    <div class="ec-fiche" data-fiche-de="${esc(e.id)}">
        <div class="ec-fiche-haut">
            <div>
                <p class="ec-fiche-ou">${esc(f.ou)}</p>
                ${f.parcours ? `<p class="ec-note">dans <b>${esc(f.parcours)}</b></p>` : ''}
            </div>
            ${f.silenceDit ? `<span class="ec-fiche-silence${f.trop ? ' ec-fiche-silence--trop' : ''}"
                >rien depuis ${esc(f.silenceDit)}</span>` : ''}
        </div>

        ${cases ? `<div class="ec-fiche-pas-rangee" role="list"
                        aria-label="Les \u00e9tapes de son parcours">${cases}</div>` : ''}
        ${f.question ? `<p class="ec-fiche-question">${esc(f.question)}</p>` : ''}

        ${pourquoi ? `<p class="ec-fiche-conseil">${esc(pourquoi)}</p>` : ''}

        <div class="ec-fiche-gestes">
            <button type="button" class="ec-bouton ec-bouton--doux" data-mot-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}"${g.mot ? '' : ' disabled'}>Lui \u00e9crire</button>
            <button type="button" class="ec-bouton ec-bouton--doux" data-indice-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}" data-exo="${esc(e.exo || '')}"${
                    g.indice ? '' : ' disabled'}>Coup de pouce</button>
            <button type="button" class="ec-bouton ec-bouton--doux" data-voir-exo="${esc(e.exo || '')}"
                    data-prenom="${esc(e.prenom)}"${g.indice ? '' : ' disabled'}
                    title="Son \u00e9tape, avec SES r\u00e9glages, ouverte chez vous. Les nombres sont tir\u00e9s au sort : c'est le m\u00eame travail, pas la m\u00eame question. Pour voir ce qu'il a sous les yeux, c'est « Ouvrir son poste », dans Les \u00e9l\u00e8ves."
                    >Son exercice, chez moi</button>
            <button type="button" class="ec-bouton" data-saut-eleve="${esc(e.id)}"
                    data-exo="${esc(e.exo || '')}" data-prenom="${esc(e.prenom)}"${
                    g.debloquer ? '' : ' disabled'}
                    title="${g.debloquer
                        ? 'Il pourra passer cet exercice. L\'\u00e9tape ne comptera ni pour ni contre lui.'
                        : 'Il faut qu\'il soit sur un exercice.'}"
                    >Laisse tomber celui-l\u00e0</button>
            ${g.rouvrir ? `<button type="button" class="ec-bouton" data-ecarter="${esc(e.id)}"
                    data-etat="1" data-prenom="${esc(e.prenom)}">Lui rendre l'acc\u00e8s</button>` : ''}
        </div>
    </div>`;
}

const MOT_ETAPE = {
    reussie: 'r\u00e9ussie', ratee: 'rat\u00e9e', 'en-cours': 'en cours', 'a-venir': 'pas encore'
};

/**
 * LA CLASSE EST-ELLE EN PAUSE ?
 *
 * C'est la question qui décide si l'alarme d'inactivité a le droit de sonner.
 * Quand Rémy met la classe en pause pour expliquer au tableau, personne ne
 * répond — c'est le but, et trente alarmes à ce moment-là feraient éteindre la
 * fonction le jour même.
 */
/**
 * JUSQU'À QUAND LA SÉANCE EN COURS S'IMPOSE — dit, et non deviné.
 *
 * Rémy : « si je ne clos pas une séance, à la maison l'élève aura toujours la
 * séance en cours non ? » Elle s'éteint maintenant à la fin de la journée
 * (voir `finDeLaJourneeScolaire` côté serveur) — encore faut-il le DIRE. Une
 * règle qui agit sans s'annoncer se découvre le jour où elle surprend.
 *
 * ON ÉCRIT « ce soir » OU « demain matin », jamais une heure. « jusqu'à 03:00 »
 * fait calculer ; « jusqu'à demain matin » se comprend sans rien faire, et
 * c'est vrai pour les deux seuls moments où l'on pose une séance.
 */
function jusquaDit() {
    const info = (vue.liste && vue.liste.classe) || {};
    const t = Number(info.impose_jusqu_a) || 0;
    if (!t) return 'jusqu\'à ce que vous la retiriez';
    const fin = new Date(t * 1000);
    const nuit = new Date(fin);
    nuit.setHours(0, 0, 0, 0);
    // L'échéance tombe à 3 h : si c'est la nuit prochaine, on est encore « ce
    // soir » ; sinon, l'élève la garde toute la soirée et elle s'arrête au matin.
    const memeJour = nuit.getTime() <= Date.now();
    return memeJour ? 'jusqu\'à tout à l\'heure' : 'jusqu\'à demain matin';
}

/** Le bac à sable est-il fermé pour cette classe ? (Ouvert par défaut.) */
/**
 * CET ÉLÈVE A-T-IL FINI SA SÉANCE ?
 *
 * Une seule lecture, au même endroit pour la ligne et pour la tuile : deux
 * façons de répondre à la même question finiraient par se contredire, et l'on
 * verrait « a fini » à gauche et « étape 3 sur 4 » à droite.
 */
function aFini(e) {
    return !!(e && e.avancement && e.avancement.etat === 'fini');
}

function bacDeLaClasse() {
    const info = (vue.liste && vue.liste.classe) || {};
    return !!info.bac_ferme;
}

/** Combien de minutes dure le bac chez cette classe. 0 = sans limite. */
function minutesDuBac() {
    const info = (vue.liste && vue.liste.classe) || {};
    return Number(info.bac_minutes) || 0;
}

function classeEnPause() {
    const ch = vue.direct && vue.direct.chrono;
    const info = (vue.liste && vue.liste.classe) || vue.classe || {};
    if (info.locked) return true;
    if (!ch || ch.aZero !== 'pause') return false;
    const maintenant = (vue.direct && vue.direct.maintenant) || Math.floor(Date.now() / 1000);
    return ch.finAt <= maintenant;
}

/**
 * LA BANDE D'ALARME — elle VA CHERCHER le professeur.
 *
 * Rémy : « un système "d'alarme si un élève est inactif" ».
 *
 * ELLE NOMME LES ÉLÈVES, et c'est tout ce qui la distingue d'un compteur.
 * « 3 élèves sont arrêtés » oblige à chercher lesquels dans trente lignes —
 * et pendant qu'on cherche, on ne va voir personne. Les règles qui décident
 * QUI apparaît ici (et surtout qui n'y apparaît pas) sont dans
 * js/core/vigilance.js, avec leurs raisons.
 */
/**
 * LE PRÉNOM DE L'ALARME MÈNE À L'ÉLÈVE.
 *
 * La bande nommait les élèves arrêtés — c'est tout son mérite, « 3 élèves sont
 * arrêtés » obligerait à chercher lesquels — mais elle n'y menait pas. Le
 * professeur lisait « Maryam n'a plus rien fait depuis 13 min », puis
 * redescendait la chercher lui-même dans trente lignes, à la main, pendant que
 * la classe travaille.
 *
 * ON NE TOUCHE PAS À LA PHRASE. `direLesAlarmes` décide de ce qui se dit et de
 * comment — deux états qu'on ne mélange pas, le pluriel, les minutes — et c'est
 * éprouvé. On se contente de rendre cliquables les prénoms qu'elle a écrits.
 *
 * LES BORNES DE MOT SONT INDISPENSABLES : sans elles, « Léa » transformerait
 * aussi les trois premières lettres de « Léana », et le professeur qui vise
 * l'une ouvrirait la fiche de l'autre.
 */
function prenomsCliquables(phrase, alarmes) {
    let out = phrase;
    // Du plus long au plus court : « Marie-Claire » avant « Marie », sinon le
    // court découpe le long et le reste ne se retrouve plus.
    [...alarmes]
        .sort((a, b) => String(b.eleve.prenom || '').length - String(a.eleve.prenom || '').length)
        .forEach(a => {
            const nom = esc(String(a.eleve.prenom || '').trim());
            if (!nom) return;
            const motif = new RegExp(`(^|[^\\p{L}\\p{N}-])(${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}-])`, 'u');
            out = out.replace(motif, (tout, avant, trouve) =>
                `${avant}<button type="button" class="ec-alarme-qui" data-fiche="${esc(a.eleve.id)}">${trouve}</button>`);
        });
    return out;
}

function alarmeHtml(eleves, maintenant) {
    const alarmes = lesAlarmes(eleves, maintenant, { enPause: classeEnPause() });
    if (!alarmes.length) return '';
    const dur = alarmes.some(a => a.etat === 'bloque');
    return `<div class="ec-alarme${dur ? ' ec-alarme--dur' : ''}" role="status">
        <span class="ec-alarme-oeil" aria-hidden="true">${dur ? '!' : '·'}</span>
        <span class="ec-alarme-mot">${prenomsCliquables(esc(direLesAlarmes(alarmes)), alarmes)}</span>
    </div>`;
}

// --- Onglet « Le mur » ------------------------------------------------------

/**
 * LE MUR — toute la classe d'un seul regard.
 *
 * Rémy : « La possibilité d'avoir une zone où regarder les écrans des élèves ».
 *
 * CE MUR NE MONTRE PAS LES ÉCRANS, ET IL FAUT LE DIRE. Recopier trente écrans
 * en direct demanderait un serveur qui n'existe pas ici — l'hébergement
 * mutualisé de Rémy sert des pages PHP, il ne relaie pas trente flux — et
 * poserait une question de vie privée qu'on ne règle pas en passant. Pour voir
 * l'écran d'UN élève, il y a « Ouvrir son poste », dans l'onglet Les élèves :
 * une seconde fenêtre qui se comporte comme son poste.
 *
 * CE QUE LE MUR MONTRE, C'EST L'ÉTAT DE TRENTE ÉLÈVES EN MÊME TEMPS — et c'est
 * ce qu'on cherche vraiment en balayant une salle du regard : qui avance, qui
 * s'est arrêté, qui a fini. Le direct répond à la même question en lignes ; le
 * mur y répond en tuiles, ce qui tient sur un écran à trente et se lit sans
 * lire.
 *
 * ET L'ORDRE N'EST PAS ALPHABÉTIQUE. On ne cherche pas un nom sur un mur, on
 * cherche ce qui ne va pas : les ennuis passent devant.
 */
function murHtml() {
    if (!vue.direct) return '<div class="ec-vide">On regarde la classe…</div>';
    const { eleves, maintenant } = vue.direct;
    if (!eleves.length) {
        return `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Personne dans cette classe pour l'instant.</p>
        </div>`;
    }
    const enPause = classeEnPause();
    const rangee = trierPourLeMur(eleves, maintenant, { enPause });

    return alarmeHtml(eleves, maintenant)
        + (enPause ? '<p class="ec-note ec-mur-pause">La classe est en pause : '
            + 'personne ne répond, et c\'est normal.</p>' : '')
        + `<div class="ec-mur">${rangee.map(v => tuileHtml(v)).join('')}</div>`
        + `<p class="ec-mur-legende">
            <span><i class="ec-pastel ec-pastel--bloque"></i>arrêté</span>
            <span><i class="ec-pastel ec-pastel--ralenti"></i>ralentit</span>
            <span><i class="ec-pastel ec-pastel--ok"></i>travaille</span>
            <span><i class="ec-pastel ec-pastel--fini"></i>a fini</span>
            <span><i class="ec-pastel ec-pastel--parti"></i>hors ligne</span>
           </p>`;
}

function tuileHtml(v) {
    const e = v.eleve;
    const av = e.avancement || null;
    const p = Math.round((av && av.fraction ? av.fraction : 0) * 100);
    // Ce qu'on écrit sous le prénom : l'état d'abord quand il appelle un geste,
    // l'avancement sinon. Une tuile de cette taille ne porte qu'une phrase.
    const mot = v.etat === 'bloque' || v.etat === 'ralenti'
        ? 'rien depuis ' + depuisCombien(v.silence)
        : (v.etat === 'parti' ? 'hors ligne'
            : (v.etat === 'pas-commence' ? 'pas commencé' : enBref(av)));
    return `<div class="ec-tuile ec-tuile--${esc(v.etat)}" title="${esc(e.prenom)} — ${esc(v.pourquoi || mot)}">
        <div class="ec-tuile-qui">${esc(e.prenom)}</div>
        <div class="ec-tuile-jauge"><i style="width:${p}%"></i></div>
        <div class="ec-tuile-mot">${esc(mot)}</div>
        <div class="ec-tuile-actions">
            <button type="button" class="ec-mini" data-mot-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}" title="Lui écrire un mot">mot</button>
            <button type="button" class="ec-mini ec-mini--indice" data-indice-eleve="${esc(e.id)}"
                    data-prenom="${esc(e.prenom)}" data-exo="${esc(e.exo || '')}"
                    title="Lui souffler un coup de pouce">indice</button>
        </div>
    </div>`;
}

// --- Onglet « Les séances » -------------------------------------------------
//
// Rémy : « quand je clique sur une classe, il faut pouvoir voir la liste des
// séances attitrées, je trouve que c'est un peu confus », puis : « il y a deux
// choses, la classe (liste + paramètres), la liste des séances attitrées et la
// séance en cours. On organise au mieux ».
//
// IL A NOMMÉ TROIS CHOSES, ET L'ÉCRAN N'EN DISTINGUAIT AUCUNE.
//
// Un onglet « La séance » mélangeait ce qui se passe MAINTENANT — la séance
// imposée, le compte à rebours, le mot au tableau — avec les réglages de la
// classe elle-même : la renommer, la mettre en pause, la vider, la supprimer.
// Et la liste de ce qu'on avait DÉJÀ donné à cette classe n'existait nulle
// part, alors que l'information dormait en base depuis le début.
//
// Les onglets répondent maintenant chacun à une question :
//   · Le direct / Le mur — qui travaille en ce moment ?
//   · En cours           — qu'est-ce que je pilote maintenant ?
//   · Les séances        — qu'est-ce que je leur ai donné ?     ← celui-ci
//   · La classe          — qui est dedans, et comment elle marche ?
//   · Les bilans         — qu'est-ce que je reprends lundi ?

function seancesHtml() {
    if (vue.seances === null) return '<div class="ec-vide">On regarde ce qui a été donné…</div>';
    if (vue.seances.erreur) return `<div class="ec-vide">${esc(vue.seances.erreur)}</div>`;

    const liste = vue.seances.seances || [];
    if (!liste.length) {
        return `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Aucune séance donnée à cette classe.</p>
            <p>Ouvrez un parcours dans <b>Préparer</b>, et cochez cette classe
               dans le panneau <b>À qui ce parcours est donné</b>.</p>
        </div>`;
    }
    const impose = (vue.liste && vue.liste.classe && vue.liste.classe.impose_path_id) || null;

    // CE QUE CET ÉCRAN DOIT DIRE AVANT TOUT AUTRE CHOSE.
    //
    // Rémy : « Comment sait-on qu'une classe fait un parcours ? […] est-ce
    // qu'un élève a accès à tous les parcours que je définis pour la classe, et
    // du coup le parcours actuel c'est lequel ? »
    //
    // LA RÉPONSE EST OUI, ET C'EST ELLE QUI CRÉE LE FLOU. Un élève reçoit
    // TOUTES les séances données à sa classe et les voit dans sa liste ; il
    // choisit. Sauf si l'une est IMPOSÉE : celle-là s'ouvre toute seule, et
    // c'est elle « la séance en cours ».
    //
    // Sans cette phrase en tête de liste, on ne peut pas deviner la règle — et
    // sans un bouton sur chaque ligne, on ne peut pas la changer là où on la
    // lit. Le menu déroulant existait, au fond d'un autre onglet.
    const enCours = liste.find(s => s.pathId === impose);
    return `
        <div class="ec-encours${enCours ? '' : ' ec-encours--aucune'}">
            ${enCours
                ? `<b>En ce moment : ${esc(enCours.nom)}</b>
                   <span>Elle s'ouvre toute seule chez vos élèves, sans qu'ils aient rien à
                         lancer, ${esc(jusquaDit())}.</span>
                   <button type="button" class="ec-bouton ec-bouton--doux" data-imposer-rien>Ne plus rien imposer</button>`
                : `<b>Aucune séance imposée</b>
                   <span>Vos élèves voient TOUTES les séances ci-dessous et choisissent eux-mêmes.
                         Pour qu'une seule s'ouvre toute seule, cliquez <b>mettre en cours</b>.</span>`}
        </div>
        <p class="ec-note ec-note--bloc">De la plus récente à la plus ancienne.</p>
        <div class="ec-seances">${liste.map(s => `
            <div class="ec-seance${s.pathId === impose ? ' ec-seance--imposee' : ''}">
                <div class="ec-seance-haut">
                    <b>${esc(s.nom)}</b>
                    ${s.pour
                        // À QUI, QUAND CE N'EST PAS TOUTE LA CLASSE. Rémy peut
                        // maintenant donner à quelques élèves ; laisser la ligne
                        // muette ferait croire que les trente l'ont reçu, et
                        // c'est sur cette liste qu'il décide de ce qu'il rend.
                        ? `<span class="ec-pastille ec-pastille--nomme">à ${esc(s.pour)}</span>`
                        : ''}
                    ${s.pour ? ''
                        : (s.pathId === impose
                            ? '<span class="ec-pastille ec-pastille--impose">en cours</span>'
                            : `<button type="button" class="ec-mini" data-mettre-en-cours="${esc(s.pathId)}"
                                       data-nom="${esc(s.nom)}">mettre en cours</button>`)}
                    <span class="ec-seance-quand">${esc(quandLisible(s.donneeLe))}</span>
                </div>
                <div class="ec-seance-bas">
                    <span>${s.etapes} étape${s.etapes > 1 ? 's' : ''}</span>
                    <span class="ec-sous-sep">·</span>
                    <span>${s.questions} question${s.questions > 1 ? 's' : ''}</span>
                    <span class="ec-sous-sep">·</span>
                    <span>${esc(MODES[s.mode] || s.mode)}</span>
                    ${s.pourLe ? `<span class="ec-sous-sep">·</span>
                        <span>à rendre ${esc(quandLisible(s.pourLe))}</span>` : ''}
                </div>
            </div>`).join('')}</div>`;
}

const MODES = {
    entrainement: 'entraînement', evaluation: 'évaluation',
    apprentissage: 'apprentissage', revision: 'révision'
};

/**
 * « hier », « il y a 3 jours », « le 12 septembre ».
 *
 * Le professeur ne cherche pas un horodatage : il cherche « c'est celle de la
 * semaine dernière ». Au-delà d'une semaine, la date exacte redevient plus
 * parlante que le compte des jours.
 */
function quandLisible(quand) {
    if (!quand) return '';
    const t = new Date(String(quand).replace(' ', 'T'));
    if (isNaN(t)) return String(quand);
    const jours = Math.floor((Date.now() - t.getTime()) / 86400000);
    if (jours <= 0) return 'aujourd\'hui';
    if (jours === 1) return 'hier';
    if (jours < 7) return `il y a ${jours} jours`;
    return 'le ' + t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// --- Onglet « Les bilans » --------------------------------------------------
//
// LA ROUTE EXISTAIT, LA PORTE N'EXISTAIT PAS.
//
// `/teacher/report` rend depuis longtemps, pour chaque élève, ses questions, sa
// réussite, son temps, ses erreurs ouvertes et ses compétences faibles. AUCUN
// ÉCRAN DE L'APPLICATION NE L'APPELAIT : on ne pouvait le lire qu'en passant
// par les pages d'administration, c'est-à-dire en sortant de l'application —
// et Rémy avait dit ce qu'il en pensait, « j'aimerai ne pas passer par admin ».
//
// MAIS BRANCHER LA ROUTE NE SUFFISAIT PAS. Trente lignes de chiffres sont la
// MATIÈRE d'un bilan ; le bilan, c'est la phrase qu'on en tire. La question
// qu'un professeur se pose en rentrant chez lui n'est pas « quel est le taux de
// Léo » — il était là, il le sait. C'est « qu'est-ce que je reprends lundi, et
// avec qui ». Ce qui suit répond à celle-là d'abord, et donne le tableau
// ensuite.

function bilansHtml() {
    if (!vue.bilans) return '<div class="ec-vide">On rassemble les bilans…</div>';
    if (vue.bilans.erreur) return `<div class="ec-vide">${esc(vue.bilans.erreur)}</div>`;

    const lignes = vue.bilans.students || [];
    if (!lignes.length) {
        return `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">Aucun élève dans cette classe.</p></div>`;
    }
    const r = resumeDeClasse(lignes);
    const notions = notionsAReprendre(lignes);

    return resumeHtml(r) + reprendreHtml(notions, r.eleves) + tableauBilanHtml(lignes);
}

function resumeHtml(r) {
    // « 0 % » se lit comme « tout est faux » ; quand personne n'a rien fait, il
    // n'y a rien à dire, et c'est cela qu'on écrit.
    const taux = r.reussite === null ? '—' : Math.round(r.reussite * 100) + ' %';
    return `<div class="ec-bilan-resume">
        ${chiffre(taux, 'de réussite', r.reussite !== null && r.reussite >= 0.7 ? 'bien' : '')}
        ${chiffre(r.questions, r.questions > 1 ? 'questions' : 'question')}
        ${chiffre(enHeures(r.secondes), 'de travail')}
        ${chiffre(r.actifs + ' / ' + r.eleves, 'ont travaillé',
            r.actifs < r.eleves ? 'alerte' : '')}
        ${r.jamaisVenus ? chiffre(r.jamaisVenus, r.jamaisVenus > 1
            ? 'ne sont jamais venus' : 'n\'est jamais venu', 'alerte') : ''}
    </div>`;
}

const chiffre = (v, quoi, ton = '') => `<div class="ec-chiffre${ton ? ' ec-chiffre--' + ton : ''}">
    <b>${esc(String(v))}</b><span>${esc(quoi)}</span></div>`;

/**
 * CE QU'IL FAUT REPRENDRE — le retournement du tableau.
 *
 * Une notion faible chez douze élèves appelle une leçon ; la même chez un seul
 * appelle un accompagnement. Ce ne sont pas les mêmes lundis, et c'est pour
 * cela qu'on range par nombre d'élèves et qu'on écrit ce nombre.
 */
function reprendreHtml(notions, combienDElevesEnTout) {
    if (!notions.length) {
        return '<p class="ec-note ec-note--bloc">Rien ne ressort comme fragile pour l\'instant — '
            + 'il faut un peu de travail enregistré avant que ce bilan dise quelque chose.</p>';
    }
    return `<section class="ec-bloc ec-bloc--reprendre">
        <h3 class="ec-h3">À reprendre</h3>
        <p class="ec-note ec-note--bloc">Les notions fragiles, de la plus partagée à la
           plus isolée. Ce qui touche la moitié de la classe se reprend au tableau ;
           ce qui touche deux élèves se reprend avec eux.</p>
        ${notions.slice(0, 8).map(n => {
            const c = laCompetence(n.skillId);
            const part = Math.round(100 * n.combien / Math.max(1, combienDElevesEnTout));
            return `<div class="ec-reprendre">
                <div class="ec-reprendre-haut">
                    <b>${esc(c ? c.label : n.skillId)}</b>
                    <span class="ec-reprendre-combien${part >= 40 ? ' ec-reprendre-combien--fort' : ''}"
                        >${n.combien} élève${n.combien > 1 ? 's' : ''}</span>
                </div>
                <div class="ec-jauge ec-jauge--mince"><i style="width:${part}%"></i></div>
                <div class="ec-reprendre-qui">${
                    n.eleves.slice(0, 8).map(e => esc(e.firstName)).join(', ')
                    + (n.eleves.length > 8 ? ` et ${n.eleves.length - 8} autres` : '')}</div>
            </div>`;
        }).join('')}
    </section>`;
}

function tableauBilanHtml(lignes) {
    return `<section class="ec-bloc">
        <h3 class="ec-h3">Élève par élève</h3>
        <p class="ec-note ec-note--bloc">Rangés par ce qui demande un geste, pas par
           ordre alphabétique : ceux qui n'ont rien fait d'abord, puis les plus en
           difficulté.</p>
        <table class="ec-table ec-table--bilan">
            <thead><tr>
                <th>Élève</th><th>Questions</th><th>Réussite</th>
                <th>Travail</th><th>Erreurs ouvertes</th><th>Dernière note</th>
            </tr></thead>
            <tbody>${ordreDuBilan(lignes).map(l => {
                const rien = !(Number(l.totalQuestions) || 0);
                const taux = l.successRate === null || l.successRate === undefined
                    ? '—' : Math.round(l.successRate * 100) + ' %';
                const note = l.lastNote
                    ? `${esc(String(l.lastNote.note))} / ${esc(String(l.lastNote.sur))}` : '—';
                return `<tr${rien ? ' class="ec-tr-rien"' : ''}>
                    <td><b>${esc(l.firstName)}</b>${l.lastSeenAt ? ''
                        : ' <span class="ec-note">(jamais venu)</span>'}</td>
                    <td>${l.totalQuestions || 0}</td>
                    <td class="${!rien && l.successRate < 0.5 ? 'ec-td-faible' : ''}">${taux}</td>
                    <td class="ec-note">${esc(enHeures(l.timeSeconds))}</td>
                    <td>${l.openErrors || 0}</td>
                    <td>${note}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
    </section>`;
}

// --- Onglet « La liste » ----------------------------------------------------

function listeHtml() {
    if (vue.apercu) return apercuHtml();
    if (!vue.liste) return '<div class="ec-vide">On lit la liste…</div>';

    const eleves = vue.liste.eleves || [];
    const avec = eleves.filter(e => !e.sansBillet);
    const sans = eleves.filter(e => e.sansBillet);

    const outils = `
    <div class="ec-outils">
        <button type="button" class="ec-bouton" data-coller>Coller une liste d'élèves</button>
        ${avec.length ? `
        <button type="button" class="ec-bouton ec-bouton--doux" data-imprimer>Imprimer les billets</button>
        <button type="button" class="ec-bouton ec-bouton--doux" data-codes-communs>Un même code pour tous</button>
        <button type="button" class="ec-bouton ec-bouton--doux" data-codes-chacun>Refaire tous les codes</button>` : ''}
        <button type="button" class="ec-bouton ec-bouton--doux" data-poste=""
                title="Une seconde fenêtre, vierge, qui se comporte comme le poste d'un élève"
                >Ouvrir un poste élève</button>${avec.length > 1 ? `
        <!-- LE MUR DES POSTES. Rémy : « un mode qui m'ouvre […] une fenêtre
             avec plusieurs iframes où ça ouvre des fenêtres d'élèves, pour
             tester […] que je puisse voir ce que cela donne pour plusieurs
             élèves. » Voir postes.html.

             LES PREMIERS DE LA LISTE, et on le dit. Choisir lesquels
             demanderait une case par ligne et un bouton « ouvrir la
             sélection » — trois gestes de plus pour un outil d'essai. Pour un
             élève précis, « Ouvrir son poste » est sur sa ligne. -->
        <button type="button" class="ec-bouton ec-bouton--doux" data-mur-postes="4"
                title="Une fenêtre qui montre les postes des ${Math.min(4, avec.length)} premiers élèves de la liste, côte à côte. Pour un élève précis, « Ouvrir son poste » est sur sa ligne."
                >Ouvrir plusieurs postes</button>` : ''}
    </div>`;

    if (!eleves.length) {
        return outils + `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">La liste est vide.</p>
            <p>Collez-la depuis Pronote ou un tableur — le fichier ENTIER, sans rien
               nettoyer. On vous montrera <b>ce qui va se passer</b> avant d'écrire
               quoi que ce soit.</p>
        </div>` + reglagesClasseHtml();
    }

    return outils + (avec.length ? `
    <table class="ec-table">
        <thead><tr>
            <th>Élève</th><th>Identifiant</th><th>Code</th><th>Vu</th><th></th>
        </tr></thead>
        <tbody>
        ${avec.map(e => `
        <tr${e.ecarte ? ' class="ec-tr-ecarte"' : ''}>
            <td><b>${esc(e.prenom)}</b>${e.ecarte ? ' <span class="ec-note">(mis de côté)</span>' : ''}</td>
            <td><code>${esc(e.login)}</code></td>
            <td><span class="ec-code ec-code--petit">${esc(e.code)}</span></td>
            <td class="ec-note">${esc(depuis(e.vu, Math.floor(Date.now() / 1000)))}</td>
            <td class="ec-actions">
                <button type="button" class="ec-mini" data-poste="${esc(e.login)}"
                        data-poste-code="${esc(e.code || '')}"
                        title="Une seconde fenêtre qui se comporte comme SON poste, connecté sous son nom. C'est plus fort que « Son exercice, chez moi » du Direct : ici vous êtes lui."
                        >Ouvrir son poste</button>
                <button type="button" class="ec-mini" data-billet="${esc(e.id)}"
                        title="Réimprimer CE billet, sans changer son code"
                        >billet</button>
                <button type="button" class="ec-mini" data-code="${esc(e.id)}"
                        title="Tirer un nouveau code : l'ancien billet ne vaudra plus rien">code</button>
                <button type="button" class="ec-mini" data-ecarter="${esc(e.id)}"
                        data-etat="${e.ecarte ? '1' : '0'}"
                        title="${e.ecarte ? 'Le laisser revenir' : 'Il ne pourra plus se rattacher'}"
                        >${e.ecarte ? 'réactiver' : 'de côté'}</button>
                <button type="button" class="ec-mini ec-mini--rouge" data-retirer="${esc(e.id)}"
                        data-prenom="${esc(e.prenom)}"
                        title="Le retirer, avec tout son travail">retirer</button>
            </td>
        </tr>`).join('')}
        </tbody>
    </table>` : '')
    + (sans.length ? `
    <h3 class="ec-h3">Entrés par le code de la classe <span class="ec-note">(${sans.length})</span></h3>
    <p class="ec-note ec-note--bloc">Ils travaillent déjà, mais n'ont pas de billet.
       Collez votre liste : ceux dont le prénom correspond seront <b>rattachés à leur
       travail</b> au lieu d'être recréés à côté.</p>
    <div class="ec-puces">
        ${sans.map(e => `<span class="ec-puce">${esc(e.prenom)}</span>`).join('')}
    </div>` : '')
    + reglagesClasseHtml();
}

/**
 * LES RÉGLAGES DE LA CLASSE, avec la classe.
 *
 * Rémy : « il y a deux choses, la classe (liste + paramètres), la liste des
 * séances attitrées et la séance en cours ».
 *
 * Renommer, vider, supprimer ne sont PAS des gestes de séance : ils portent sur
 * la classe elle-même, et ils vivaient pourtant au fond de l'onglet qui pilote
 * l'heure en cours. On les remet là où on les cherche — avec la liste des
 * élèves, c'est-à-dire avec la classe.
 */
function reglagesClasseHtml() {
    return `
    <section class="ec-bloc ec-bloc--reglages">
        <h3 class="ec-h3">Réglages de la classe</h3>
        <div class="ec-outils">
            <button type="button" class="ec-bouton ec-bouton--doux" data-renommer>Renommer</button>
            <button type="button" class="ec-bouton ec-bouton--doux" data-vider>Vider la liste</button>
            <button type="button" class="ec-bouton ec-bouton--rouge" data-supprimer>Supprimer la classe</button>
        </div>
        <p class="ec-note ec-note--bloc">Vider et supprimer emportent le travail des élèves,
           et c'est sans retour : on vous demandera d'écrire <b>EFFACER</b>.</p>
    </section>`;
}


/**
 * L'APERÇU : ce qui va se passer, avant que quoi que ce soit soit écrit.
 *
 * C'est la pièce la plus importante de tout l'écran. Coller trente élèves est
 * un geste qu'on fait une fois par an, en cinq secondes, et dont on ne peut pas
 * revenir. Le professeur doit voir, ligne par ligne, ce que le logiciel a
 * compris — et pouvoir dire non.
 */
function apercuHtml() {
    const a = vue.apercu;
    const COULEUR = {
        nouveau: 'ec-sort--neuf', connu: 'ec-sort--connu', rattache: 'ec-sort--rattache',
        deplace: 'ec-sort--deplace', homonyme: 'ec-sort--attention', refuse: 'ec-sort--refus'
    };
    const compte = {};
    a.lignes.forEach(l => { compte[l.sort] = (compte[l.sort] || 0) + 1; });
    const resume = Object.entries({
        nouveau: 'nouveau(x)', rattache: 'rattaché(s) à leur travail',
        deplace: 'déplacé(s) d\'une autre classe', connu: 'déjà là',
        homonyme: 'homonyme(s), ignoré(s)', refuse: 'refusé(s)'
    }).filter(([k]) => compte[k]).map(([k, mot]) => `${compte[k]} ${mot}`).join(' · ');

    return `
    <div class="ec-apercu">
        <h3 class="ec-h3">Voici ce qui va se passer</h3>
        <p class="ec-note ec-note--bloc"><b>Rien n'est encore enregistré.</b> ${esc(resume)}.</p>
        <table class="ec-table">
            <thead><tr><th>Élève</th><th>Identifiant</th><th>Code</th><th>Ce qui se passera</th></tr></thead>
            <tbody>
            ${a.lignes.map(l => `
            <tr class="${COULEUR[l.sort] || ''}">
                <td><b>${esc(l.nom)}</b></td>
                <td><code>${esc(l.login)}</code></td>
                <td>${l.code
                    ? `<span class="ec-code ec-code--petit">${esc(l.code)}</span>`
                    : '<span class="ec-note">tiré au sort</span>'}</td>
                <td class="ec-note">${esc(l.dit)}</td>
            </tr>`).join('')}
            </tbody>
        </table>
        ${a.ignorees && a.ignorees.length ? `
        <p class="ec-note ec-note--bloc"><b>Lignes non comprises</b>, laissées de côté :
           ${a.ignorees.map(x => `<code>${esc(x)}</code>`).join(' ')}</p>` : ''}
        <div class="ec-outils">
            <button type="button" class="ec-bouton" data-confirmer-import>
                Confirmer — ${a.lignes.length} élève(s)
            </button>
            <button type="button" class="ec-bouton ec-bouton--doux" data-annuler-apercu>
                Revenir en arrière
            </button>
        </div>
    </div>`;
}

// --- Piloter la séance, DEPUIS LE DIRECT ------------------------------------
//
// Rémy : « je pense que dans le direct, c'est là qu'il faut gérer la séance,
// pouvoir mettre en pause, envoyer un message commun », puis : « oui, tout dans
// le direct ».
//
// IL Y AVAIT DEUX ÉCRANS POUR LE MÊME INSTANT, et c'était le défaut. On
// regardait « Le direct » pour voir qui bloque, et il fallait changer d'onglet
// pour agir — en perdant de vue précisément ce qui avait fait agir. L'onglet
// « En cours » a donc disparu : ses commandes sont ici, au-dessus des élèves,
// et « imposer la séance » est parti dans « Les séances », qui parle de séances.
//
// CE QUI EST TOUJOURS VISIBLE EST CE QU'ON FAIT EN COURS D'HEURE : la pause, le
// chrono, le mot à la classe. Le reste — la consigne au tableau, le bac à
// sable, dispenser toute la classe d'un exercice — se replie : ce sont des
// gestes de début ou de fin d'heure, et les laisser ouverts repousserait les
// élèves sous la ligne de flottaison.

/**
 * CE QU'IL RESTE AU CHRONO, EN SECONDES.
 *
 * On lit l'heure du SERVEUR (`vue.direct.maintenant`) et non celle du poste :
 * c'est la même horloge que celle des élèves, et deux horloges pour un seul
 * compte à rebours finissent toujours par afficher deux nombres différents —
 * le professeur dirait « encore trente secondes » à une classe qui en voit dix.
 */
function resteDuChrono(ch) {
    if (!ch || !ch.finAt) return 0;
    const maintenant = (vue.direct && vue.direct.maintenant) || Math.floor(Date.now() / 1000);
    return Math.max(0, ch.finAt - maintenant);
}

function barrePiloteHtml() {
    const info = (vue.liste && vue.liste.classe) || {};
    const ch = vue.direct && vue.direct.chrono;
    const enCours = !!(ch && ch.finAt);
    return `
    <!-- L'attribut data-forme dit ce qui, dans cette barre, changerait sa
         STRUCTURE. Le battement s'en sert pour savoir s'il doit la refaire —
         sinon il la laisse tranquille, avec le message qu'on est en train d'y
         écrire. Elle le porte elle-même : posé après coup, il manquerait au
         premier dessin, et le premier battement effacerait le premier message.
         (Et pas de guillemet oblique dans ce commentaire : il est DANS un
         gabarit, et le premier qu'on y pose ferme le gabarit.) -->
    <div class="ec-pilote" data-forme="${esc(signatureDuPilote())}">
        <div class="ec-pilote-rangee">
            <button type="button" class="ec-pilote-btn${info.locked ? ' ec-pilote-btn--actif' : ''}"
                    data-pause="${info.locked ? '0' : '1'}"
                    title="En pause, les élèves ne voient plus que ce que vous leur donnez : le catalogue disparaît.">
                ${info.locked ? '▶ Rouvrir la classe' : '⏸ Mettre en pause'}
            </button>

            <span class="ec-pilote-mot">
                <input type="text" id="ec-mot" class="ec-champ" maxlength="500"
                       placeholder="Un mot à toute la classe…"
                       aria-label="Un mot à toute la classe"
                       data-valide-sur-entree="data-mot-classe">
                <button type="button" class="ec-pilote-btn" data-mot-classe>Envoyer</button>
            </span>
        </div>

        <!-- LE CHRONO EST UN OBJET, PAS QUATRE CHAMPS EN VRAC.
             Rémy : « le bandeau rouvrir la classe avec le 10 le lancer à zéro
             on termine le mot pour toute la classe est vraiment en bazar ».
             Il avait raison : cinq commandes de rôles différents se suivaient
             sur une seule ligne, et rien ne disait lesquelles allaient
             ensemble — « 10 » tout seul à côté d'un bouton « Pause » ne veut
             rien dire. Le compte à rebours se referme donc dans son propre
             cadre, avec son nom écrit dessus. -->
        <div class="ec-pilote-rangee">
            <!-- LE PROFESSEUR DOIT VOIR LE TEMPS QU'IL A LANCÉ.
                 Il lançait un compte à rebours et ne le voyait JAMAIS : seuls
                 ses élèves l'avaient à l'écran. Pendant que la classe regarde
                 les secondes tomber, lui devait demander « il reste combien ? »
                 — ou regarder l'écran d'un élève par-dessus son épaule.
                 Quand il tourne, le champ de réglage cède donc la place au
                 décompte lui-même, gros et lisible à bout de bras : ce n'est
                 plus le moment de régler, c'est le moment de lire. -->
            <span class="ec-pilote-cadre" role="group" aria-label="Compte à rebours">
                <span class="ec-pilote-eti">⏱ Compte à rebours</span>
                ${enCours ? `
                <b class="ec-chrono-reste${resteDuChrono(ch) <= 60 ? ' ec-chrono-reste--court' : ''}"
                   role="timer" aria-live="off">${enMinutes(resteDuChrono(ch))}</b>
                <span class="ec-pilote-mot-liant">${ch.quoi === 'pause'
                    ? 'puis on s\'arrête' : 'puis on termine'}</span>
                <button type="button" class="ec-pilote-btn ec-pilote-btn--actif"
                        data-chrono-off>Arrêter</button>
                ` : `
                <input type="number" id="ec-chrono-min" class="ec-champ ec-champ--court"
                       min="1" max="180" value="${vue.chronoMin || 10}" aria-label="Minutes">
                <span class="ec-pilote-mot-liant">min,</span>
                <select id="ec-chrono-quoi" class="ec-champ ec-champ--mince"
                        aria-label="Ce qui se passe à zéro">
                    <option value="terminer">puis on termine</option>
                    <option value="pause">puis on s'arrête</option>
                </select>
                <button type="button" class="ec-pilote-btn" data-chrono>Lancer</button>
                `}
            </span>

            <!-- LA CALCULATRICE, ACCORDÉE EN PLEINE HEURE.
                 RÉMY : « pourrait-on autoriser dans les options l'utilisation
                 de la calculatrice ou le permettre en direct à un groupe ou aux
                 élèves (on pourrait sélectionner dans le direct) », puis « les
                 deux au choix mais on pourrait le donner que pour certains
                 élèves ».
                 DEUX PORTÉES, comme il les a demandées : toute la séance — le
                 « vous pouvez prendre la calculatrice » qu'on dit à voix haute
                 et qu'on ne répète pas — ou un exercice seul. Et deux
                 destinataires : toute la classe, ou les élèves cochés dans la
                 liste en dessous. L'étiquette dit lequel, parce qu'accorder à
                 trente en croyant accorder à quatre ne se voit qu'après. -->
            <span class="ec-pilote-cadre">
                <span class="ec-pilote-eti">🧮 Calculatrice</span>
                <span class="ec-pilote-mot-liant" data-calc-aqui>${aQuiLaCalculatrice()}</span>
                <select id="ec-calc-ou" class="ec-champ ec-champ--ou"
                        aria-label="Où la calculatrice est autorisée">
                    <option value="*">pour toute la séance</option>
                    ${exercicesSousLaMain().map(x =>
        `<option value="${esc(x.id)}">sur ${esc(x.titre)}</option>`).join('')}
                </select>
                <button type="button" class="ec-pilote-btn" data-calc-donner>Autoriser</button>
                ${(vue.reglages || []).some(x => x.mode === 'calculatrice')
        ? '<button type="button" class="ec-pilote-btn" data-calc-retirer>Retirer</button>' : ''}
            </span>

            <span class="ec-pilote-cadre">
                <span class="ec-pilote-eti">🧰 Bac à sable</span>
                <span class="ec-pilote-mot-liant">${bacDeLaClasse()
                    ? 'fermé pour cette heure' : 'ouvert à ceux qui ont fini'}</span>
                ${bacDeLaClasse()
                    ? '<button type="button" class="ec-pilote-btn" data-bac="0">Ouvrir</button>'
                    : '<button type="button" class="ec-pilote-btn" data-bac="1">Fermer</button>'}
                ${bacDeLaClasse() ? '' : `
                <!-- COMBIEN DE TEMPS IL DURE. Rémy, interrogé sur ce qui doit
                     borner les jeux du bac : « un temps, réglé par vous ». Le
                     compte part quand l ELEVE ouvre le bac, pas à l heure de la
                     classe : celui qui finit dix minutes avant les autres a
                     droit aux mêmes dix minutes. 0 = sans limite, et c est le
                     défaut. (Pas de guillemet oblique ici : ce commentaire est
                     DANS un gabarit.) -->
                <span class="ec-pilote-mot-liant">·</span>
                <input type="number" id="ec-bac-min" class="ec-champ ec-champ--court"
                       min="0" max="120" step="5" value="${minutesDuBac()}"
                       aria-label="Minutes de bac à sable par élève"
                       data-valide-sur-entree="data-bac-minutes">
                <span class="ec-pilote-mot-liant">min par élève</span>
                <button type="button" class="ec-pilote-btn" data-bac-minutes>Poser</button>`}
            </span>
        </div>

        <details class="ec-pilote-plus">
            <summary>Le mot au tableau · dispenser toute la classe d'un exercice</summary>
            <div class="ec-pilote-plus-corps">

                <div class="ec-pilote-bloc">
                    <span class="ec-pilote-eti">Le mot au tableau</span>
                    <p class="ec-note">Il reste affiché chez tous jusqu'à ce que vous le retiriez.</p>
                    <div class="ec-champ-ligne">
                        <input type="text" id="ec-consigne" class="ec-champ" maxlength="300"
                               placeholder="Exercice 3 page 42, en binôme"
                               value="${esc(info.notice || '')}"
                               data-valide-sur-entree="data-consigne">
                        <button type="button" class="ec-bouton" data-consigne>Afficher</button>
                        ${info.notice ? '<button type="button" class="ec-bouton ec-bouton--doux" '
                            + 'data-consigne-off>Retirer</button>' : ''}
                    </div>
                </div>

                <div class="ec-pilote-bloc">
                    <span class="ec-pilote-eti">Dispenser TOUTE la classe d'un exercice</span>
                    <p class="ec-note">Pour un seul élève, cliquez sur son nom : c'est presque
                       toujours ce qu'il faut. Ici, c'est quand l'exercice lui-même pose problème.</p>
                    <div class="ec-champ-ligne">
                        <!-- ON CHOISIT L'EXERCICE, ON NE L'ÉCRIT PLUS.
                             Rémy : « il faudrait pouvoir de façon globale
                             permettre de sauter un exercice ». On pouvait
                             déjà — à condition de taper son IDENTIFIANT,
                             « calc-add », dans un champ libre. Une liste
                             déroulante sous les yeux et un identifiant à
                             retenir de tête, ce n'est pas le même geste : le
                             premier se fait en classe, le second se remet à
                             plus tard. -->
                        <select id="ec-exo" class="ec-champ"
                                aria-label="L'exercice dont on dispense la classe">
                            ${exercicesSousLaMain().map(x =>
        `<option value="${esc(x.id)}">${esc(x.titre)}${x.ou ? ` — ${esc(x.ou)}` : ''}</option>`)
        .join('') || '<option value="">Aucun exercice en cours</option>'}
                        </select>
                        <button type="button" class="ec-bouton" data-saut>Autoriser le saut</button>
                        <button type="button" class="ec-bouton ec-bouton--doux" data-retire>Le retirer</button>
                    </div>
                    ${reglagesHtml()}
                </div>

            </div>
        </details>
    </div>`;
}

/**
 * À QUI LA CALCULATRICE VA — dit avant de cliquer, pas après.
 *
 * Accorder à trente élèves en croyant en accorder à quatre ne se voit qu'au
 * moment où trente sortent leur calculatrice. L'étiquette suit donc les cases
 * cochées, et c'est elle qu'on relit avant d'appuyer.
 */
function aQuiLaCalculatrice() {
    const n = elevesChoisis().length;
    if (!n) return 'à toute la classe';
    return n === 1 ? 'à 1 élève coché' : `à ${n} élèves cochés`;
}

/** Les élèves cochés dans le direct, filtrés sur ceux qui y sont encore. */
function elevesChoisis() {
    const vus = new Set((((vue.direct || {}).eleves) || []).map(e => e.id));
    return [...(vue.choisis || [])].filter(id => vus.has(id));
}

/** Les réglages d'exercice en vigueur, avec de quoi les défaire. */
function reglagesHtml() {
    const r = vue.reglages;
    if (!r || !r.length) return '';
    return `<div class="ec-puces ec-puces--reglages">
        ${r.map(x => `<span class="ec-puce">
            ${x.mode === 'retire' ? '⊘' : (x.mode === 'calculatrice' ? '🧮' : '↷')} ${
        x.exerciseId === '*' ? 'toute la séance' : esc(nomDExercice(x.exerciseId))}
            ${x.pour ? '· ' + esc(x.pour) : '· toute la classe'}
            <button type="button" class="ec-mini" data-annuler-reglage="${esc(x.id)}"
                    title="Annuler ce réglage">×</button>
        </span>`).join('')}
    </div>`;
}

// --- Les gestes -------------------------------------------------------------

/**
 * L'ÉTAPE DE LA SÉANCE QUI PORTE CET EXERCICE — avec ses réglages.
 *
 * RÉMY : « voir son exercice ne montre pas la même chose ».
 *
 * L'élève ne travaille pas l'exercice du CATALOGUE : il travaille l'étape que
 * le professeur a réglée — les paliers cochés, le nombre de questions, la
 * partie de la leçon. Ouvrir l'exercice nu montrerait autre chose que ce qu'il
 * a sous les yeux, et c'est précisément ce que Rémy a photographié.
 *
 * ON CHERCHE D'ABORD DANS LA SÉANCE IMPOSÉE, puis dans les autres parcours du
 * professeur : un même exercice peut figurer dans dix parcours avec dix
 * réglages, et c'est celui de l'heure en cours qui a raison.
 *
 * Rend `null` quand on ne trouve rien — l'exercice a pu être lancé librement
 * par l'élève. L'appelant le DIT alors, plutôt que de faire passer les
 * réglages du catalogue pour les siens.
 */
function etapeDeLaSeance(exerciceId) {
    if (!exerciceId) return null;
    const info = (vue.liste && vue.liste.classe) || {};
    const parcours = state.teacherPaths || [];
    const imposee = info.impose_path_id
        ? parcours.find(p => p && p.id === info.impose_path_id) : null;
    const ordre = imposee ? [imposee, ...parcours.filter(p => p !== imposee)] : parcours;
    for (const p of ordre) {
        const etape = (p && p.steps || []).find(st => st && st.exerciseId === exerciceId);
        if (etape) return etape;
    }
    return null;
}

/**
 * LES EXERCICES QU'ON PEUT DISPENSER, NOMMÉS.
 *
 * Ceux de la séance donnée d'abord, DANS LEUR ORDRE — c'est celui du parcours,
 * et le professeur pense « le troisième », pas « num-arrondi ». Puis ceux que
 * des élèves ont ouverts sans être dans la séance, qui existent aussi.
 */
function exercicesSousLaMain() {
    const info = (vue.liste && vue.liste.classe) || {};
    const imposee = info.impose_path_id
        ? (state.teacherPaths || []).find(p => p && p.id === info.impose_path_id) : null;
    const out = [];
    const vus = new Set();
    ((imposee && imposee.steps) || []).forEach((st, i) => {
        const id = st && st.exerciseId;
        if (!id || vus.has(id)) return;
        vus.add(id);
        out.push({ id, titre: `${i + 1}. ${nomDExercice(id)}` });
    });
    ((vue.direct && vue.direct.eleves) || []).forEach(e => {
        if (!e.exo || vus.has(e.exo)) return;
        vus.add(e.exo);
        out.push({ id: e.exo, titre: nomDExercice(e.exo), ou: 'ouvert par un élève' });
    });
    return out;
}

async function brancher(e, redessiner) {
    // LE CODE SE COPIE SANS OUVRIR LA CLASSE. Il est DANS la carte, et la carte
    // entière est cliquable : sans cette sortie anticipée, copier le code
    // ouvrirait la classe par la même occasion.
    const copie = e.target.closest('[data-copier]');
    if (copie) {
        e.stopPropagation();
        const code = copie.dataset.copier;
        try {
            await navigator.clipboard.writeText(code);
            showToast('Code copié : ' + code, 'success');
        } catch (err) {
            // Sans permission (ou hors HTTPS), on ne ment pas : on le montre.
            showToast('Le code est ' + code + ' — le navigateur refuse de le copier '
                + 'tout seul, il faut le sélectionner.', 'info');
        }
        return;
    }

    const el = e.target.closest('[data-ouvrir], [data-retour], [data-onglet], [data-nouvelle-classe],'
        + '[data-coller], [data-confirmer-import], [data-annuler-apercu], [data-code],'
        + '[data-retirer], [data-ecarter], [data-codes-communs], [data-codes-chacun],'
        + '[data-imprimer], [data-billet], [data-consigne], [data-consigne-off], [data-mot-classe],'
        + '[data-mot-eleve], [data-indice-eleve], [data-pause], [data-renommer], [data-vider], [data-supprimer],'
        + '[data-nouveau-prof], [data-retirer-prof], [data-saut], [data-retire],'
        + '[data-profs], [data-reessayer], [data-poste], [data-mur-postes],'
        + '[data-mode-libre], [data-inscription-libre],'
        + '[data-imposer-rien], [data-mettre-en-cours],'
        + '[data-chrono], [data-chrono-off], [data-bac], [data-supprimer-carte],'
        + '[data-annuler-reglage], [data-fiche], [data-saut-eleve], [data-voir-exo],'
        + '[data-choix], [data-calc-donner], [data-calc-retirer], [data-bac-minutes]');
    if (!el) return;
    const d = el.dataset;

    // COCHER UN ÉLÈVE NE DEMANDE RIEN AU SERVEUR, et ne redessine rien.
    //
    // Ce cas passe AVANT le verrou `vue.occupe` et avant tout `redessiner()` :
    // cocher quatre noms d'affilée pendant qu'une requête est en vol doit
    // marcher, et un redessin complet du direct effacerait le mot que le
    // professeur est peut-être en train d'écrire dans la barre. On ne touche
    // donc qu'à l'étiquette qui dit à qui l'on parle.
    if (d.choix !== undefined) {
        if (!vue.choisis) vue.choisis = new Set();
        if (vue.choisis.has(d.choix)) vue.choisis.delete(d.choix);
        else vue.choisis.add(d.choix);
        const eti = document.querySelector('[data-calc-aqui]');
        if (eti) eti.textContent = aQuiLaCalculatrice();
        return;
    }

    // UNE SEULE ACTION À LA FOIS. Deux clics pendant que le réseau réfléchit,
    // et l'on écrit deux fois la même liste.
    if (vue.occupe) return;

    // `dire` REMPLACE LA PHRASE DU SERVEUR QUAND LE CLIENT EN SAIT PLUS.
    //
    // Le serveur ne connaît pas les TITRES des exercices — il n'a que leurs
    // identifiants. Il annonçait donc « la calculatrice est autorisée sur
    // “calc-add” », et le professeur lisait un nom de code pour un exercice qui
    // s'appelle « Additions Mystères ». Ici, `nomDExercice` le sait.
    const fait = async (promesse, surSucces, dire = '') => {
        vue.occupe = true;
        const r = await promesse;
        vue.occupe = false;
        if (r && r.erreur) { showToast(r.erreur, 'error'); return null; }
        if (dire) showToast(dire, 'success');
        else if (r && r.dit) showToast(r.dit, 'success');
        if (surSucces) surSucces(r);
        redessiner();
        return r;
    };

    // SE METTRE À LA PLACE D'UN ÉLÈVE, SANS QUITTER SA PLACE DE PROFESSEUR.
    //
    // Rémy : « comment je pourrais simuler un mode élève et prof simultané,
    // pour être sûr que ça fonctionne ».
    //
    // On ouvre une seconde fenêtre sur la MÊME application et le MÊME serveur,
    // avec le billet de cet élève-là. Elle range ce qu'elle sait dans un tiroir
    // à part (voir le préambule d'`index.html`), si bien que les deux fenêtres
    // ne se déconnectent pas l'une l'autre : le professeur peut regarder son
    // direct d'un côté pendant que « l'élève » travaille de l'autre.
    //
    // ON N'ATTEND RIEN AVANT D'OUVRIR. `window.open` appelé après un `await`
    // n'est plus rattaché au clic, et le navigateur le bloque comme une
    // fenêtre surgissante. C'est pour cela que ce cas passe avant tous les
    // autres, et qu'il ne demande rien au serveur.
    // LE MUR DES POSTES — UNE SEULE FENÊTRE, PLUSIEURS CADRES.
    //
    // UNE et non plusieurs : un navigateur n'autorise qu'UNE fenêtre
    // surgissante par geste de l'utilisateur. Quatre `window.open` d'affilée,
    // et trois sont bloqués en silence — le professeur croirait à une panne.
    if (d.murPostes !== undefined) {
        const combien = Math.max(2, Math.min(10, Number(d.murPostes) || 4));
        const liste = ((vue.liste && vue.liste.eleves) || [])
            .filter(e => !e.sansBillet && e.login)
            .slice(0, combien);
        if (liste.length < 2) {
            showToast('Il faut au moins deux élèves avec un billet pour ouvrir un mur.', 'info');
            return;
        }
        // LES CODES DANS LE FRAGMENT, jamais dans la requête : un fragment ne
        // part pas au serveur, donc ni journal, ni référent, ni historique
        // d'intermédiaire. `postes.html` l'efface dès qu'il l'a lu.
        const billets = liste.map(e => `${e.login}/${e.code || ''}`).join(',');
        const f = window.open(
            `postes.html#eleves=${encodeURIComponent(billets)}`,
            'atoutmath-mur-postes',
            'width=1400,height=900'
        );
        if (!f) {
            showToast('Le navigateur a bloqu\u00e9 la fen\u00eatre. Autorisez les '
                + 'fen\u00eatres surgissantes pour ce site, puis r\u00e9essayez.', 'error');
            return;
        }
        showToast(`${liste.length} postes ouverts : ${liste.map(e => e.login).join(', ')}. `
            + 'Chacun a son tiroir de stockage — leurs travaux arrivent dans votre Direct.',
            'success', 8000);
        return;
    }

    if (d.poste !== undefined) {
        const f = window.open(
            adresseDuPoste({ login: d.poste, code: d.posteCode || '' }),
            'atoutmath-poste-' + d.poste,
            'width=980,height=860'
        );
        if (!f) {
            showToast('Le navigateur a bloqu\u00e9 la seconde fen\u00eatre. Autorisez les '
                + 'fen\u00eatres surgissantes pour ce site, puis r\u00e9essayez.', 'error');
        }
        return;
    }

    // METTRE UNE SÉANCE EN COURS, DEPUIS LA LISTE DES SÉANCES.
    //
    // Le geste existait — un menu déroulant, au fond de l'onglet « En cours ».
    // Rémy ne l'a pas trouvé, et il a raison de ne pas l'avoir cherché là : on
    // choisit la séance du jour en regardant la liste des séances, pas en
    // déroulant un menu ailleurs. Même route, même effet.
    if (d.mettreEnCours) {
        await fait(imposerLaSeance(vue.classe.id, d.mettreEnCours), () => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.impose_path_id = d.mettreEnCours;
        });
        return;
    }
    if (d.imposerRien !== undefined) {
        await fait(imposerLaSeance(vue.classe.id, ''), () => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.impose_path_id = null;
        });
        return;
    }

    if (d.chrono !== undefined) {
        const min = Number((document.getElementById('ec-chrono-min') || {}).value || 0);
        const quoi = (document.getElementById('ec-chrono-quoi') || {}).value || 'terminer';
        // ON RETIENT LA DURÉE CHOISIE. Le champ revenait à 10 dès qu'on lançait,
        // puis à 10 encore après l'arrêt : le professeur qui donne toujours
        // sept minutes devait les retaper à chaque fois, et ne pouvait pas
        // relire ce qu'il venait de lancer.
        if (min > 0) vue.chronoMin = min;
        await fait(lancerLeChrono(vue.classe.id, min, quoi));
        return;
    }

    if (d.chronoOff !== undefined) {
        await fait(arreterLeChrono(vue.classe.id));
        return;
    }

    if (d.reessayer !== undefined) {
        vue.erreur = ''; vue.classes = null;
        redessiner();
        const l = await mesClasses();
        if (l.erreur) vue.erreur = l.erreur; else vue.classes = l;
        redessiner();
        return;
    }

    // LE MODE LIBRE — on bascule, et l'on croit le SERVEUR, pas le bouton.
    //
    // La route rend l'état après écriture. On pourrait inverser la valeur
    // localement et redessiner tout de suite ; l'écran dirait alors « ouvert »
    // même si le serveur a refusé, et le professeur croirait avoir ouvert le
    // catalogue à trente élèves. On attend, on lit, on affiche ce qui EST.
    if (d.inscriptionLibre !== undefined) {
        const cible = d.inscriptionLibre !== '1';
        await fait(reglagesDuSite({ inscriptionLibre: cible }), (r) => {
            vue.reglagesSite = r.reglages || vue.reglagesSite;
            noterReglagesSite(vue.reglagesSite);
            showToast(cible
                ? 'L\'inscription libre est ouverte : un élève peut se déclarer avec le code de la classe.'
                : 'L\'inscription libre est fermée : seuls les billets ouvrent la porte.',
                'success');
        });
        return;
    }

    if (d.modeLibre !== undefined) {
        const cible = d.modeLibre !== '1';
        await fait(reglagesDuSite({ modeLibre: cible }), (r) => {
            vue.reglagesSite = r.reglages || vue.reglagesSite;
            // L'application entière suit : la porte d'entrée, la barre du haut.
            // Sans cet avis, le professeur verrait son propre écran inchangé et
            // se demanderait si le bouton a marché.
            noterReglagesSite(vue.reglagesSite);
            showToast(cible
                ? 'Le catalogue est ouvert aux élèves.'
                : 'Le catalogue est refermé : les élèves ne voient que ce que vous donnez.',
                'success');
        });
        return;
    }

    if (d.profs !== undefined) {
        vue.ou = 'profs'; vue.profs = null; vue.erreur = '';
        redessiner();
        const l = await lesProfesseurs();
        if (l.erreur) vue.erreur = l.erreur;
        else { vue.profs = l.professeurs; vue.fondateur = !!l.vousEtesLeFondateur; }
        redessiner();
        return;
    }

    if (d.retour !== undefined) {
        arreterLeBattement();
        vue.ou = 'classes'; vue.classe = null; vue.liste = null;
        vue.direct = null; vue.apercu = null; vue.erreur = '';
        redessiner();
        // La liste des classes a pu changer (effectif, pause) : on la relit.
        const l = await mesClasses();
        if (!l.erreur) { vue.classes = l; redessiner(); }
        return;
    }

    if (d.ouvrir) {
        const c = (vue.classes || []).find(x => x.id === d.ouvrir);
        if (!c) return;
        vue.ou = 'classe'; vue.classe = c; vue.onglet = 'direct'; vue.fiche = null;
        vue.liste = null; vue.direct = null; vue.apercu = null; vue.erreur = '';
        vue.bilans = null; vue.seances = null;
        redessiner();
        await rafraichirClasse(redessiner);
        // LE DIRECT DOIT POUVOIR NOMMER LA SÉANCE IMPOSÉE. Il ne connaît que
        // son identifiant ; le nom est dans la liste des séances. On la
        // demande en entrant plutôt qu'en arrivant sur son onglet — c'est une
        // lecture courte, et sans elle le direct dirait « une séance imposée »
        // au lieu de la nommer.
        seancesDeLaClasse(c.id).then(r => {
            if (!r.erreur) { vue.seances = r; redessiner(); }
        });
        lancerLeBattement(redessiner);
        return;
    }

    if (d.onglet) {
        vue.onglet = d.onglet;
        vue.apercu = null;
        redessiner();
        // Le direct ne bat que quand on le regarde : inutile d'interroger le
        // serveur toutes les vingt secondes pendant qu'on colle une liste.
        // Le direct ET le mur battent : ce sont les deux écrans qui changent
        // tout seuls sous les yeux du professeur.
        if (d.onglet === 'direct' || d.onglet === 'mur') lancerLeBattement(redessiner);
        else arreterLeBattement();
        if (!vue.liste) await rafraichirClasse(redessiner);
        // LA BIBLIOTHÈQUE DU SERVEUR, pour savoir ce qu'on peut imposer. On ne
        // la demande qu'en arrivant sur l'onglet qui s'en sert : le direct n'en
        // a que faire, et c'est la lecture la plus lourde de cet écran.
        // LES BILANS SE DEMANDENT EN ARRIVANT SUR L'ONGLET, et une seule fois.
        // C'est la lecture la plus lourde de toute l'API — elle reprojette le
        // journal entier de chaque élève — et elle n'a aucune raison de tourner
        // pendant qu'on regarde Le direct.
        // LES SÉANCES DE CETTE CLASSE, demandées en arrivant sur leur onglet.
        if (d.onglet === 'seances') {
            vue.seances = null;
            redessiner();
            const r = await seancesDeLaClasse(vue.classe && vue.classe.id);
            vue.seances = r.erreur ? { erreur: r.erreur } : r;
            redessiner();
        }
        if (d.onglet === 'bilans') {
            vue.bilans = null;
            redessiner();
            const r = await auServeur('/teacher/report',
                { classId: vue.classe && vue.classe.id });
            vue.bilans = r.erreur ? { erreur: r.erreur } : r;
            redessiner();
        }
        return;
    }

    if (d.nouvelleClasse !== undefined) {
        const nom = await demander('Le nom de la classe', {
            placeholder: '6e B', bouton: 'Créer', max: 80,
            aide: 'Celui que vous utilisez pour en parler — il ne sert qu\'à vous.'
        });
        if (!nom) return;
        const c = await fait(creerClasse(nom));
        if (c && c.id) {
            vue.classes = [c, ...(vue.classes || [])];
            showToast(`« ${c.name} » est créée. Le code à dicter est ${c.join_code}.`, 'success');
            redessiner();
        }
        return;
    }

    if (d.nouveauProf !== undefined) return nouveauProfesseur(redessiner);

    if (d.retirerProf) {
        const n = Number(d.classes) || 0;
        // ON DEMANDE CE QU'ON FAIT DE SES CLASSES AVANT DE RIEN TOUCHER. Un
        // collègue qui part laisse des élèves et une année de travail : les
        // effacer par défaut serait une catastrophe silencieuse.
        let quoi = 'reprendre', mot = '';
        if (n) {
            const rep = await demander(`${d.nom} a ${n} classe(s). Qu'en fait-on ?`, {
                valeur: 'REPRENDRE', bouton: 'Continuer',
                aide: 'Écrivez REPRENDRE pour les reprendre à votre nom, avec les élèves et '
                    + 'leur travail — ou EFFACER pour tout supprimer, ce qui est sans retour.'
            });
            const v = (rep || '').trim().toUpperCase();
            if (v !== 'REPRENDRE' && v !== 'EFFACER') return;
            if (v === 'EFFACER') { quoi = 'effacer'; mot = 'EFFACER'; }
        } else if (!await demander(`Retirer ${d.nom} ?`, {
            valeur: 'RETIRER', bouton: 'Retirer',
            aide: 'Il ne pourra plus se connecter. Écrivez RETIRER pour confirmer.'
        }).then(x => (x || '').trim().toUpperCase() === 'RETIRER')) return;

        await fait(retirerUnProfesseur(d.retirerProf, quoi, mot), () => { vue.profs = null; });
        const l = await lesProfesseurs();
        if (!l.erreur) { vue.profs = l.professeurs; vue.fondateur = !!l.vousEtesLeFondateur; }
        redessiner();
        return;
    }

    // SUPPRIMER DEPUIS LA LISTE — ET AVANT LE GARDE-FOU CI-DESSOUS.
    //
    // C'est tout l'intérêt du geste : on est justement dans la liste, donc
    // AUCUNE classe n'est ouverte. Placée après `if (!cid) return`, cette
    // branche n'était jamais atteinte — le clic ne faisait rien, sans erreur ni
    // message, ce qui est la pire des pannes : rien ne dit qu'il s'est passé
    // quelque chose. Mesuré au navigateur.
    //
    // Même route et même mot à écrire que depuis l'intérieur de la classe : on
    // ne fabrique pas un second chemin plus permissif parce qu'il est plus
    // pratique.
    if (d.supprimerCarte) {
        const mot = await demander(`Supprimer la classe « ${d.nom} » ?`, {
            bouton: 'Supprimer', placeholder: 'EFFACER',
            aide: 'La classe, ses élèves et tout leur travail disparaissent. '
                + 'C\'est sans retour. Écrivez EFFACER pour confirmer.'
        });
        if ((mot || '').trim() !== 'EFFACER') return;
        const r = await supprimerClasse(d.supprimerCarte, 'EFFACER');
        if (r && r.erreur) { vue.erreur = r.erreur; redessiner(); return; }
        showToast(r && r.dit ? r.dit : 'Classe supprimée.', 'info');
        // Le panneau « À qui ce parcours est donné » lit la même liste : sans
        // cet oubli, il montrerait encore la classe qu'on vient d'effacer.
        oublierLesClasses();
        const l = await mesClasses();
        if (!l.erreur) vue.classes = l;
        redessiner();
        return;
    }

    // --- Les gestes qui demandent une classe ouverte ---
    const cid = vue.classe && vue.classe.id;
    if (!cid) return;

    if (d.coller !== undefined) {
        const texte = await demanderTexte('Collez votre liste d\'élèves', {
            bouton: 'Voir ce qui va se passer', lignes: 12,
            aide: 'Collez le fichier ENTIER, tel qu\'il sort de Pronote ou d\'un tableur — '
                + 'toutes ses colonnes, sans rien nettoyer. Je vous montrerai le tableau et '
                + 'les colonnes que j\'ai retenues, et vous corrigerez si je me trompe.',
            placeholder: 'Élève\tNé(e) le\tClasse\tRégime\t…\nANDRIANTSITOHAINA Tiffany\t06/28/2013\t…'
        });
        if (!texte) return;

        // LE TABLEAU DES COLONNES S'INTERCALE ICI, et il ne remplace pas
        // l'aperçu du serveur — il le PRÉCÈDE.
        //
        // Rémy colle un export de Pronote de vingt-deux colonnes ; le serveur,
        // lui, sait très bien lire trois colonnes propres. On fait donc le
        // travail de lecture ICI, sous ses yeux et avec son accord, puis on
        // envoie au serveur une liste normalisée sur laquelle il n'a plus rien
        // à deviner. Les identifiants manquants, les doublons et l'aperçu avant
        // écriture restent son affaire, et ils marchaient déjà.
        const normalisee = await choisirLesColonnes(texte);
        if (!normalisee) return;
        const r = await fait(apercuDeListe(cid, normalisee, ''));
        if (r && r.apercu) { vue.apercu = r.apercu; redessiner(); }
        return;
    }

    if (d.annulerApercu !== undefined) { vue.apercu = null; redessiner(); return; }

    if (d.confirmerImport !== undefined) {
        const liste = vue.apercu && vue.apercu.texte;
        if (!liste) return;
        await fait(importerListe(cid, liste), (r) => {
            vue.apercu = null;
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    if (d.code) {
        await fait(nouveauCode(cid, d.code), (r) => {
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    if (d.ecarter) {
        await fait(ecarterEleve(cid, d.ecarter, d.etat !== '1'), (r) => {
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    if (d.retirer) {
        const mot = await demander(`Retirer ${d.prenom} de la classe ?`, {
            bouton: 'Retirer', placeholder: 'RETIRER',
            aide: 'Tout son travail sera effacé, et c\'est sans retour. '
                + 'Écrivez RETIRER pour confirmer.'
        });
        if ((mot || '').trim().toUpperCase() !== 'RETIRER') return;
        await fait(retirerEleve(cid, d.retirer), (r) => {
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    if (d.codesCommuns !== undefined) {
        const propose = (vue.liste && vue.liste.codePropose) || '';
        const code = await demander('Le même code pour toute la classe', {
            valeur: propose, bouton: 'Refaire les codes', max: 12,
            aide: 'De 3 à 12 lettres ou chiffres. Pratique pour une première séance : '
                + 'un seul code à écrire au tableau. Les anciens billets ne vaudront plus rien.'
        });
        if (!code) return;
        await fait(refaireLesCodes(cid, code), (r) => {
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    if (d.codesChacun !== undefined) {
        const mot = await demander('Refaire tous les codes, chacun le sien ?', {
            bouton: 'Refaire', placeholder: 'REFAIRE',
            aide: 'Chaque élève recevra un nouveau code tiré au sort. Les billets déjà '
                + 'distribués ne vaudront plus rien. Écrivez REFAIRE pour confirmer.'
        });
        if ((mot || '').trim().toUpperCase() !== 'REFAIRE') return;
        await fait(refaireLesCodes(cid, ''), (r) => {
            if (r.eleves) vue.liste = { ...(vue.liste || {}), eleves: r.eleves };
        });
        return;
    }

    // ── LA FICHE D'UN ÉLÈVE, DANS LE DIRECT ──────────────────────────────────
    //
    // Rémy : « il faut aussi pouvoir cliquer sur l'élève, voir où il en est ».
    // Un second clic referme : c'est ce qu'on essaie, et c'est ce qui permet de
    // retrouver la classe entière sans chercher de croix.
    if (d.fiche !== undefined) {
        vue.fiche = vue.fiche === d.fiche ? null : d.fiche;
        redessiner();
        return;
    }

    // ── DEUX GESTES VOISINS, DEUX NOMS QUI LE DISENT ────────────────────────
    //
    // En parcourant les écrans, j'ai d'abord cru tenir un doublon : « son
    // écran » d'un côté, « Voir son exercice » de l'autre. C'en était presque
    // l'inverse, et c'était pire — ce sont DEUX gestes différents, et c'est le
    // plus puissant des deux qui portait le nom le plus vague :
    //
    //   Le direct  → « Son exercice, chez moi »  ouvre SON ÉTAPE, avec ses
    //                réglages, sur VOTRE profil. Rien n'est enregistré.
    //   Les élèves → « Ouvrir son poste »        ouvre une fenêtre connectée
    //                SOUS SON NOM. Vous êtes lui.
    //
    // Un professeur qui cherche « voir ce qu'il fait » tombait sur le premier
    // et ne découvrait jamais le second. Les noms disent maintenant ce que
    // chacun fait, et chaque infobulle renvoie à l'autre.

    // ── VOIR CE QU'IL A SOUS LES YEUX ─────────────────────────────────────────
    //
    // Rémy : « quand on clique sur l'élève, il faudrait aussi pouvoir voir
    // l'écran ».
    //
    // ON OUVRE SON EXERCICE, ET L'ON NE PRÉTEND PAS QUE C'EST SON ÉCRAN. Les
    // nombres de chaque question sont tirés au sort chez l'élève ; ouvrir le
    // même exercice ici donne le même TRAVAIL, pas la même question. Appeler
    // cela « son écran » serait exactement le genre de petit mensonge d'écran
    // qu'on passe ses journées à débusquer — le bouton dit donc « Voir son
    // exercice », et son infobulle dit le reste.
    //
    // MAIS IL OUVRAIT LE ROBOT. Rémy, capture des deux écrans côte à côte :
    // « voir son exercice ne montre pas la même chose ». Non : ce bouton
    // appelait `openGameLayer(exo, true)`, et ce second argument s'appelle
    // `startAsDemo`. Le professeur voyait donc LA DÉMONSTRATION — « Le robot
    // joue : Les quadrilatères… », sur une autre étape que celle de l'élève —
    // pendant que son élève glissait des noms dans un organigramme.
    //
    // Et même sans le robot, il aurait manqué l'essentiel : les RÉGLAGES. Le
    // catalogue donne ses défauts ; l'élève, lui, travaille avec ce que le
    // professeur a coché dans l'étape. On ouvre donc l'étape elle-même.
    //
    // Un vrai miroir de son écran reste un autre métier : il faudrait que
    // l'élève envoie sa question au fil de l'eau, ce qui change ce qui voyage
    // sur le réseau pendant l'heure. À décider ensemble.
    if (d.voirExo !== undefined) {
        if (!d.voirExo) { showToast('Il n\'est sur aucun exercice pour l\'instant.', 'info'); return; }
        const exo = getExerciseById(d.voirExo);
        if (!exo) { showToast('Cet exercice n\'est pas au catalogue.', 'error'); return; }
        const etape = etapeDeLaSeance(d.voirExo);
        const [{ Runner }, { makeStep, makePath }, { politiquePerso }] = await Promise.all([
            import('../core/runner.js'), import('../core/path.js'),
            import('../core/mesExercices.js')
        ]);
        // AVEC SES RÉGLAGES À LUI, et une seule étape : ce qu'on ouvre doit
        // être le travail qu'il a devant les yeux, pas l'exercice du catalogue.
        const pas = makeStep(exo.id, (etape && etape.overrides) || {}, {
            stepId: 'voir', nbItems: (etape && etape.nbItems) || 5, threshold: 0, bonus: true
        });
        const parcours = makePath(`Chez ${d.prenom || 'l\'élève'} — ${exo.title}`,
            [pas], politiquePerso());
        parcours.personnel = true;
        // `essai` : RIEN N'EST ENREGISTRÉ. Le professeur qui regarde ne doit
        // pas apparaître dans son propre direct, ni gonfler ses statistiques.
        new Runner({
            path: parcours, deviceMode: 'none', essai: true,
            onExit: () => import('./navigation.js').then(m => m.setTopNavMode('path'))
        }).start();
        if (!etape) {
            showToast('Réglages du catalogue : cet exercice n\'est pas dans la séance donnée.',
                'info', 4000);
        }
        return;
    }

    // ── DISPENSER CET ÉLÈVE-CI DE CET EXERCICE-LÀ ────────────────────────────
    //
    // Rémy : « rendre facultatif un exercice — en fait s'il bloque il risque de
    // passer trop de temps ».
    //
    // LE SERVEUR SAVAIT DÉJÀ LE FAIRE POUR UN SEUL ÉLÈVE (`overrides.student_id`,
    // gardé et testé) ; l'écran ne l'offrait que pour la classe entière.
    // Dispenser trente élèves parce qu'un seul coince, c'est retirer la question
    // à vingt-neuf. Il manquait l'endroit où le dire — et c'est ici, puisqu'on
    // vient de cliquer sur LUI.
    if (d.sautEleve) {
        if (!d.exo) { showToast('Il faut qu\'il soit sur un exercice.', 'info'); return; }
        await fait(reglerUnExercice(cid, d.exo, 'saut', d.sautEleve), (r) => {
            vue.reglages = r.reglages || vue.reglages;
            showToast(`${d.prenom || 'L\'élève'} pourra passer « ${nomDExercice(d.exo)} ».`,
                'success');
        });
        return;
    }

    if (d.imprimer !== undefined) return imprimerLesBillets();
    // UN SEUL BILLET, POUR L'ÉLÈVE QUI A PERDU LE SIEN.
    //
    // « J'ai perdu mon code » arrive, et la seule réponse était de RETIRER le
    // code — le bouton d'à côté en tire un nouveau, ce qui invalide l'ancien
    // billet et oblige à tout réexpliquer. Or le code n'est pas perdu : il est
    // écrit dans la colonne d'à côté. Ce qui manque, c'est le bout de papier.
    if (d.billet) return imprimerLesBillets([d.billet]);

    if (d.saut !== undefined || d.retire !== undefined) {
        const champ = document.getElementById('ec-exo');
        const exo = champ ? champ.value.trim() : '';
        if (!exo) { showToast('Écrivez l\'identifiant de l\'exercice.', 'info'); return; }
        await fait(reglerUnExercice(cid, exo, d.retire !== undefined ? 'retire' : 'saut'), (r) => {
            vue.reglages = r.reglages || vue.reglages;
            if (champ) champ.value = '';
        });
        return;
    }

    // LA CALCULATRICE, ACCORDÉE EN DIRECT. Rémy : « le permettre en direct à un
    // groupe ou aux élèves ». Deux portées (`*` pour toute la séance, ou un
    // exercice), deux destinataires (la classe, ou les élèves cochés).
    if (d.calcDonner !== undefined) {
        const ou = document.getElementById('ec-calc-ou');
        const exo = ou ? ou.value : '*';
        const qui = elevesChoisis();
        const portee = exo === '*' ? 'pour toute la séance' : `sur « ${nomDExercice(exo)} »`;
        await fait(accorderLaCalculatrice(cid, exo, qui), (r) => {
            vue.reglages = r.reglages || vue.reglages;
            // ON NE DÉCOCHE PAS : le professeur vient peut-être de donner la
            // calculatrice à ces quatre-là, et il va leur souffler un indice
            // juste après. Perdre la sélection lui ferait recocher.
        }, `🧮 Calculatrice autorisée ${aQuiLaCalculatrice()}, ${portee}.`);
        return;
    }

    if (d.calcRetirer !== undefined) {
        await fait(retirerLaCalculatrice(cid), (r) => {
            vue.reglages = r.reglages || [];
        });
        return;
    }

    if (d.annulerReglage) {
        await fait(annulerUnReglage(cid, d.annulerReglage), (r) => {
            vue.reglages = r.reglages || [];
        });
        return;
    }

    if (d.consigne !== undefined) {
        const champ = document.getElementById('ec-consigne');
        await fait(poserConsigne(cid, champ ? champ.value : ''), (r) => {
            if (vue.liste && vue.liste.classe) {
                vue.liste.classe.notice = champ ? champ.value.trim() : '';
            }
        });
        return;
    }

    if (d.consigneOff !== undefined) {
        await fait(poserConsigne(cid, ''), () => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.notice = '';
        });
        return;
    }

    if (d.motClasse !== undefined) {
        const champ = document.getElementById('ec-mot');
        const corps = champ ? champ.value.trim() : '';
        if (!corps) return;
        await fait(envoyerUnMot(cid, corps), () => { if (champ) champ.value = ''; });
        return;
    }

    if (d.motEleve) {
        const corps = await demander(`Un mot pour ${d.prenom}`, {
            bouton: 'Envoyer', max: 500,
            aide: 'Il le verra à sa prochaine synchronisation, dans les secondes qui viennent.'
        });
        if (!corps) return;
        await fait(envoyerUnMot(cid, corps, d.motEleve));
        direSiHorsLigne(d.motEleve, d.prenom, 'Votre mot');
        return;
    }

    // L'INDICE : on propose, on n'impose pas.
    //
    // Ce qu'on propose sort de la LEÇON de la compétence que l'exercice
    // travaille — écrite une seule fois, dans js/data/skills.js, donc jamais
    // désynchronisée de ce que l'élève lira dans l'aide. Le professeur garde le
    // champ libre : c'est lui qui connaît son élève.
    if (d.indiceEleve) {
        const exo = d.exo ? getExerciseById(d.exo) : null;
        const competence = exo ? getSkill((skillsOf(exo) || [])[0]) : null;
        const corps = await choisirIndice(d.prenom, indicesProposes(competence));
        if (!corps) return;
        await fait(soufflerUnIndice(cid, corps, d.indiceEleve));
        direSiHorsLigne(d.indiceEleve, d.prenom, 'Ton indice');
        return;
    }

    if (d.bac !== undefined) {
        // ON NE TOUCHE PAS À LA DURÉE EN OUVRANT OU EN FERMANT : le quart
        // d'heure posé doit survivre à une fermeture le temps d'une
        // explication au tableau.
        await fait(reglerLeBac(cid, d.bac === '1'), (r) => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.bac_ferme = !!r.ferme;
        });
        return;
    }

    if (d.bacMinutes !== undefined) {
        const champ = document.getElementById('ec-bac-min');
        const min = champ ? Math.max(0, Math.min(120, parseInt(champ.value, 10) || 0)) : 0;
        await fait(reglerLeBac(cid, bacDeLaClasse(), min), (r) => {
            if (vue.liste && vue.liste.classe) {
                vue.liste.classe.bac_ferme = !!r.ferme;
                vue.liste.classe.bac_minutes = r.minutes || 0;
            }
        }, min ? `🧰 Bac à sable : ${min} minutes par élève, à partir du moment où il l'ouvre.`
               : '🧰 Bac à sable sans limite de temps.');
        return;
    }

    if (d.pause) {
        await fait(mettreEnPause(cid, d.pause === '1'), (r) => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.locked = !!r.locked;
            const c = (vue.classes || []).find(x => x.id === cid);
            if (c) c.locked = r.locked ? 1 : 0;
        });
        return;
    }

    if (d.renommer !== undefined) {
        const info = (vue.liste && vue.liste.classe) || vue.classe;
        const nom = await demander('Renommer la classe', {
            valeur: info.name || '', bouton: 'Renommer', max: 80
        });
        if (!nom) return;
        await fait(renommerClasse(cid, nom, info.level || null), () => {
            if (vue.liste && vue.liste.classe) vue.liste.classe.name = nom;
            vue.classe.name = nom;
            const c = (vue.classes || []).find(x => x.id === cid);
            if (c) c.name = nom;
        });
        return;
    }

    if (d.vider !== undefined || d.supprimer !== undefined) {
        const supprime = d.supprimer !== undefined;
        const mot = await demander(supprime ? 'Supprimer la classe ?' : 'Vider la liste ?', {
            bouton: supprime ? 'Supprimer' : 'Vider', placeholder: 'EFFACER',
            aide: (supprime
                ? 'La classe, ses élèves et tout leur travail disparaissent. '
                : 'Tous les élèves et tout leur travail disparaissent ; la classe reste, vide. ')
                + 'C\'est sans retour. Écrivez EFFACER pour confirmer.'
        });
        if ((mot || '').trim() !== 'EFFACER') return;
        const r = await fait(supprime ? supprimerClasse(cid, 'EFFACER') : viderClasse(cid, 'EFFACER'));
        if (!r) return;
        if (supprime) {
            arreterLeBattement();
            vue.classes = (vue.classes || []).filter(x => x.id !== cid);
            vue.ou = 'classes'; vue.classe = null; vue.liste = null; vue.direct = null;
        } else {
            await rafraichirClasse(redessiner);
        }
        redessiner();
    }
}

// --- Les allers-retours avec le serveur -------------------------------------

async function rafraichirClasse(redessiner) {
    const cid = vue.classe && vue.classe.id;
    if (!cid) return;
    const [l, d, r] = await Promise.all([listeDeClasse(cid), leDirect(cid), lesReglages(cid)]);
    if (l.erreur) vue.erreur = l.erreur; else { vue.liste = l; vue.erreur = ''; }
    if (!d.erreur) { vue.direct = d; noterLHeureDuServeur(d); }
    if (!r.erreur) vue.reglages = r.reglages || [];
    redessiner();
}

/**
 * LE DIRECT BAT TOUTES LES VINGT SECONDES — la même cadence que la page
 * d'administration, et pour la même raison : c'est le rythme auquel un
 * professeur relève la tête en circulant dans les rangs. Plus vite, on interroge
 * le serveur pour rien ; plus lentement, la pastille verte ment.
 *
 * ON NE REDESSINE QUE L'ONGLET DU DIRECT. Redessiner l'écran entier effacerait
 * ce que le professeur est en train de taper dans « le mot au tableau ».
 */
/**
 * DIX SECONDES, ET C'EST LA MOITIÉ DE CE QUE C'ÉTAIT.
 *
 * Rémy : « je ne peux pas avoir un aperçu en temps réel de la progression des
 * élèves ».
 *
 * Le délai total qu'il constatait était la SOMME de trois attentes : l'élève
 * pousse son journal quatre secondes après une réponse, le professeur relit
 * toutes les dix, et — c'était le gros du problème — la première des deux ne
 * partait jamais dans la session où l'élève s'était connecté (voir `initSync`).
 * Corrigées ensemble, elles donnent une quinzaine de secondes au pire.
 *
 * CINQ SECONDES, ET NON DIX. Rémy : « peut-on rendre la synchronisation plus
 * réactive ? » MESURÉ (`tools/tmp/delaiReel.mjs`), réponse de l'élève →
 * chiffre qui bouge sur l'écran du professeur :
 *
 *                              avant                après
 *     trois essais             8,0 · 7,0 · 7,0 s    voir le test
 *
 * Les deux moitiés du délai ont bougé ensemble : la poussée de l'élève part
 * maintenant tout de suite après un temps calme (voir `schedulePush` dans
 * core/sync.js), et ce battement-ci passe de dix à cinq secondes.
 *
 * ON NE DESCEND PAS PLUS BAS, et la raison n'est pas l'œil du professeur :
 * c'est que chaque battement fait relire au serveur les deux cents derniers
 * événements de CHACUN des trente élèves. Doubler la fréquence double ce
 * travail ; le quadrupler le quadruplerait, sur un hébergement mutualisé. Le
 * direct ne bat que pendant que son onglet est ouvert, ce qui borne la casse,
 * mais cinq secondes est le point où l'on s'arrête sans mesurer la charge du
 * serveur — et cette mesure-là, on ne l'a pas faite.
 */
const BATTEMENT_MS = 5000;

/**
 * CE QUE LE BATTEMENT A LE DROIT DE TOUCHER.
 *
 * Pas la barre de pilotage : elle porte des champs qu'on est en train de
 * remplir. Écrire « Prenez le cahier rouge » prend plus de dix secondes, et le
 * texte disparaissait sous les doigts du professeur — avec le repli qu'il
 * venait d'ouvrir.
 *
 * La barre n'est refaite que si sa FORME a changé : la pause bascule, le bac
 * s'ouvre, le compte à rebours démarre ou s'arrête. Ce sont des événements, pas
 * un rythme — et trois d'entre eux viennent d'un geste du professeur, qui
 * redessine déjà tout de son côté. Le quatrième, l'arrivée du chrono par le
 * serveur, est celui qui justifie cette signature.
 */
function signatureDuPilote() {
    const info = (vue.liste && vue.liste.classe) || {};
    const ch = vue.direct && vue.direct.chrono;
    // LA SÉANCE DONNÉE EN FAIT PARTIE depuis que la liste « dispenser la classe »
    // est peuplée par ses étapes : changer de séance change la liste, et la
    // barre doit se refaire. On n'y met PAS les exercices ouverts par les
    // élèves — ils changent à chaque minute du début de l'heure, et refaire la
    // barre effacerait le mot que le professeur est en train d'écrire.
    // LA CALCULATRICE EN FAIT PARTIE : le bouton « Retirer » n'existe que
    // lorsqu'il y a quelque chose à retirer. Sans cela, il n'apparaissait
    // qu'au prochain changement de forme — le professeur venait d'accorder la
    // calculatrice et n'avait aucun moyen de revenir en arrière.
    return [!!info.locked, !!bacDeLaClasse(), !!(ch && ch.finAt), (ch && ch.quoi) || '',
        info.impose_path_id || '',
        (vue.reglages || []).some(x => x.mode === 'calculatrice') ? 'calc' : '',
        String(minutesDuBac())].join('|');
}

function rafraichirLeDirect(zone) {
    const haut = zone.querySelector('.ec-direct-haut');
    const rangs = zone.querySelector('.ec-rangs');
    const pilote = zone.querySelector('.ec-pilote');
    // Pas encore la bonne structure — on vient d'arriver sur l'onglet : on
    // dessine tout, une fois.
    if (!haut || !rangs || !pilote) { zone.innerHTML = directHtml(); return; }

    if (pilote.dataset.forme !== signatureDuPilote()) { zone.innerHTML = directHtml(); return; }

    // On redessine le direct entier dans une boîte de côté, et l'on ne prend
    // que les deux morceaux vivants. Écrire deux fois le même gabarit — un pour
    // le tout, un pour les morceaux — serait deux vérités à tenir d'accord.
    const boite = document.createElement('div');
    boite.innerHTML = directHtml();
    const hautNeuf = boite.querySelector('.ec-direct-haut');
    const rangsNeufs = boite.querySelector('.ec-rangs');
    if (hautNeuf) haut.innerHTML = hautNeuf.innerHTML;
    if (rangsNeufs) rangs.innerHTML = rangsNeufs.innerHTML;
}

/**
 * LE DÉCOMPTE BAT À LA SECONDE, et rien d'autre avec lui.
 *
 * Le battement du serveur tourne toutes les dix secondes : un compte à rebours
 * qui n'en dépendrait que sauterait de dix en dix — « 06:52 », puis « 06:42 ».
 * Ce n'est pas un compte à rebours, c'est une horloge cassée.
 *
 * Ce minuteur-ci ne touche donc QU'AU TEXTE du décompte. Il ne redessine rien,
 * n'interroge pas le serveur, et disparaît avec l'écran. L'heure reste celle du
 * serveur : on ne fait qu'en soustraire les secondes écoulées depuis.
 */
let tictac = null;

/**
 * L'ÉCART ENTRE L'HORLOGE DU SERVEUR ET CELLE DU POSTE, en secondes.
 *
 * Le compte à rebours est daté par le SERVEUR (`ch.finAt`), parce que c'est la
 * même date pour les trente élèves et pour le professeur. Le tic-tac, lui, ne
 * dispose que de l'horloge du poste. Un ordinateur de salle réglé à trois
 * minutes près — cela existe, et personne ne s'en aperçoit jamais — afficherait
 * donc trois minutes de moins que la classe.
 *
 * On note l'écart à chaque réponse du serveur, et le tic-tac s'en sert. C'est
 * la seule façon d'avoir un seul compte à rebours dans la salle.
 */
let decalageHorloge = 0;
function noterLHeureDuServeur(d) {
    if (d && typeof d.maintenant === 'number') {
        decalageHorloge = d.maintenant - Math.floor(Date.now() / 1000);
    }
}

function arreterLeTicTac() { if (tictac) { clearInterval(tictac); tictac = null; } }

function lancerLeTicTac() {
    arreterLeTicTac();
    tictac = setInterval(() => {
        const el = document.querySelector('.ec-chrono-reste');
        if (!el) return;
        const ch = vue.direct && vue.direct.chrono;
        if (!ch || !ch.finAt) return;
        const reste = Math.max(0,
            ch.finAt - (Math.floor(Date.now() / 1000) + decalageHorloge));
        el.textContent = enMinutes(reste);
        el.classList.toggle('ec-chrono-reste--court', reste <= 60);
    }, 1000);
}

function lancerLeBattement(redessiner) {
    arreterLeBattement();
    lancerLeTicTac();
    battement = setInterval(async () => {
        // LE MUR BAT AUSSI, et il ne battait pas.
        //
        // La ligne d'appel dit « le direct ET le mur battent : ce sont les deux
        // écrans qui changent tout seuls sous les yeux du professeur » — et ce
        // garde-ci ne laissait passer que le direct. Le minuteur démarrait donc
        // sur le mur et n'y faisait rien. Mesuré : les six tuiles relevées à
        // t = 0 et à t = 35 s étaient identiques au caractère près, alors qu'un
        // élève avait répondu entre les deux, et « rien depuis 14 min » restait
        // « 14 min » indéfiniment — l'heure d'affichage était gelée avec.
        //
        // C'est le seul écran trié par urgence : figé, il désigne le mauvais
        // élève, ce qui est pire que ne rien désigner du tout.
        const surUnEcranVivant = vue.onglet === 'direct' || vue.onglet === 'mur';
        if (vue.ou !== 'classe' || !surUnEcranVivant || vue.occupe) return;
        const cid = vue.classe && vue.classe.id;
        if (!cid) return;
        const d = await leDirect(cid);
        if (d.erreur) return;          // une panne passagère ne vide pas l'écran
        vue.direct = d;
        noterLHeureDuServeur(d);
        const zone = document.querySelector('#ec-racine .ec-corps');
        if (!zone) return;
        // ET L'ON REDESSINE L'ÉCRAN QU'ON REGARDE. En levant le garde sans
        // toucher à cette ligne, le mur se serait fait remplacer par le direct
        // au bout de dix secondes : le professeur aurait vu son écran changer
        // tout seul sous ses yeux, ce qui est un défaut plus grave que celui
        // qu'on corrige.
        if (vue.onglet === 'mur') { zone.innerHTML = murHtml(); return; }
        rafraichirLeDirect(zone);
    }, BATTEMENT_MS);
}

// --- Les billets à imprimer -------------------------------------------------

/**
 * LES BILLETS SORTENT DANS UNE FENÊTRE À PART, ET NON DANS CELLE-CI.
 *
 * On aurait pu poser une feuille de style d'impression sur cet écran. On ne l'a
 * pas fait : imprimer depuis une application, c'est imprimer ce que le
 * navigateur croit voir — la barre du haut, la fenêtre modale, le fond gris.
 * Une page neuve ne contient QUE les billets, et l'on sait exactement ce qui
 * sortira de l'imprimante de la salle des profs.
 */
/**
 * @param {string[]} [seulement] les identifiants à imprimer ; tous par défaut.
 *   Un seul billet tient sur un tiers de page : c'est ce qu'on donne à l'élève
 *   qui a perdu le sien, sans toucher à son code ni déranger les vingt-neuf
 *   autres.
 */
function imprimerLesBillets(seulement) {
    let eleves = ((vue.liste && vue.liste.eleves) || []).filter(e => !e.sansBillet);
    if (seulement && seulement.length) {
        const gardes = new Set(seulement);
        eleves = eleves.filter(e => gardes.has(e.id));
    }
    if (!eleves.length) { showToast('Aucun billet à imprimer.', 'info'); return; }
    const info = (vue.liste && vue.liste.classe) || vue.classe || {};

    const f = window.open('', '_blank');
    if (!f) {
        showToast("Le navigateur a bloqué la fenêtre d'impression. "
            + 'Autorisez les fenêtres pour ce site, puis réessayez.', 'error');
        return;
    }
    f.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>Billets — ${esc(info.name || '')}</title>
    <style>
      body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
             margin: 14mm; color: #111; }
      h1 { font-size: 1.1rem; margin: 0 0 3mm; }
      .sous { color: #555; margin: 0 0 6mm; font-size: .9rem; }
      .billets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
      .billet { border: 1px dashed #999; border-radius: 3mm; padding: 4mm; break-inside: avoid; }
      .nom { font-weight: 700; font-size: 1.05rem; margin-bottom: 2mm; }
      .l { font-size: .88rem; margin: 1mm 0; }
      b.code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 1.15rem;
               letter-spacing: .08em; }
      .pied { margin-top: 3mm; font-size: .72rem; color: #666; }
      @media print { .rien { display: none; } }
    </style></head><body>
    <h1>${eleves.length === 1 ? `Billet de ${esc(eleves[0].prenom)}` : 'Billets'}
        — ${esc(info.name || '')}</h1>
    <p class="sous">${eleves.length === 1
        ? 'À redonner à cet élève. Son code n\'a pas changé : l\'ancien billet reste valable.'
        : 'À découper et à distribuer.'} L'élève tape son identifiant et son code
       sur la page d'accueil du site.</p>
    <p class="rien"><button onclick="window.print()">Imprimer</button></p>
    <div class="billets">
      ${eleves.map(e => `<div class="billet">
        <div class="nom">${esc(e.prenom)}</div>
        <div class="l">identifiant <b>${esc(e.login)}</b></div>
        <div class="l">code <b class="code">${esc(e.code)}</b></div>
        <div class="pied">${esc(location.origin + location.pathname.replace(/\/[^/]*$/, '/'))}</div>
      </div>`).join('')}
    </div></body></html>`);
    f.document.close();
}

// --- Ajouter un professeur --------------------------------------------------

/**
 * Rémy : « oui j'ai un compte admin mais pas un compte professeur, comment
 * j'ajoute un prof », puis « que je puisse créer un professeur ».
 *
 * TROIS QUESTIONS, PAS UN FORMULAIRE DE PLUS. Le nom, l'adresse, le mot de
 * passe. On les demande l'une après l'autre plutôt que d'ouvrir un écran :
 * c'est un geste qu'on fait deux fois dans une année.
 */
async function nouveauProfesseur(redessiner) {
    const nom = await demander('Le nom du professeur', {
        bouton: 'Suivant', max: 80, placeholder: 'Claire Fontaine',
        aide: 'Tel qu\'il s\'affichera dans son espace.'
    });
    if (!nom) return;
    const email = await demander('Son adresse de courriel', {
        bouton: 'Suivant', placeholder: 'claire.fontaine@college.fr',
        aide: 'C\'est avec elle qu\'il se connectera. La casse n\'a pas d\'importance.'
    });
    if (!email) return;
    const mdp = await demander('Un mot de passe pour lui', {
        bouton: 'Créer le compte',
        aide: 'Douze caractères au minimum. Il ouvre son espace professeur ET '
            + 'l\'administration du site — dites-lui de le changer.'
    });
    if (!mdp) return;

    const r = await creerUnProfesseur(nom, email, mdp);
    if (r.erreur) { showToast(r.erreur, 'error'); return; }
    showToast(r.dit || 'Le professeur est créé.', 'success');

    // ON DIT CE QUE CELA VEUT DIRE, ET CE QUE CELA NE VEUT PAS DIRE.
    await demander('Compte créé', {
        valeur: email, bouton: 'J\'ai noté',
        aide: `${nom} verra SES classes et seulement les siennes : il ne peut ni lire `
            + 'ni modifier les vôtres. Donnez-lui cette adresse et le mot de passe que '
            + 'vous venez de choisir.'
    });
    const l = await lesProfesseurs();
    if (!l.erreur) { vue.profs = l.professeurs; vue.fondateur = !!l.vousEtesLeFondateur; }
    if (redessiner) redessiner();
}

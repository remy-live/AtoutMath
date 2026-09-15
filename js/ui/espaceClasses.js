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
import { demander, demanderTexte } from './demander.js';
import { nomDuProf } from '../core/verrouProf.js';
import {
    mesClasses, creerClasse, listeDeClasse, apercuDeListe, importerListe,
    nouveauCode, refaireLesCodes, retirerEleve, ecarterEleve, leDirect,
    renommerClasse, mettreEnPause, poserConsigne, viderClasse, supprimerClasse,
    envoyerUnMot, creerUnProfesseur, lesProfesseurs, retirerUnProfesseur,
    lesReglages, reglerUnExercice, annulerUnReglage, estEnLigne, depuis,
    imposerLaSeance, lancerLeChrono, arreterLeChrono, auServeur
} from '../core/espaceProf.js';
import { adresseAdmin } from './classesServeur.js';
import { adresseDuPoste } from './posteEleve.js';
import { versionLisible } from '../core/versionDuSite.js';
import { getExerciseById } from '../data/catalog.js';
import { enBref, avancementDeClasse, depuisCombien } from '../core/avancement.js';

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

/** Le minuteur du direct. On l'arrête en quittant : sinon il tourne pour rien. */
let battement = null;

function arreterLeBattement() {
    if (battement) { clearInterval(battement); battement = null; }
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
            occupe: false };

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

    return enTeteHtml('Mes classes', esc(sous)) + messageHtml() + corps + piedHtml();
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
        </div>
    </div>`;
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
              >${esc(versionLisible())}</span>
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
    if (vue.onglet === 'direct') corps = directHtml();
    else if (vue.onglet === 'liste') corps = listeHtml();
    else corps = seanceHtml();

    return enTeteHtml(info.name || c.name, sous, true) + messageHtml() + `
    <nav class="ec-onglets">
        ${onglet('direct', 'Le direct')}
        ${onglet('liste', 'La liste')}
        ${onglet('seance', 'La séance')}
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
               <b>La liste</b>.</p>
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
    const nomSeance = (eleves.find(e => e.avancement && e.avancement.pathName) || {}).avancement;

    return `
    <p class="ec-compte">${enLigne} en ligne sur ${eleves.length}
       <span class="ec-note">— actualisé tout seul</span></p>
    <div class="ec-classe-avance">
        <div class="ec-classe-ligne">
            <b>${nomSeance ? esc(nomSeance.pathName) : 'La séance'}</b>
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
    <div class="ec-rangs">
        ${eleves.map(e => rangHtml(e, maintenant)).join('')}
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

function rangHtml(e, maintenant) {
    const ici = estEnLigne(e.vu, maintenant);
    const score = e.total
        ? `<span class="ec-score${e.justes / e.total >= 0.7 ? ' ec-score--bien' : ''}">${e.justes} / ${e.total}</span>`
        : '';
    return `
    <div class="ec-rang${ici ? ' ec-rang--ici' : ''}${e.ecarte ? ' ec-rang--ecarte' : ''}">
        <span class="ec-point${ici ? ' ec-point--vert' : ''}"></span>
        <div class="ec-rang-qui">
            <b>${esc(e.prenom)}</b>
            <span class="ec-rang-quand">${esc(depuis(e.vu, maintenant))}</span>
        </div>
        <div class="ec-rang-quoi">
            ${e.exo ? `<span class="ec-exo">${esc(nomDExercice(e.exo))}</span>`
                    : '<span class="ec-note">—</span>'}
            ${avanceHtml(e.avancement, e.quand, maintenant)}
        </div>
        ${score}
        <button type="button" class="ec-mini" data-mot-eleve="${esc(e.id)}"
                data-prenom="${esc(e.prenom)}" title="Lui écrire un mot">mot</button>
    </div>`;
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
                >Ouvrir un poste élève</button>
    </div>`;

    if (!eleves.length) {
        return outils + `<div class="ec-vide ec-vide--invite">
            <p class="ec-vide-grand">La liste est vide.</p>
            <p>Collez-la depuis Pronote ou un tableur — un élève par ligne. On vous
               montrera <b>ce qui va se passer</b> avant d'écrire quoi que ce soit.</p>
        </div>`;
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
                        title="Ouvrir une seconde fenêtre qui se comporte comme son poste">son écran</button>
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
    </div>` : '');
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

// --- Onglet « La séance » ---------------------------------------------------

function seanceHtml() {
    const info = (vue.liste && vue.liste.classe) || {};
    return `
    <div class="ec-cartes-reglages">

        <!-- LE MOMENT : ce qui commence et ce qui s'arrête pour toute la classe.
             Rémy : « lorsque les élèves se connectent, j'impose la séance,
             comme cela ils n'ont rien à lancer » et « pour le compte à rebours
             c'est pour terminer la séance ou mettre en pause ». -->
        <section class="ec-bloc ec-bloc--fort">
            <h3 class="ec-h3">Imposer la séance</h3>
            <p class="ec-note ec-note--bloc">Le parcours choisi s'ouvre TOUT SEUL chez vos élèves
               dès qu'ils arrivent : ils n'ont rien à lancer, rien à taper.</p>
            <div class="ec-champ-ligne">
                <select id="ec-impose" class="ec-champ">
                    <option value="">— personne n'a rien d'imposé —</option>
                    ${(vue.parcours || []).map(p => `<option value="${esc(p.id)}"${
                        info.impose_path_id === p.id ? ' selected' : ''
                    }>${esc(p.name)}</option>`).join('')}
                </select>
                <button type="button" class="ec-bouton" data-imposer>Imposer</button>
            </div>
            ${vue.parcours && !vue.parcours.length
                ? '<p class="ec-note ec-note--bloc">Aucun parcours sur le serveur pour l\'instant : '
                  + 'construisez-en un dans « Préparer », il montera tout seul.</p>' : ''}
        </section>

        <section class="ec-bloc ec-bloc--fort">
            <h3 class="ec-h3">Le compte à rebours</h3>
            <p class="ec-note ec-note--bloc">Il s'affiche en grand chez tous les élèves.
               À zéro, au choix : on ramasse les copies, ou la classe s'arrête pour vous écouter —
               et le travail est gardé, il revient là où il était.</p>
            <div class="ec-champ-ligne">
                <input type="number" id="ec-chrono-min" class="ec-champ ec-champ--court"
                       min="1" max="180" value="10" aria-label="Minutes">
                <select id="ec-chrono-quoi" class="ec-champ">
                    <option value="terminer">À zéro : on termine la séance</option>
                    <option value="pause">À zéro : on met en pause pour parler</option>
                </select>
                <button type="button" class="ec-bouton" data-chrono>Lancer</button>
                <button type="button" class="ec-bouton ec-bouton--doux" data-chrono-off>Arrêter</button>
            </div>
        </section>

        <section class="ec-bloc">
            <h3 class="ec-h3">Le mot au tableau</h3>
            <p class="ec-note ec-note--bloc">Il s'affiche chez tous les élèves de la classe,
               et il y reste jusqu'à ce que vous le retiriez.</p>
            <div class="ec-champ-ligne">
                <input type="text" id="ec-consigne" class="ec-champ" maxlength="300"
                       placeholder="Exercice 3 page 42, en binôme"
                       value="${esc(info.notice || '')}"
                       data-valide-sur-entree="data-consigne">
                <button type="button" class="ec-bouton" data-consigne>Afficher</button>
                ${info.notice ? '<button type="button" class="ec-bouton ec-bouton--doux" '
                    + 'data-consigne-off>Retirer</button>' : ''}
            </div>
        </section>

        <section class="ec-bloc">
            <h3 class="ec-h3">Un mot à toute la classe</h3>
            <p class="ec-note ec-note--bloc">Celui-là passe une fois, comme on lève la tête pour
               dire quelque chose. On voit qui l'a lu.</p>
            <div class="ec-champ-ligne">
                <input type="text" id="ec-mot" class="ec-champ" maxlength="500"
                       placeholder="On s'arrête dans cinq minutes"
                       data-valide-sur-entree="data-mot-classe">
                <button type="button" class="ec-bouton" data-mot-classe>Envoyer</button>
            </div>
        </section>

        <section class="ec-bloc">
            <h3 class="ec-h3">La pause</h3>
            <p class="ec-note ec-note--bloc">En pause, les élèves ne voient plus que ce que
               vous leur donnez : le catalogue disparaît. C'est le réglage d'un devoir surveillé.</p>
            <button type="button" class="ec-bouton${info.locked ? '' : ' ec-bouton--doux'}"
                    data-pause="${info.locked ? '0' : '1'}">
                ${info.locked ? 'Rouvrir la classe' : 'Mettre la classe en pause'}
            </button>
        </section>

        <section class="ec-bloc">
            <h3 class="ec-h3">Débloquer un exercice</h3>
            <p class="ec-note ec-note--bloc">Pour un élève coincé : autoriser le saut fait
               apparaître un bouton « passer » — l'étape ne compte alors ni pour ni contre lui.
               Le retirer l'enlève du parcours de tout le monde.</p>
            <div class="ec-champ-ligne">
                <input type="text" id="ec-exo" class="ec-champ" maxlength="80"
                       placeholder="calc-add" list="ec-exos"
                       data-valide-sur-entree="data-saut">
                <datalist id="ec-exos">
                    ${((vue.direct && vue.direct.eleves) || [])
                        .map(e => e.exo).filter(Boolean)
                        .filter((x, i, t) => t.indexOf(x) === i)
                        .map(x => `<option value="${esc(x)}">${esc(nomDExercice(x))}</option>`).join('')}
                </datalist>
                <button type="button" class="ec-bouton" data-saut>Autoriser le saut</button>
                <button type="button" class="ec-bouton ec-bouton--doux" data-retire>Le retirer</button>
            </div>
            ${reglagesHtml()}
        </section>

        <section class="ec-bloc">
            <h3 class="ec-h3">La classe elle-même</h3>
            <div class="ec-outils">
                <button type="button" class="ec-bouton ec-bouton--doux" data-renommer>Renommer</button>
                <button type="button" class="ec-bouton ec-bouton--doux" data-vider>Vider la liste</button>
                <button type="button" class="ec-bouton ec-bouton--rouge" data-supprimer>Supprimer la classe</button>
            </div>
            <p class="ec-note ec-note--bloc">Vider et supprimer emportent le travail des élèves,
               et c'est sans retour : on vous demandera d'écrire <b>EFFACER</b>.</p>
        </section>
    </div>`;
}

/** Les réglages d'exercice en vigueur, avec de quoi les défaire. */
function reglagesHtml() {
    const r = vue.reglages;
    if (!r || !r.length) return '';
    return `<div class="ec-puces ec-puces--reglages">
        ${r.map(x => `<span class="ec-puce">
            ${x.mode === 'retire' ? '⊘' : '↷'} ${esc(nomDExercice(x.exerciseId))}
            ${x.pour ? '· ' + esc(x.pour) : '· toute la classe'}
            <button type="button" class="ec-mini" data-annuler-reglage="${esc(x.id)}"
                    title="Annuler ce réglage">×</button>
        </span>`).join('')}
    </div>`;
}

// --- Les gestes -------------------------------------------------------------

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
        + '[data-imprimer], [data-consigne], [data-consigne-off], [data-mot-classe],'
        + '[data-mot-eleve], [data-pause], [data-renommer], [data-vider], [data-supprimer],'
        + '[data-nouveau-prof], [data-retirer-prof], [data-saut], [data-retire],'
        + '[data-profs], [data-reessayer], [data-poste],'
        + '[data-imposer], [data-chrono], [data-chrono-off],'
        + '[data-annuler-reglage]');
    if (!el) return;
    const d = el.dataset;

    // UNE SEULE ACTION À LA FOIS. Deux clics pendant que le réseau réfléchit,
    // et l'on écrit deux fois la même liste.
    if (vue.occupe) return;

    const fait = async (promesse, surSucces) => {
        vue.occupe = true;
        const r = await promesse;
        vue.occupe = false;
        if (r && r.erreur) { showToast(r.erreur, 'error'); return null; }
        if (r && r.dit) showToast(r.dit, 'success');
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

    if (d.imposer !== undefined) {
        const choix = document.getElementById('ec-impose');
        const r = await fait(imposerLaSeance(vue.classe.id, choix ? choix.value : ''));
        if (r && vue.liste && vue.liste.classe) vue.liste.classe.impose_path_id = choix.value || null;
        return;
    }

    if (d.chrono !== undefined) {
        const min = Number((document.getElementById('ec-chrono-min') || {}).value || 0);
        const quoi = (document.getElementById('ec-chrono-quoi') || {}).value || 'terminer';
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
        vue.ou = 'classe'; vue.classe = c; vue.onglet = 'direct'; vue.parcours = null;
        vue.liste = null; vue.direct = null; vue.apercu = null; vue.erreur = '';
        redessiner();
        await rafraichirClasse(redessiner);
        lancerLeBattement(redessiner);
        return;
    }

    if (d.onglet) {
        vue.onglet = d.onglet;
        vue.apercu = null;
        redessiner();
        // Le direct ne bat que quand on le regarde : inutile d'interroger le
        // serveur toutes les vingt secondes pendant qu'on colle une liste.
        if (d.onglet === 'direct') lancerLeBattement(redessiner);
        else arreterLeBattement();
        if (!vue.liste) await rafraichirClasse(redessiner);
        // LA BIBLIOTHÈQUE DU SERVEUR, pour savoir ce qu'on peut imposer. On ne
        // la demande qu'en arrivant sur l'onglet qui s'en sert : le direct n'en
        // a que faire, et c'est la lecture la plus lourde de cet écran.
        if (d.onglet === 'seance' && vue.parcours === null) {
            const r = await auServeur('/teacher/paths', { action: 'list' });
            vue.parcours = r.erreur ? [] : (r.paths || []).map(x => ({ id: x.id, name: x.name }));
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

    // --- Les gestes qui demandent une classe ouverte ---
    const cid = vue.classe && vue.classe.id;
    if (!cid) return;

    if (d.coller !== undefined) {
        const texte = await demanderTexte('Collez votre liste d\'élèves', {
            bouton: 'Voir ce qui va se passer', lignes: 12,
            aide: 'Un élève par ligne. « DUPONT ; Emma » ou « Emma Dupont » : les deux '
                + 'se lisent. Vous pouvez aussi coller directement depuis Pronote ou un tableur.',
            placeholder: 'DUPONT;Emma\nNGUYÊN;Maëlle\nBernard Tom;tom.b;7777'
        });
        if (!texte) return;
        const r = await fait(apercuDeListe(cid, texte, ''));
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

    if (d.imprimer !== undefined) return imprimerLesBillets();

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
    if (!d.erreur) vue.direct = d;
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
 * ON NE DESCEND PAS PLUS BAS. Le direct ne bat que pendant que l'onglet « Le
 * direct » est ouvert ; le raccourcir encore ferait une requête par seconde
 * pour voir bouger un compteur que l'œil ne suit pas si vite.
 */
const BATTEMENT_MS = 10000;

function lancerLeBattement(redessiner) {
    arreterLeBattement();
    battement = setInterval(async () => {
        if (vue.ou !== 'classe' || vue.onglet !== 'direct' || vue.occupe) return;
        const cid = vue.classe && vue.classe.id;
        if (!cid) return;
        const d = await leDirect(cid);
        if (d.erreur) return;          // une panne passagère ne vide pas l'écran
        vue.direct = d;
        const zone = document.querySelector('#ec-racine .ec-corps');
        if (zone) zone.innerHTML = directHtml();
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
function imprimerLesBillets() {
    const eleves = ((vue.liste && vue.liste.eleves) || []).filter(e => !e.sansBillet);
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
    <h1>Billets — ${esc(info.name || '')}</h1>
    <p class="sous">À découper et à distribuer. L'élève tape son identifiant et son code
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

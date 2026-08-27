// CENT CONSEILS DE MÉTHODE.
//
// Rémy : « une liste de conseil […] une centaine de chaque ce serait bien ».
//
// LA RÈGLE QUI LES A TOUS ÉCRITS : un conseil doit pouvoir être SUIVI
// AUJOURD'HUI. « Travaille régulièrement » n'est pas un conseil, c'est un
// reproche déguisé — l'élève sait déjà, et il ne saura pas davantage quoi faire
// en fermant la page. « Avant de calculer, entoure ce que la question demande »
// se fait dans les cinq secondes, sur l'exercice qu'il a sous les yeux.
//
// Trois familles, mêlées volontairement : la MÉTHODE (comment on s'y prend),
// l'ERREUR (comment on la repère), le TRAVAIL (comment on apprend). Les
// séparer en trois écrans reviendrait à demander à l'élève de choisir sa
// catégorie avant d'avoir lu — et personne ne clique sur « erreurs ».
//
// Ils ne portent JAMAIS sur une notion précise. Un conseil de contenu tombé au
// hasard un matin n'a aucune chance de correspondre à ce que l'élève travaille
// ce jour-là ; le carnet d'erreurs, lui, sait de quoi il parle et s'en charge.

export const CONSEILS = [
    // --- Lire l'énoncé ------------------------------------------------------
    'Quand tu bloques, relis la question à voix haute. La moitié des erreurs viennent d\'un mot lu trop vite.',
    'Avant de calculer, entoure ce que la question demande. On répond souvent très bien à une autre question.',
    'Un énoncé long n\'est pas un énoncé difficile. Coupe-le en phrases et traite-les une par une.',
    'Souligne les nombres ET leur unité. « 3 » et « 3 cm » ne se manipulent pas pareil.',
    'Repère le mot qui commande : calcule, trace, justifie, compare. Il dit ce qu\'on attend de toi.',
    '« Au moins », « au plus », « exactement » : ces trois mots changent toute la réponse. Ne les saute pas.',
    'Si l\'énoncé donne un dessin, cherche sur le dessin ce que la phrase vient de dire. C\'est là que se cachent les données.',
    'Un énoncé qui te semble impossible cache presque toujours une donnée que tu n\'as pas encore utilisée. Cherche-la.',
    'Recopie la question dans ta tête avec tes mots. Si tu n\'y arrives pas, c\'est qu\'il faut la relire.',
    'Quand il y a plusieurs questions, lis-les toutes avant de commencer : la première prépare souvent la dernière.',

    // --- Avant de se lancer -------------------------------------------------
    'Avant de calculer, demande-toi si le résultat sera grand ou petit. Tu repéreras tes erreurs toi-même.',
    'Estime d\'abord, calcule ensuite. Une estimation fausse de dix fois se voit ; un chiffre faux, non.',
    'Écris ce que tu sais avant de chercher ce que tu ne sais pas. La suite vient souvent toute seule.',
    'Si tu ne sais pas par où commencer, commence par faire un dessin. Même moche.',
    'Cherche un cas plus simple : avec 2 au lieu de 100. La méthode qui marche sur 2 marchera sur 100.',
    'Un problème avec de grands nombres se comprend avec de petits nombres. Remplace, comprends, puis remets les vrais.',
    'Note les unités dès le départ. Une longueur ne s\'ajoute pas à une aire, et les unités te le diront.',
    'Avant de te lancer dans un long calcul, vérifie que tu vises la bonne chose. Trois minutes bien dirigées valent dix minutes au hasard.',
    'Demande-toi à quel chapitre ressemble l\'exercice. Tu retrouveras la méthode plus vite qu\'en la réinventant.',
    'Si deux méthodes te viennent, prends celle que tu sais expliquer. C\'est celle que tu maîtrises.',

    // --- Pendant le calcul ---------------------------------------------------
    'Écris une étape par ligne. Les erreurs se cachent dans les lignes où l\'on a fait deux choses à la fois.',
    'Recopie tout ce qui reste quand tu passes à la ligne suivante. C\'est le « − 2 » oublié qui coûte des points, pas la règle.',
    'Ne calcule pas de tête ce que tu peux poser. La tête se trompe sans prévenir.',
    'Garde tes calculs même quand ils sont faux : c\'est en les relisant qu\'on trouve où ça a dérapé.',
    'Un signe moins se recopie. C\'est l\'erreur la plus fréquente de tout le collège, et elle ne vient jamais du raisonnement.',
    'Les parenthèses d\'abord, toujours. Quand elles ne sont pas écrites, demande-toi où elles devraient être.',
    'Si un calcul devient monstrueux, arrête-toi : ce n\'est probablement pas la bonne route.',
    'Simplifie avant de multiplier, pas après. 12/18 se simplifie en 2/3 ; 12 × 25 ne se simplifie plus.',
    'Aligne tes signes égal les uns sous les autres. Une copie alignée se relit ; une copie en escalier, non.',
    'Écris le résultat sous la forme demandée. Une réponse juste dans la mauvaise écriture perd des points, et c\'est dommage.',

    // --- Vérifier ------------------------------------------------------------
    'Vérifie ton résultat en le remettant dans l\'énoncé. C\'est la seule vérification qui prouve quelque chose.',
    'Relis ta réponse en te demandant : est-ce que ça a un sens ? Un âge de 300 ans, une longueur négative, ça se repère.',
    'Refaire le même calcul de la même façon ne vérifie rien. Fais-le autrement, ou vérifie l\'ordre de grandeur.',
    'Quand tu as fini, relis la question. Tu as peut-être calculé le périmètre alors qu\'on demandait l\'aire.',
    'Un résultat rond n\'est pas forcément juste, et un résultat compliqué n\'est pas forcément faux.',
    'Vérifie la dernière ligne autant que la première. La fatigue frappe à la fin.',
    'Si tu as le temps en contrôle, ne relis pas tout : relis les questions où tu as hésité. C\'est là que sont les erreurs.',
    'Compte tes réponses : autant de réponses que de questions. Une question sautée est un zéro gratuit.',
    'Une réponse sans unité est une réponse à moitié écrite.',
    'Encadre ta réponse finale. Le correcteur doit la trouver en une seconde.',

    // --- L'erreur -------------------------------------------------------------
    'Se tromper puis comprendre pourquoi vaut mieux que réussir sans savoir comment.',
    'Une erreur notée dans ton carnet n\'est pas une mauvaise note : c\'est une question que tu vas apprendre à refaire.',
    'Quand tu te trompes, cherche à quel moment exactement. « J\'ai tout faux » n\'apprend rien ; « j\'ai inversé à la troisième ligne » apprend tout.',
    'La même erreur qui revient trois fois n\'est pas de l\'étourderie : c\'est une règle mal comprise. Va la revoir.',
    'Refais l\'exercice raté le lendemain, pas tout de suite. Si tu sais encore le faire demain, tu l\'as compris.',
    'Ne barre pas ce qui est faux jusqu\'à l\'illisible : d\'un trait, et on voit encore. Ton erreur te servira.',
    'Distinguer « je ne savais pas » de « j\'ai été trop vite » change ce qu\'il faut travailler.',
    'Une erreur de calcul dans un raisonnement juste, c\'est un raisonnement juste. Ne jette pas tout.',
    'Si tu trouves un résultat bizarre, garde-le et écris pourquoi il te semble bizarre. C\'est déjà des points.',
    'Personne n\'a jamais appris les maths sans se tromper. Ceux qui semblent ne jamais se tromper se trompent en brouillon.',

    // --- Apprendre -------------------------------------------------------------
    'Dix minutes par jour valent mieux qu\'une heure le dimanche : la mémoire retient ce qu\'elle revoit.',
    'Apprendre une leçon, c\'est pouvoir la réciter SANS la lire. Ferme le cahier et essaie.',
    'Une règle qu\'on ne sait pas dire avec ses mots n\'est pas apprise, elle est recopiée.',
    'Fabrique-toi un exemple pour chaque règle. Une règle sans exemple s\'oublie en trois jours.',
    'Revois ta leçon le soir même, cinq minutes. C\'est le meilleur rapport temps/résultat de toute ta scolarité.',
    'Explique un exercice à quelqu\'un. Si tu y arrives, tu l\'as compris ; sinon, tu viens de trouver quoi revoir.',
    'Les tables de multiplication ne se comprennent pas, elles se savent. Deux minutes par jour, et c\'est réglé pour la vie.',
    'Apprendre par cœur ce qui doit l\'être libère la tête pour ce qui demande à réfléchir.',
    'Relire n\'est pas apprendre. Cache la page et essaie de la retrouver : c\'est ça, apprendre.',
    'Écris les formules à la main plutôt que de les relire. La main retient ce que l\'œil oublie.',

    // --- Aide et outils ---------------------------------------------------------
    'Le bouton d\'indice ne donne jamais la réponse : il donne la première chose à regarder. Sers-t\'en tôt plutôt que tard.',
    'Le robot fait l\'exercice devant toi en expliquant chaque geste. C\'est le meilleur départ sur un exercice inconnu.',
    'Demander de l\'aide après avoir vraiment essayé, ce n\'est pas tricher : c\'est la manière la plus rapide d\'apprendre.',
    'Poser une question précise — « je ne comprends pas pourquoi on divise ici » — obtient une réponse utile. « J\'ai rien compris », non.',
    'La calculatrice ne réfléchit pas à ta place. Elle calcule ce que tu tapes, même si c\'est faux.',
    'Vérifie ce que la calculatrice te rend : une touche à côté donne un résultat cent fois trop grand.',
    'Un brouillon sert à essayer, pas à être propre. N\'aie pas peur de le salir.',
    'Garde ton cahier de leçons ouvert quand tu t\'entraînes. On n\'apprend pas en se privant de ce qu\'on cherche à retenir.',
    'Une règle bien tracée, un compas bien serré : la moitié des erreurs de géométrie sont des erreurs de matériel.',
    'Taille ton crayon. Un trait de deux millimètres de large ne passe pas par un point.',

    // --- Géométrie ---------------------------------------------------------------
    'En géométrie, fais toujours une figure — même quand on ne le demande pas.',
    'Fais ta figure grande. Une figure minuscule cache justement ce qu\'on cherche à voir.',
    'Code ta figure : les angles droits, les longueurs égales, les parallèles. Le codage remplace une phrase.',
    'Une figure « à main levée » n\'est pas une figure bâclée : c\'est une figure rapide où l\'on note les données.',
    'Ne mesure jamais sur la figure pour répondre. La figure illustre, elle ne démontre pas.',
    'Nomme tes points au fur et à mesure. Une figure sans lettres ne se raconte pas.',
    'Pour justifier, cherche d\'abord la propriété du cours. Sans propriété, ce n\'est pas une justification, c\'est une impression.',
    'Écris tes justifications en trois temps : ce que tu sais, la propriété, la conclusion. Toujours dans cet ordre.',
    'Quand une figure est chargée, refais-la à côté avec seulement ce dont tu as besoin.',
    'Un angle droit qui n\'est pas codé sur la figure n\'est pas un angle droit. Même s\'il en a l\'air.',

    // --- Nombres et calcul mental --------------------------------------------------
    'Le calcul mental n\'est pas un don : c\'est un entraînement. Cinq minutes par jour suffisent.',
    'Pour multiplier par 5, multiplie par 10 et prends la moitié. C\'est plus rapide, et c\'est toujours vrai.',
    'Pour multiplier par 9, multiplie par 10 et retire une fois. 7 × 9 = 70 − 7 = 63.',
    'Ajouter 9, c\'est ajouter 10 et retirer 1. Ta tête ira deux fois plus vite.',
    'Connaître les doubles et les moitiés jusqu\'à 100 débloque la moitié du calcul mental.',
    'Un nombre est divisible par 3 si la somme de ses chiffres l\'est. Ça marche à tous les coups.',
    'La virgule ne se déplace pas : ce sont les chiffres qui changent de rang. C\'est la même chose, mais on se trompe moins.',
    'Multiplier ne rend pas toujours plus grand : × 0,5, c\'est prendre la moitié.',
    'Retiens les carrés jusqu\'à 15². Ils ressortent partout, de Pythagore aux racines.',
    'Compare deux fractions en les mettant au même dénominateur, jamais en comparant les chiffres.',

    // --- En classe et en contrôle ----------------------------------------------------
    'Commence un contrôle par ce que tu sais faire. Les points faciles se prennent en premier.',
    'Une question sautée n\'est pas une question perdue : reviens-y à la fin, souvent elle s\'est éclaircie.',
    'Écris ce que tu as commencé, même si tu n\'aboutis pas. Un raisonnement entamé rapporte des points ; une page blanche, zéro.',
    'Note la date et le numéro de l\'exercice. Un correcteur qui cherche perd patience avant toi.',
    'Prends tes notes en classe même si tu comprends : tu comprends aujourd\'hui, tu réviseras dans trois semaines.',
    'Quand tu n\'as pas compris en classe, note-le en marge d\'une croix. Le soir, tu sauras quoi reprendre.',
    'La dernière question d\'un exercice utilise presque toujours les précédentes. Relis-les avant de sécher.',
    'Dormir avant un contrôle vaut mieux que réviser une heure de plus. La mémoire se range pendant la nuit.',
    'Respire un coup avant de commencer. Le stress fait sauter des lignes, pas des connaissances.',
    'Compare ta copie corrigée avec ton cahier, pas avec la note. C\'est la seule façon d\'en tirer quelque chose.'
];

export const TAGS = {
    DOMAINE: {
        NUMERIQUE: "Numérique",
        GEOMETRIQUE: "Géométrique",
        GRANDEURS: "Grandeurs et Mesures",
        DONNEES: "Organisation de données"
    },
    SOUS_DOMAINE: {
        CALCUL_MENTAL: "Calcul Mental",
        NUMERATION: "Numération",
        FRACTIONS: "Fractions",
        DECIMAUX: "Nombres Décimaux",
        RELATIFS: "Nombres Relatifs",
        REPERAGE: "Repérage",
        ANGLES: "Angles",
        PRIORITES: "Priorités Opératoires",
        LOGIQUE: "Logique",
        PERIMETRE_AIRE: "Périmètre et Aire",
        ESPACE: "Géométrie dans l'espace",
        TABLEUR: "Tableur",
        DUREES: "Heures et Durées",
        PROBLEMES: "Résolution de Problèmes"
    },
    // Le troisième niveau de chemin a été retiré : « Tables de Multiplication »
    // coupait le calcul mental en deux dans l'arbre, et l'on ne trouvait plus
    // les tables sous « Calcul Mental ». C'est devenu un MOT-CLEF, qui se
    // cherche et ne range rien.
    NIVEAU: {
        CM2: "CM2",
        SIXIEME: "6ème",
        CINQUIEME: "5ème",
        QUATRIEME: "4ème",
        TROISIEME: "3ème"
    }
};

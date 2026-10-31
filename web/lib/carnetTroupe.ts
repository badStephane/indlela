// Référentiel de la troupe, transcrit du « Carnet de preuves » des Scouts du Sénégal.
// Une étape regroupe des domaines ; chaque domaine regroupe des preuves (un cercle à
// colorier dans le carnet papier). Les identifiants de preuve sont « domaine.n » :
// ne jamais renuméroter, ajouter toute nouvelle preuve en fin de liste.

import type { Domaine, Etape, Preuve } from "./referentiels";

interface DomaineOptions {
  /** false : domaine au choix (activé pour un jeune ou retiré par l'unité). */
  obligatoire?: boolean;
  /** « Satisfaire à N des épreuves suivantes » : nombre de preuves à réussir. */
  min?: number;
}

function domaine(id: string, name: string, preuves: string[], opts: DomaineOptions = {}): Domaine {
  return {
    id,
    name,
    obligatoire: opts.obligatoire ?? true,
    min: opts.min,
    preuves: preuves.map((label, i): Preuve => ({ id: `${id}.${i + 1}`, label })),
  };
}

/** Série de brevets (degrés de compétence) ; chaque brevet est une preuve pour l'étape Technicien. */
function serie(id: string, name: string, brevets: [string, string][]): Domaine {
  return { id, name, obligatoire: false, preuves: brevets.map(([bid, label]) => ({ id: bid, label })) };
}

const VOLONTAIRE: Etape = {
  id: "tr.vol",
  name: "Volontaire",
  val: "demande de Promesse remise au CT par le CP, avis de la cour d'honneur",
  rule: "3 à 6 mois d'initiation, sous le CP et le second",
  domaines: [
    domaine("tr.vol.esprit", "Esprit scout", [
      "Connaître les principes, la loi scoute et le cérémonial de la promesse ; savoir les appliquer",
      "Faire une bonne action (B.A) chaque jour",
      "Avoir un uniforme réglementaire, insignes cousus, et le porter correctement",
      "Arriver à l'heure aux réunions et à tout rendez-vous",
      "Faire le salut scout, siffler l'appel scout, savoir se présenter",
      "Connaître les insignes de l'Association et les noms des chefs du pays",
      "Payer sa cotisation annuelle et en savoir l'importance",
      "Connaître le refrain et les 2 premiers couplets du chant de la promesse",
    ]),
    domaine(
      "tr.vol.chretienne",
      "Vie chrétienne",
      [
        "Savoir ce que signifient son nom de chrétien et le signe de la croix",
        "Connaître la Loi de Dieu et chercher à y être fidèle",
        "Participer à la messe le dimanche et vivre les grandes fêtes liturgiques",
        "Choisir avec l'aumônier et le CP un article de la loi à travailler, et un passage d'Évangile",
        "Connaître les prières du chrétien et la prière scoute ; y être fidèle chaque jour",
        "Connaître et respecter les chefs de l'Église universelle et du pays",
      ],
      { obligatoire: false },
    ),
    domaine("tr.vol.sport", "Sport", [
      "Marcher en équilibre à 3 m du sol sur 6 m, un objet à la main",
      "Porter un camarade de même poids sur 15 m sans s'arrêter",
      "Faire une sortie d'unité sans fatigue anormale en tenant sa tâche",
      "Pratiquer un sport collectif ou individuel",
      "Faire du sport tous les matins",
    ]),
    domaine("tr.vol.observation", "Observation et reconnaissance", [
      "Situer son pays sur la carte de l'Afrique",
      "Connaître dix signes de piste",
      "Connaître les principales signalisations du code de la route",
      "S'orienter avec une boussole, le soleil et les constellations",
      "Retrouver les yeux bandés un objet caché à 10 m, en moins de 2 minutes",
      "Faire une veille de nuit silencieuse d'une demi-heure et écrire ses impressions",
      "Faire le plan d'un village ou d'un quartier avec ses points de repère",
      "Apprendre à la patrouille une danse ou un conte de son village",
      "Mimer une fable sénégalaise à la patrouille",
    ]),
    domaine("tr.vol.contact", "Contact nature", [
      "Faire bouillir de l'eau, la rendre buvable, puis effacer toute trace",
      "Faire une marche silencieuse de 8 km sans fatigue anormale ; chanter à l'arrivée",
      "Connaître 3 arbres dont le bois est utile au camp",
      "Laisser propre tout terrain quitté ; respecter les cultures et les arbres",
      "Savoir se comporter en cas d'incendie et prévenir les feux de brousse",
      "Reconnaître un animal à son bruit, son cri ou sa trace",
    ]),
    domaine("tr.vol.service", "Intervention service", [
      "Nettoyer et soigner une plaie",
      "Lancer le SOS en morse, au sifflet et avec les bras",
      "Connaître les dix nœuds de l'aspirant",
      "Connaître les façons de fabriquer un brancard",
      "Savoir téléphoner en cas d'urgence",
    ]),
    domaine("tr.vol.civisme", "Civisme", [
      "Connaître le nom et la vie du Président de la République",
      "Savoir ce que représentent les couleurs du drapeau national",
      "Connaître la date et le sens de la fête nationale",
      "Monter les couleurs selon le cérémonial réglementaire",
      "Chanter l'hymne national (refrain et un couplet)",
    ]),
    domaine("tr.vol.hygiene", "Hygiène", [
      "Se laver chaque jour, quel que soit le temps",
      "Savoir éviter dysenterie, tuberculose, choléra et paludisme",
      "Connaître les précautions avant et après les repas",
      "Participer à une journée de nettoyage (quartier, village, place publique)",
      "Contribuer à tenir la maison",
      "Veiller à la propreté de son corps (cheveux, dents, ongles)",
      "Veiller à la propreté de ses vêtements",
      "Veiller à la propreté de ses chaussures",
      "Organiser une chasse aux boîtes vides, une lutte contre les eaux",
      "S'abstenir de fumer",
    ]),
    domaine(
      "tr.vol.promotion",
      "Promotion socio-économique",
      [
        "Avoir aidé un paysan (culture, cueillette, récolte)",
        "Savoir entretenir des animaux domestiques",
        "Aménager ou travailler un jardin, un champ collectif ou un verger",
        "Pour qui n'a pas été à l'école : apprendre à lire sa langue",
      ],
      { min: 3 },
    ),
    domaine("tr.vol.promesse", "Promesse", ["Lettre de demande remise à la maîtrise par le chef de patrouille"]),
  ],
};

const ENGAGE: Etape = {
  id: "tr.eng",
  name: "Engagé",
  val: "cour d'honneur",
  rule: "1er degré de compétence générale",
  domaines: [
    domaine("tr.eng.esprit", "Esprit scout", [
      "Donner l'exemple, surtout sur les articles 4 et 8 de la loi scoute",
      "Tenir un poste d'action dans la patrouille, à la satisfaction du conseil de patrouille",
      "Rencontrer louveteaux et routiers",
    ]),
    domaine(
      "tr.eng.chretienne",
      "Vie chrétienne",
      [
        "Avoir un Évangile et en lire souvent des passages",
        "Vivre « Aimez-vous les uns les autres » dans la patrouille et le quartier",
        "Mimer avec la patrouille l'Évangile d'un dimanche et en tirer une application",
        "Continuer sa formation chrétienne avec l'aumônier et le CT",
        "Comprendre la messe et y participer activement",
        "Connaître le « Je crois en Dieu » et en expliquer l'essentiel",
        "Rencontrer le Christ dans la prière, l'Eucharistie et le service des autres",
      ],
      { obligatoire: false },
    ),
    domaine("tr.eng.sport", "Sport", [
      "Diriger la gymnastique matinale de la patrouille ou de la troupe",
      "Savoir nager (sauf impossibilité géographique ou médicale)",
      "Parcourir 1 km au pas scout en 7 minutes",
      "Parcours en 2 minutes : 50 m de course, 10 m de reptation, saut de 2 m, 6 cailloux sur une cible à 6 m",
      "Participer à une compétition amicale",
    ]),
    domaine("tr.eng.observation", "Observation", [
      "Connaître la carte et y situer son pays",
      "Lire une carte routière au 1/200 000 et y suivre un itinéraire",
      "Connaître ses mesures personnelles (pas, bras, main) pour mesurer sans instrument",
      "Entretenir coupe-coupe et machette, ne jamais les laisser traîner",
      "Présenter le compte rendu de la visite d'une industrie locale",
      "Transmettre un message oral de 20 mots reçu 2 heures avant (5 erreurs au plus)",
      "Émettre et recevoir un message",
      "Répondre à une alerte de jour comme de nuit (5 min au camp, 2 h en ville)",
    ]),
    domaine("tr.eng.contact", "Contact nature", [
      "Monter un sous-camp complet",
      "Connaître 6 arbres de sa région et leur usage ; les reconnaître ou les dessiner",
      "Faire un bon repas complet pour la patrouille",
      "Connaître 6 plantes ou champignons comestibles",
      "Connaître 6 plantes médicinales du pays",
      "Allumer un feu sous la pluie",
      "Fabriquer un objet utile au local et au camp",
      "Aider la patrouille à financer honnêtement ses activités",
      "Interpréter les signes d'une tornade ou d'un coup de vent",
      "Éteindre un feu de brousse et connaître ses dégâts",
      "Poser des tuteurs aux jeunes arbres",
    ]),
    domaine("tr.eng.hygiene", "Hygiène", [
      "Fabriquer un filtre à eau",
      "Savoir se comporter en cas d'asphyxie ou d'hémorragie",
      "Conduire une équipe pour une action d'hygiène de l'étape Volontaire",
    ]),
    domaine(
      "tr.eng.travaux",
      "Travaux pratiques",
      [
        "Peindre une porte, une table ou blanchir un plafond",
        "Vernir un meuble",
        "Réparer une conduite ou un robinet et faire un joint",
        "Poser et enlever une serrure",
        "Affûter des couteaux, une hache ou un coupe-coupe",
        "Réparer des meubles ou des récipients (calebasses…)",
        "Couper et poser une vitre",
        "Laver, repasser et plier du linge",
        "Raccommoder ses vêtements et recoudre des boutons",
        "Encadrer des gravures",
      ],
      { min: 6 },
    ),
    domaine("tr.eng.promotion", "Promotion socio-économique", [
      "Participer à un cours d'alphabétisation ou de vacances (ou en suivre un)",
    ]),
    domaine("tr.eng.service", "Intervention service", [
      "Intervenir sur brûlure, ampoule, corps étranger dans l'œil, saignement de nez, malaise",
      "Sortir un blessé d'une case ou d'une salle enfumée",
      "Émettre et recevoir en morse à 10 signes par minute",
      "Démonter et remonter la roue d'une voiture, d'un vélo ou d'une charrette",
      "Organiser le village contre un incendie de forêt et prévenir qui de droit",
    ]),
    domaine("tr.eng.civisme", "Civisme", [
      "Participer activement à une exploration régionale",
      "Connaître les grandes dates de l'histoire du Sénégal depuis l'indépendance",
      "S'informer régulièrement des nouvelles de la région et du pays",
      "Connaître l'organisation administrative et commerciale de sa région",
      "Connaître les ressources essentielles du pays",
    ]),
    domaine("tr.eng.equipement", "Équipement", [
      "Fabriquer un étui (toile, cuir ou paille) pour son carnet et ses accessoires",
      "Coudre soi-même ses boutons",
      "Réaliser une décoration pour le local ou la maison",
    ]),
    domaine("tr.eng.informatique", "Informatique", [
      "Allumer et éteindre un ordinateur",
      "Saisir un texte",
      "Avoir une boîte électronique",
      "Faire des recherches sur Internet",
    ]),
  ],
};

const TECHNICIEN: Etape = {
  id: "tr.tec",
  name: "Technicien",
  val: "cour d'honneur",
  rule: "au moins 3 brevets dans 2 séries",
  regle: { kind: "brevets", min: 3, series: 2 },
  domaines: [
    serie("tr.tec.sport", "Série Sport", [
      ["br.athlete", "Athlète"],
      ["br.arbitre", "Moniteur arbitre"],
      ["br.nageur", "Nageur"],
    ]),
    serie("tr.tec.contact", "Série Contact", [
      ["br.secourisme", "Secourisme"],
      ["br.guide", "Guide touristique"],
      ["br.presse", "Correspondant de presse"],
      ["br.interprete", "Interprète"],
    ]),
    serie("tr.tec.beauxarts", "Série Beaux-Arts", [
      ["br.musicien", "Musicien"],
      ["br.sculpteur", "Sculpteur"],
      ["br.bibliothecaire", "Bibliothécaire-relieur"],
      ["br.meneur", "Meneur artiste"],
    ]),
    serie("tr.tec.eglise", "Série Service dans l'Église", [
      ["br.catechiste", "Catéchiste-missionnaire"],
      ["br.acolyte", "Acolyte-liturgiste"],
      ["br.evangeliste", "Évangéliste"],
    ]),
    serie("tr.tec.ingeniosite", "Série Ingéniosité", [
      ["br.bricoleur", "Bricoleur"],
      ["br.informaticien", "Informaticien"],
      ["br.architecte", "Architecte constructeur"],
    ]),
    serie("tr.tec.arts", "Série Art et techniques", [
      ["br.menuisier", "Menuisier"],
      ["br.couturier", "Couturier"],
      ["br.macon", "Maçon"],
      ["br.tisserand", "Tisserand"],
      ["br.vannier", "Vannier"],
      ["br.mecanicien", "Mécanicien"],
      ["br.aminature", "Ami de la nature"],
      ["br.pecheur", "Pêcheur"],
      ["br.peintre", "Peintre-dessinateur"],
    ]),
    serie("tr.tec.pionnier", "Série Pionnier", [
      ["br.cuisinier", "Cuisinier"],
      ["br.campeur", "Campeur"],
      ["br.topographe", "Topographe"],
      ["br.transmetteur", "Transmetteur"],
    ]),
  ],
};

const ANIMATEUR: Etape = {
  id: "tr.ani",
  name: "Animateur",
  val: "cour d'honneur avec les animateurs du groupe, tous présents, après avis des parents ; vote secret, 3/4 des voix",
  domaines: [
    domaine("tr.ani.brevets", "Brevets exigés", [
      "Acolyte",
      "Évangéliste",
      "Catéchiste-missionnaire",
      "Secouriste",
      "Bricoleur",
      "Civisme",
      "Liturgiste",
      "Campeur",
      "Sportif",
    ]),
    domaine("tr.ani.eglise", "Service dans l'Église", [
      "Animer une messe : chants, commentaires, rite pénitentiel, prière universelle",
      "Animer plusieurs fois un partage d'Évangile dans l'unité",
      "Animer une prière du soir en week-end ou au camp",
    ]),
    domaine("tr.ani.animation", "Animation et techniques", [
      "Connaître les lois de la pesanteur et leurs applications (cerf-volant, avion, dirigeable)",
      "Enseigner et fabriquer au choix : un cerf-volant (100 m), un modèle d'avion (20 m) ou un parachute (100 g)",
      "Évaluer une hauteur, une profondeur, une distance",
      "Évaluer l'heure d'après la position du soleil",
      "Intéresser et distraire un groupe, ou organiser une conférence et diriger les débats",
      "Animer un groupe (chorale, orchestre, équipe, troupe…) au moins un an et former un successeur",
      "Contribuer à la spécialité d'une patrouille ou d'une unité",
      "Organiser une activité de développement communautaire",
      "Contribuer à la lutte contre les feux de brousse",
      "Faire un reportage avec ses propres photos",
      "Connaître les bases de l'électricité et réaliser une installation simple",
      "Organiser une journée de propreté (quartier, village, école, atelier)",
    ]),
  ],
};

export const TROUPE_STEPS: Etape[] = [VOLONTAIRE, ENGAGE, TECHNICIEN, ANIMATEUR];

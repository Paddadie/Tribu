// Fête du prénom : calendrier français des saints, embarqué (aucun réseau).
// Une ligne par jour : « MM-JJ Saint (variantes) ; Autre saint », `*` marquant une sainte.
// Les variantes sont fêtées le même jour que le saint, dont elles reprennent le nom affiché.

import { simplifier } from './liste';

const CALENDRIER = `
01-02 Basile
01-03 Geneviève* (Ginette)
01-04 Odilon
01-05 Édouard
01-06 Mélaine
01-07 Raymond ; Virginie*
01-08 Lucien
01-09 Alix*
01-10 Guillaume
01-11 Paulin
01-12 Tatiana*
01-13 Yvette*
01-14 Nina*
01-15 Rémi
01-16 Marcel
01-17 Roseline*
01-18 Prisca*
01-19 Marius
01-20 Sébastien
01-21 Agnès*
01-22 Vincent
01-23 Barnard
01-26 Paule* (Paula, Pauline, Paulette)
01-27 Angèle*
01-29 Gildas
01-30 Martine*
01-31 Marcelle*
02-01 Ella*
02-03 Blaise
02-04 Véronique*
02-05 Agathe*
02-06 Gaston ; Dorothée*
02-07 Eugénie*
02-08 Jacqueline*
02-09 Apolline*
02-10 Arnaud
02-12 Félix
02-13 Béatrice*
02-14 Valentin (Valentine)
02-15 Claude (Claudine, Claudette)
02-16 Julienne*
02-17 Alexis
02-18 Bernadette*
02-19 Gabin
02-20 Aimée*
02-22 Isabelle* (Isabel, Isabella)
02-23 Lazare
02-24 Modeste
02-25 Roméo
02-26 Nestor
02-27 Honorine*
02-28 Romain (Romane)
02-29 Auguste
03-01 Aubin
03-03 Guénolé
03-04 Casimir
03-05 Olive* (Olivia)
03-06 Colette*
03-07 Félicité*
03-09 Françoise*
03-10 Vivien
03-11 Rosine*
03-12 Justine*
03-13 Rodrigue
03-14 Mathilde* (Maud)
03-15 Louise* (Louisa)
03-16 Bénédicte*
03-17 Patrice (Patrick, Patricia)
03-18 Cyrille (Cyril)
03-19 Joseph (Josèphe, Joséphine, Josette, José)
03-20 Herbert
03-21 Clémence*
03-22 Léa*
03-23 Victorien
03-26 Larissa*
03-27 Habib
03-28 Gontran
03-29 Gwladys*
03-30 Amédée
03-31 Benjamin
04-01 Hugues (Hugo)
04-02 Sandrine*
04-03 Richard
04-04 Isidore
04-05 Irène*
04-06 Marcellin
04-08 Julie*
04-09 Gautier
04-10 Fulbert
04-11 Stanislas
04-12 Jules
04-13 Ida*
04-14 Maxime
04-15 Paterne
04-17 Anicet
04-18 Parfait
04-19 Emma*
04-20 Odette*
04-21 Anselme
04-22 Alexandre (Alexandra, Alexandrine, Alex)
04-23 Georges (Georgette, Georgina)
04-24 Fidèle
04-25 Marc
04-26 Alida*
04-27 Zita*
04-28 Valérie*
04-30 Robert (Roberte)
05-02 Boris
05-03 Philippe (Philippine)
05-04 Sylvain
05-05 Judith*
05-06 Prudence*
05-07 Gisèle*
05-08 Désiré
05-09 Pacôme
05-10 Solange*
05-11 Estelle*
05-12 Achille
05-13 Rolande*
05-14 Matthias (Mathias)
05-15 Denise*
05-16 Honoré
05-17 Pascal (Pascale)
05-18 Éric (Erika)
05-19 Yves (Yvon, Yvonne)
05-20 Bernardin
05-21 Constantin
05-22 Émile (Émilien)
05-23 Didier
05-24 Donatien
05-25 Sophie*
05-26 Bérenger
05-28 Germain
05-29 Aymar
05-30 Ferdinand ; Jeanne* (Jeannine, Jeannette)
05-31 Pétronille* (Perrine)
06-01 Justin
06-02 Blandine*
06-03 Kévin
06-04 Clotilde*
06-05 Igor
06-06 Norbert
06-07 Gilbert
06-08 Médard
06-09 Diane*
06-10 Landry
06-11 Barnabé
06-12 Guy
06-13 Antoine (Antonin, Antonio)
06-14 Élisée
06-15 Germaine*
06-16 Jean-François (Régis)
06-17 Hervé
06-18 Léonce
06-19 Romuald
06-20 Silvère
06-21 Rodolphe
06-22 Alban
06-23 Audrey*
06-24 Jean-Baptiste (Baptiste)
06-25 Prosper
06-26 Anthelme
06-27 Fernand
06-28 Irénée
06-29 Pierre (Pierrette, Pierrick, Peter) ; Paul
06-30 Martial
07-01 Thierry
07-02 Martinien
07-03 Thomas (Tom)
07-04 Florent
07-06 Mariette*
07-07 Raoul
07-08 Thibaut (Thibault)
07-09 Amandine*
07-10 Ulrich
07-11 Benoît (Benoîte)
07-12 Olivier
07-13 Henri (Henriette, Harry) ; Joël (Joëlle)
07-14 Camille*
07-15 Donald
07-16 Carmen*
07-17 Charlotte*
07-18 Frédéric (Frédérique)
07-19 Arsène
07-20 Marina* (Marine)
07-21 Victor (Victoire)
07-22 Marie-Madeleine* (Madeleine, Madeline, Magali, Maddie)
07-23 Brigitte*
07-24 Christine* (Christina)
07-25 Jacques (Jacky, Jimmy)
07-26 Anne* (Annie, Anaïs, Annette, Ana, Anna) ; Joachim
07-27 Nathalie* (Natalia)
07-28 Samson
07-29 Marthe*
07-30 Juliette*
07-31 Ignace
08-01 Alphonse
08-02 Julien
08-03 Lydie*
08-04 Jean-Marie (Vianney)
08-05 Abel
08-07 Gaétan
08-08 Dominique
08-09 Amour
08-10 Laurent (Laurence, Laure, Laura)
08-11 Claire* (Clara) ; Suzanne* (Suzy, Suzette)
08-12 Clarisse*
08-13 Hippolyte
08-14 Évrard
08-15 Marie* (Maria, Marion, Manon, Maryse, Muriel, Myriam, Maïa, Mia)
08-16 Armel
08-17 Hyacinthe
08-18 Hélène* (Elena, Léna)
08-19 Eudes
08-20 Bernard
08-21 Christophe
08-22 Fabrice
08-23 Rose*
08-24 Barthélemy
08-25 Louis (Louison, Ludovic)
08-26 Natacha*
08-27 Monique*
08-28 Augustin
08-29 Sabine*
08-30 Fiacre
08-31 Aristide
09-01 Gilles
09-02 Ingrid*
09-03 Grégoire
09-04 Rosalie*
09-05 Raïssa*
09-06 Bertrand
09-07 Reine*
09-08 Adrien (Adrienne)
09-09 Alain
09-10 Inès*
09-11 Adelphe
09-12 Apollinaire
09-13 Aimé
09-15 Roland
09-16 Édith*
09-17 Renaud
09-18 Nadège*
09-19 Émilie*
09-20 Davy
09-21 Matthieu (Mathieu)
09-22 Maurice
09-23 Constant
09-24 Thècle*
09-25 Hermann
09-26 Côme ; Damien
09-28 Venceslas
09-29 Michel (Michèle, Michelle, Mickaël, Michaël) ; Gabriel (Gabrielle) ; Raphaël (Raphaëlle)
09-30 Jérôme
10-01 Thérèse* (Thérésa)
10-02 Léger
10-03 Gérard
10-04 François (Francis, Franck)
10-05 Fleur*
10-06 Bruno
10-07 Serge
10-08 Pélagie*
10-09 Denis
10-10 Ghislain
10-11 Firmin
10-12 Wilfried
10-13 Géraud
10-14 Juste
10-15 Aurélie*
10-16 Edwige*
10-17 Baudouin
10-18 Luc (Lucas)
10-19 René (Renée)
10-20 Adeline* (Aline)
10-21 Céline*
10-22 Élodie*
10-24 Florentin
10-25 Crépin
10-26 Dimitri
10-27 Émeline*
10-28 Simon (Simone) ; Jude
10-29 Narcisse
10-30 Bienvenue*
10-31 Quentin
11-03 Hubert
11-04 Charles (Caroline, Carole, Charly)
11-05 Sylvie*
11-06 Bertille*
11-07 Carine* (Karine)
11-08 Geoffroy
11-09 Théodore (Théo)
11-10 Léon (Léonie, Lionel)
11-11 Martin
11-12 Christian (Christiane)
11-13 Brice
11-14 Sidoine
11-15 Albert (Arthur)
11-16 Marguerite* (Margaux, Margot, Maggie)
11-17 Élisabeth* (Élise, Lisa, Élisa, Lise, Babette)
11-18 Aude*
11-19 Tanguy
11-20 Edmond
11-22 Cécile*
11-23 Clément (Clémentine)
11-24 Flora*
11-25 Catherine* (Cathy)
11-26 Delphine*
11-27 Séverin
11-29 Saturnin
11-30 André (Andrée, Andréa)
12-01 Florence*
12-02 Viviane*
12-03 François-Xavier (Xavier)
12-04 Barbara*
12-05 Gérald
12-06 Nicolas (Nicole, Colin)
12-07 Ambroise
12-10 Romaric
12-11 Daniel (Danielle, Dany)
12-12 Chantal*
12-13 Lucie* (Lucile, Lucille)
12-14 Odile*
12-15 Ninon*
12-16 Alice*
12-17 Gaël (Gaëlle)
12-18 Gatien
12-19 Urbain
12-20 Théophile
12-23 Armand
12-24 Adèle*
12-25 Emmanuel (Emmanuelle, Noël, Noëlle)
12-26 Étienne (Stéphane, Stéphanie, Estève)
12-27 Jean (Yann, Jehan, Jeannot, Johan, Ivan)
12-29 David
12-30 Roger
12-31 Sylvestre
`;

export interface Fete {
  mois: number;
  jour: number;
  /** « Sainte Geneviève », « Saint Jean » : le saint du jour, même pour une variante (Ginette). */
  saint: string;
}

/** Index des prénoms simplifiés (sans accent ni casse) vers leur fête ; construit au premier appel. */
let index: Map<string, Fete> | undefined;

/** Lignes du calendrier découpées : sert aussi aux tests (doublons). */
export function entreesCalendrier(): { prenom: string; fete: Fete }[] {
  const entrees: { prenom: string; fete: Fete }[] = [];
  for (const ligne of CALENDRIER.trim().split('\n')) {
    const [, mm, jj, reste] = ligne.match(/^(\d{2})-(\d{2}) (.+)$/) as RegExpMatchArray;
    for (const partie of reste.split(';')) {
      const [, nom, etoile, variantes] = partie.trim().match(/^([^*(]+?)(\*?)(?: \((.+)\))?$/) as RegExpMatchArray;
      const fete = { mois: Number(mm), jour: Number(jj), saint: `${etoile ? 'Sainte' : 'Saint'} ${nom}` };
      entrees.push({ prenom: nom, fete });
      for (const v of variantes?.split(',') ?? []) entrees.push({ prenom: v.trim(), fete });
    }
  }
  return entrees;
}

/**
 * Fête du premier prénom (« Jean-Pierre Martin » → « Jean-Pierre »), sans tenir compte des accents ni de la casse.
 * Un prénom composé doit figurer tel quel au calendrier ; sinon pas de fête.
 */
export function feteDuPrenom(prenom: string): Fete | undefined {
  if (!index) {
    index = new Map();
    for (const { prenom: p, fete } of entreesCalendrier()) if (!index.has(simplifier(p))) index.set(simplifier(p), fete);
  }
  const premier = prenom.trim().split(/\s+/)[0];
  return premier ? index.get(simplifier(premier)) : undefined;
}

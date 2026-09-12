# Utiliser Rolevidence

Rolevidence aide à confronter un parcours déclaré aux exigences d’une offre,
avec des citations consultables. Il s’utilise localement, par une personne en
recherche d’emploi ou par un recruteur. Il ne donne pas de score d’employabilité
et ne décide pas de retenir ou de rejeter une candidature.

[Installation](../README.md#quick-start) · [Vidéo de découverte](media/rolevidence-tour.fr.mp4) · [Fonctionnement technique](HOW_IT_WORKS.md)

## Premier démarrage

Installez Node.js 24.15 ou une version ultérieure de la branche 24.x, puis suivez
les commandes du README. Renseignez votre clé OpenAI ou Anthropic dans le fichier
local `.env`. Ne la partagez pas et ne la mettez pas dans Git.

Après `npm run build` puis `npm start`, ouvrez http://127.0.0.1:3001.
L’interface est en français. Sans clé, vous pouvez préparer et sauvegarder vos
dossiers et prévisualiser le contexte ; les analyses nécessitent une clé valide.
Les appels au fournisseur sont facturés selon votre compte.

## Préparer un dossier

1. Depuis l’accueil, donnez un nom au dossier, puis cliquez sur **Créer un dossier**.
2. Choisissez l’usage : recherche d’emploi ou recrutement. Les règles de preuve
   restent identiques dans les deux cas.
3. Importez un CV PDF, DOCX ou TXT, ou collez le texte dans **Profil candidat**.
   Relisez le résultat : les mises en page complexes peuvent altérer l’extraction.
4. Dans **Offre d’emploi**, collez la description du poste. Vous pouvez aussi
   ouvrir **Lien public de l’offre**, importer une URL, vérifier les champs et
   leurs sources, puis cliquer sur **Utiliser ce texte dans l’offre**.
5. Renseignez les préférences du candidat, séparément du CV : salaire minimum
   annuel fixe en euros bruts, mode de travail et jours de télétravail souhaités.
   Précisez si chaque préférence est obligatoire ou négociable.
6. Sélectionnez un fournisseur et un modèle configurés. Consultez le contexte
   envoyé au modèle si vous souhaitez vérifier les textes avant transmission.
7. Cliquez sur **Enregistrer et analyser**. L’enregistrement précède l’appel :
   s’il échoue, vos modifications restent affichées et l’analyse ne démarre pas.

Les fichiers importés sont limités à 5 Mio, les PDF à 20 pages et les textes à
16 000 caractères. Un PDF scanné sans texte exploitable nécessite une conversion
externe ou une saisie manuelle. Les originaux ne sont pas archivés automatiquement.
Une URL inaccessible, protégée ou nécessitant une connexion peut être remplacée
par un texte collé. L’import n’accède pas aux pages privées.

## Lire une analyse

Utilisez les filtres, sélectionnez un critère, puis consultez son explication et
les citations du profil, de l’offre ou des préférences.

| Résultat       | Comment le lire                                                  | Suite utile                                                                                |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Correspondance | Une déclaration citée soutient l’exigence.                       | Vérifier le contexte et, si nécessaire, approfondir en entretien.                          |
| Écart          | Les informations comparables indiquent une différence explicite. | Examiner l’importance du critère et les possibilités de discussion.                        |
| Inconnue       | Les informations ne suffisent pas pour conclure.                 | Poser une question ciblée ; ne pas assimiler le silence du CV à une absence de compétence. |
| À vérifier     | Une conclusion ne dispose pas de preuves validées suffisantes.   | Revenir au texte source avant d’utiliser la conclusion.                                    |

Certains libellés précisent le sens du résultat :

- **Budget à confirmer** : « à partir de 35 000 € » n’est pas un plafond. Cela
  ne garantit pas non plus qu’une demande de 60 000 € sera acceptée.
- **Écart sur le diplôme présenté** : le niveau interprété du diplôme déclaré
  est inférieur au niveau demandé. Il ne s’agit pas d’une équivalence officielle,
  ni d’une décision sur l’expérience compensatoire.
- **Souhait négociable** : une préférence reste à discuter, sans devenir une
  contrainte éliminatoire.
- **Indice documenté · à préciser** : une pratique est mentionnée mais ne suffit
  pas à établir toute l’exigence.

Les contrôles de couverture signalent les passages encore à examiner. Le contexte
commercial ou administratif de l’offre reste séparé des conclusions de candidature.
Une citation exacte et un JSON valide ne garantissent pas une interprétation juste.

## Clarifier sans réécrire le CV

Sélectionnez un critère et ouvrez **Apporter une précision**. Ajoutez une réponse
factuelle avec son contexte, sa pratique ou sa durée. L’application la conserve
comme déclaration attribuée, séparément du CV. Ajoutez-la au dossier, enregistrez
et relancez une analyse pour en tenir compte.

Les résultats précédents conservent leurs documents d’origine. Une précision
saisie mais non ajoutée n’est pas une nouvelle preuve enregistrée.

## Suivre le travail et comparer plusieurs dossiers

Dans **Suivi de la candidature**, enregistrez un statut, des notes personnelles,
la préparation et le compte rendu d’entretien. Ces informations humaines ne sont
pas envoyées au modèle et ne deviennent pas des conclusions IA.

Depuis un dossier enregistré, créez une campagne :

- Recherche d’emploi : **Comparer ce profil à plusieurs offres**.
- Recrutement : **Comparer plusieurs profils à cette offre**.

Une campagne comporte 2 à 10 dossiers indépendants. Lancez leurs analyses
individuellement, puis comparez leurs preuves côte à côte. Aucun classement
n’est calculé. Modifier le dossier source ne modifie pas les copies existantes.
En recrutement, renseignez les préférences de chaque personne dans son dossier ;
elles ne sont pas déduites du CV ou copiées d’un autre candidat.

## Analyses longues et interruptions

La progression indique les étapes et lots réellement terminés. Vous pouvez
quitter le dossier et le rouvrir. **Annuler l’analyse** demande l’arrêt ; un appel
réseau déjà engagé peut néanmoins avoir été facturé.

Après une interruption, **Reprendre les étapes restantes** réutilise les étapes
validées lorsque leur version reste compatible. L’appel inachevé peut devoir être
refait. Il n’existe pas de relance payante automatique ni de file d’exécution de
toutes les candidatures. Une nouvelle analyse est nécessaire si les sources ou
les versions rendent les anciens points de reprise incompatibles.

## Sauvegarder et partager

- Dans l’historique, sélectionnez une analyse et exportez le **rapport HTML
  imprimable**. Ouvrez-le dans un navigateur pour l’imprimer ou l’enregistrer en PDF.
- **Sauvegarder ce dossier** télécharge une copie JSON des textes, préférences,
  déclarations, suivi et analyses enregistrés. Depuis l’accueil, **Restaurer une
  sauvegarde** crée une nouvelle copie indépendante.
- La sauvegarde d’un dossier ne contient pas les groupes de campagnes ni les
  analyses inachevées. Pour conserver tout l’espace de travail, arrêtez le serveur
  et sauvegardez sa base SQLite selon le [guide d’exploitation](OPERATIONS.md).

Les rapports et sauvegardes contiennent des données personnelles et ne sont pas
chiffrés. Relisez-les avant partage. Supprimer un dossier supprime ses analyses
associées, mais pas les fichiers déjà exportés. Supprimer une campagne enlève
son regroupement, sans supprimer les dossiers membres.

## Où vont les données ?

Les textes explicitement enregistrés restent dans `storage/rolevidence.sqlite`
par défaut. Les modifications non enregistrées restent en mémoire dans la page et
peuvent être perdues en la fermant. L’extraction du CV est locale ; l’analyse
transmet les textes et préférences au fournisseur choisi. L’import d’URL contacte
le site public et transmet le texte de l’offre au fournisseur pour le structurer.

Le service est destiné à un seul utilisateur, sur son ordinateur. Ne l’exposez
pas sur Internet. La télémétrie LangSmith est facultative, désactivée par défaut,
et limitée aux informations techniques sans contenu documentaire.

## Dépannage rapide

| Situation                          | Action                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Analyse indisponible               | Vérifier la clé et le modèle dans `.env`, puis redémarrer le serveur.                                     |
| Échec d’enregistrement             | Garder la page ouverte, vérifier l’espace disque et les droits du stockage, puis réessayer explicitement. |
| Texte du CV incorrect              | Corriger le texte extrait ou utiliser un document texte plus simple avant l’analyse.                      |
| Offre non importable               | Coller la description accessible et vérifier manuellement les conditions.                                 |
| Résultat ancien après modification | Enregistrer puis lancer une nouvelle analyse ; l’historique n’est pas réécrit.                            |
| Erreur fournisseur                 | Vérifier l’accès au modèle et les limites du compte ; une nouvelle tentative peut être facturée.          |

Pour signaler un problème sur GitHub, utilisez des exemples fictifs et retirez les
clés, CV, coordonnées et sauvegardes privées.

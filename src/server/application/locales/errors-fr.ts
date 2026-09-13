export const errorMessages = {
  requestConflict: "Cette clé correspond à une autre demande.",
  analysisBusy: "Une analyse est déjà en cours. Attendez sa fin.",
  jobBusy: "Une analyse est déjà en cours. Attendez ou annulez-la.",
  jobIdentityConflict:
    "Cette demande correspond à un autre dossier ou une autre version.",
  incompleteSavedInputs:
    "Enregistrez un profil et une offre complets avant l’analyse.",
  staleCancellation: "Cette annulation concerne une tentative précédente.",
  unsupportedResume:
    "L’état de cette analyse a changé. Actualisez avant de reprendre.",
  modelUnsupported: "Ce modèle n’est pas pris en charge.",
  providerUnconfigured: "Configurez la clé de ce fournisseur dans .env.",
  outcomeCapacity: "Capacité temporairement atteinte. Réessayez plus tard.",
  modelUnconfigured: "Configurez la clé de ce fournisseur dans .env.",
  providerTimeout: "Le fournisseur n’a pas répondu dans le délai imparti.",
  providerFailed:
    "L’appel au fournisseur a échoué. Aucune nouvelle tentative automatique.",
  providerBusy: "Un appel au fournisseur est déjà en cours.",
  invalidModelOutput: "La réponse ne respecte pas le contrat de données.",
  incompleteModelOutput: "La réponse est incomplète. Aucune analyse validée.",
  providerRefusal: "Le fournisseur a refusé cette demande.",
  openaiTimeout: "Le modèle a dépassé le délai de 120 secondes.",
  openaiConnection: "Connexion à OpenAI impossible.",
  openaiQuota: "Limite ou quota OpenAI atteint.",
  openaiFailed: "L’appel au modèle a échoué.",
  openaiUnconfigured: "Le fournisseur IA n’est pas configuré.",
  invalidAnalysisInput: "Documents ou préférences invalides.",
  invalidRequestKey: "Une clé de demande de 16 à 128 caractères est requise.",
  caseFileMissing: "Dossier introuvable.",
  unsavedAnalysisInput: "Enregistrez le dossier avant de lancer l’analyse.",
  staleDeletion: "Le dossier a changé. Rouvrez-le avant de supprimer.",
  invalidHttpInput: "Paramètres invalides. Vérifiez les champs saisis.",
  incompatibleCheckpoint:
    "Cette analyse nécessite une nouvelle demande après la mise à jour.",
  changedCheckpointSteps: "Les étapes ont changé. Lancez une nouvelle analyse.",
  tooManyCriteria:
    "L’offre contient trop de passages. Regroupez les lignes avant de relancer l’analyse.",
  missingCriteria: "Aucun passage à préparer.",
  incompleteCriterionPlan:
    "La préparation des critères a omis un passage. Aucune analyse validée.",
  corruptModelOutput:
    "La réponse contient du texte corrompu. Aucune nouvelle analyse validée ; aucune nouvelle tentative automatique.",
  incompleteExtraction:
    "La réponse du modèle est incomplète. Aucune analyse validée.",
  extractionRefused: "Le modèle a refusé la demande.",
  invalidExtraction: "La réponse ne respecte pas le contrat de données.",
  unsupportedFile: "Formats acceptés : PDF, DOCX et TXT.",
  oversizedFile: "Le fichier dépasse 5 Mo.",
  extractionTimeout:
    "L’extraction a dépassé 15 secondes. Essaie un document plus simple.",
  extractionFailed: "Impossible de lire ce document.",
  extractionInterrupted: "Extraction interrompue.",
  missingFile: "Sélectionne un CV.",
  importBusy: "Un import est déjà en cours.",
  invalidDocuments:
    "Documents ou préférences invalides. Vérifie les champs saisis.",
  unknownRoute: "Route API introuvable.",
  forbiddenMutation: "Requête non autorisée. Utilisez l’interface locale.",
  forbiddenHost: "Utilisez une adresse locale autorisée.",
  missingAddress: "Adresse inaccessible.",
  inaccessibleHtml:
    "La page ne contient pas de HTML accessible. Collez le texte de l’offre.",
  oversizedPage: "La page dépasse la taille autorisée.",
  inaccessiblePage: "La page est inaccessible. Collez le texte de l’offre.",
  tooManyRedirects: "Trop de redirections. Collez le texte de l’offre.",
  pageFetchFailed:
    "Impossible de récupérer la page publique. Collez son texte.",
  ambiguousJobPage:
    "Cette page contient plusieurs offres. Ouvrez le lien d’une offre précise.",
  invalidJobPage:
    "Contenu absent ou trop long. Collez uniquement le texte de l’offre.",
  invalidUrl: "Le lien est invalide.",
  unsupportedUrl:
    "Utilisez un lien HTTP(S) public, sans identifiants ni port personnalisé.",
  privateAddress:
    "Ce lien ne désigne pas une adresse Internet publique autorisée.",
  restoreFailed: "La restauration a échoué. Aucun dossier n’a été modifié.",
  historyTooLarge:
    "Ce dossier dépasse la limite d’export. Sauvegardez SQLite avec l’application arrêtée.",
  backupTooLarge: "Sauvegarde trop volumineuse.",
  campaignMissing: "Campagne introuvable.",
  campaignConflict: "Cette demande correspond à une autre campagne.",
  staleCampaignSource: "Le dossier source a changé. Rouvrez-le.",
  missingSharedDocument:
    "Complétez le document commun avant de créer une campagne.",
  caseFileNotFound: "Dossier introuvable.",
  staleSave: "Le dossier a changé. Rouvrez-le avant d’enregistrer.",
  storageFailed:
    "L’enregistrement local a échoué. Votre saisie est conservée à l’écran.",
  jobMissing: "Analyse introuvable.",
  progressStorageFailed: "Impossible d’enregistrer la progression locale.",
} as const;

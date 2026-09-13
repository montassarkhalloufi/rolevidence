export const runtimeMessages = {
  jobInterrupted:
    "Le serveur a été arrêté. Reprenez explicitement les étapes restantes.",
  jobFailed:
    "L’analyse a été interrompue. Les étapes enregistrées sont conservées.",
  jobCancelled: "Analyse annulée à votre demande.",
  jobStorageInterrupted:
    "L’exécution est arrêtée. Vérifiez le stockage puis reprenez explicitement.",
  uploadInvalid: "Import refusé : un seul fichier de 5 Mo maximum.",
  bodyInvalid: "Corps JSON invalide ou trop volumineux.",
  internalError: "Erreur interne du serveur.",
  invalidPdf: "Le fichier ne correspond pas à un PDF valide.",
  pdfTooLong: "Le CV dépasse la limite de 20 pages.",
  invalidText: "Le fichier TXT doit contenir du texte UTF-8.",
  emptyDocument:
    "Aucun texte extrait. Pour un PDF scanné, utilise une version texte : l’OCR n’est pas disponible.",
  documentTooLong:
    "Le texte dépasse 16 000 caractères. Importe une version plus courte.",
  unsupportedDocument: "Format de document non pris en charge.",
  unreadableDocument:
    "Document illisible ou protégé. Essaie une version PDF texte, DOCX ou TXT valide.",
} as const;

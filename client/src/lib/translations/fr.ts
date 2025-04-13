// 프랑스어 (French)
export const frTranslations = {
  common: {
    title: "mirror.",
    tagline: "Réflexions IA de votre créativité",
    description:
      "Analysez vos photos avec une IA avancée pour recevoir des commentaires détaillés sur la composition, l'éclairage, les aspects techniques et plus encore.",
    startAnalyzing: "Commencer l'analyse",
    startNow: "Commencer maintenant",
    features: "Fonctionnalités",
    howItWorks: "Comment ça marche",
    language: "Langue",
    login: "Se connecter",
    logout: "Se déconnecter",
    saveYourResults: "Connectez-vous pour sauvegarder vos résultats",
    account: "Mon compte",
    score: "Score",
    cancel: "Annuler",
    delete: "Supprimer",
    user: "Utilisateur",
    back: "Retour",
    backToHome: "Retour à l'accueil",
    loginRequired: "Connexion requise",
    pleaseLoginToView: "Veuillez vous connecter pour voir cette page"
  },
  navigation: {
    home: "Accueil",
    myPage: "Ma page",
    myHistory: "Mon historique"
  },
  features: {
    title: "Fonctionnalités",
    aiPowered: {
      title: "Analyse photo par IA",
      description:
        "Obtenez des commentaires de niveau professionnel sur vos photographies grâce à notre système d'analyse IA avancé"
    },
    composition: {
      title: "Composition",
      description:
        "Analyse du cadrage, de la règle des tiers, de l'équilibre, de la symétrie, des lignes directrices et de la structure visuelle globale."
    },
    lighting: {
      title: "Éclairage",
      description:
        "Évaluation de l'exposition, du contraste, des hautes lumières, des ombres et des techniques d'éclairage globales."
    },
    technical: {
      title: "Technique",
      description:
        "Évaluation de la mise au point, de la profondeur de champ, de la netteté, des niveaux de bruit et des réglages de l'appareil."
    },
    categories: {
      title: "Catégories multiples",
      description:
        "Analyse spécialisée pour la photographie de portrait, de paysage, en noir et blanc, d'architecture et macro."
    },
    multilingual: {
      title: "Multilingue",
      description:
        "Prise en charge de 14 langues, notamment l'anglais, le japonais, le coréen, le chinois et les langues européennes."
    },
    feedback: {
      title: "Commentaires pratiques",
      description:
        "Forces spécifiques et suggestions pratiques d'amélioration dans chaque catégorie de photo."
    }
  },
  howItWorks: {
    title: "Comment ça marche",
    subtitle: "Processus simple en trois étapes",
    description:
      "Obtenez une analyse photo experte en quelques minutes grâce à notre flux de travail simplifié",
    step1: {
      title: "1 Téléchargez votre photo",
      description:
        "Téléchargez simplement votre photo depuis votre appareil. Nous prenons en charge divers formats d'image et les optimisons automatiquement."
    },
    step2: {
      title: "2 Choisissez les options d'analyse",
      description:
        "Sélectionnez votre style de critique préféré, la profondeur d'analyse, la catégorie de photographie et la langue pour des résultats personnalisés."
    },
    step3: {
      title: "3 Obtenez des commentaires détaillés",
      description:
        "Recevez une analyse complète avec des scores et des suggestions pratiques pour améliorer vos compétences en photographie."
    }
  },
  cta: {
    title: "Prêt à améliorer votre photographie ?",
    description:
      "Obtenez des commentaires détaillés par IA sur vos photos et faites passer vos compétences au niveau supérieur.",
    button: "Commencer maintenant"
  },
  upload: {
    title: "Télécharger votre photo",
    dragDrop: "Glissez et déposez votre photo ici",
    or: "ou",
    browse: "Parcourir les fichiers",
    supportedFormats: "Formats pris en charge : JPG, PNG 25MB",
    preview: "Aperçu",
    changePhoto: "Changer de photo",
    continue: "Continuer vers les options",
    uploading: "Téléchargement...",
    selectPhoto: "Sélectionner une photo",
    errors: {
      invalidType: "Type de fichier invalide",
      mustBeImage: "Le fichier doit être une image JPG ou PNG",
      fileTooLarge: "Fichier trop volumineux",
      maxSize: "La taille maximale du fichier est de 25MB",
      uploadFailed: "Échec du téléchargement",
      tryAgain: "Veuillez réessayer plus tard"
    },
    warnings: {
      exifDataIssue: "Problème de données EXIF",
      limitedExifData:
        "Certaines données EXIF n'ont pas pu être traitées. Des informations limitées sur l'appareil photo peuvent être disponibles."
    }
  },
  options: {
    title: "Choisir les options d'analyse",
    subtitle: "Personnalisez votre analyse",
    description: "Choisissez comment vous souhaitez que votre photographie soit analysée. Chaque option affectera l'orientation et le ton des commentaires.",
    photoToAnalyze: "Photo à analyser",
    loading: "Chargement...",
    focusPoint: {
      title: "Orientation de l'analyse",
      description: "Cette option détermine l'orientation de l'analyse photo. Vous pouvez choisir de mettre l'accent sur les aspects techniques ou les éléments artistiques.",
      balanced: "Équilibrée",
      technical: "Orientation technique",
      artistic: "Orientation artistique",
      originality: "Orientation originalité",
      genre: "Spécifique au genre"
    },
    persona: {
      title: "Style de critique",
      description: "Détermine le ton et le style des commentaires. Choisissez entre des conseils bienveillants et une critique stricte.",
      kindTeacher: "Enseignant bienveillant",
      strictProfessor: "Professeur strict",
      harshCritic: "Critique sévère",
      emotionalWriter: "Écrivain émotionnel",
      bigFan: "Votre plus grand fan"
    },
    detail: {
      title: "Niveau de détail",
      simple: "Simple (Résumé)",
      balanced: "Équilibré (Résumé + Commentaires)",
      detailed: "Détaillé (Analyse complète)",
      alwaysDetailed: "Utilisation systématique de l'analyse détaillée pour de meilleurs résultats"
    },
    language: {
      title: "Langue",
      feedbackOnly: "Cela n'affecte que la langue des résultats d'analyse de votre photo",
      uiSeparate: "pas la langue de l'interface.",
      supportedCount: "Nous prenons en charge 14 langues pour les commentaires d'analyse.",
      selectLabel: "Sélectionner la langue d'analyse",
      en: "Anglais (English)",
      ko: "Coréen (한국어)",
      ja: "Japonais (日本語)",
      zh_CN: "Chinois simplifié (简体中文)",
      zh_TW: "Chinois traditionnel (繁體中文)",
      fr: "Français",
      es: "Espagnol (Español)",
      de: "Allemand (Deutsch)",
      nl: "Néerlandais (Nederlands)",
      it: "Italien (Italiano)",
      pt: "Portugais (Português)",
      vi: "Vietnamien (Tiếng Việt)",
      th: "Thaï (ภาษาไทย)",
      id: "Indonésien (Bahasa Indonesia)"
    },
    analyze: "Analyser la photo",
    submitting: "Soumission...",
    errors: {
      noPhoto: "Aucune photo trouvée",
      pleaseUpload: "Veuillez d'abord télécharger une photo",
      invalidData: "Format de données invalide",
      submissionFailed: "Échec de la soumission",
      tryAgain: "Veuillez réessayer plus tard"
    }
  },
  loading: {
    analyzing: "Analyse de votre photo avec IA...",
    patience: "Cela peut prendre un moment",
    processing: "Traitement de votre photo",
    step1: "Analyse de la composition et des éléments techniques...",
    step2: "Évaluation des qualités artistiques...",
    step3: "Génération de commentaires détaillés...",
    step4: "Finalisation des résultats...",
    analysisInProgress: "Analyse en cours",
    waitingForResults: "Votre analyse est déjà en cours de traitement. Veuillez patienter pendant que nous vérifions les résultats.",
    errors: {
      missingData: "Données requises manquantes",
      pleaseUpload: "Veuillez recommencer en téléchargeant une photo",
      invalidData: "Format de données invalide",
      analysisFailed: "Échec de l'analyse",
      tryAgain: "Veuillez réessayer plus tard",
      tryAgainLater: "Veuillez réessayer dans quelques minutes",
      timeout: "Délai d'analyse dépassé",
      alreadyProcessing: "L'analyse est déjà en cours"
    }
  },
  results: {
    loading: "Chargement des résultats...",
    score: "Score",
    exifInfo: "Infos appareil",
    noExifData: "Aucune information sur l'appareil disponible",
    noDataAvailable: "Aucune donnée disponible pour cette section",
    noAnalysisText: "Aucun texte d'analyse disponible",
    detectedGenre: "Genre",
    unknownGenre: "Inconnu",
    genreSpecific: "Conseils de photographie {{genre}}",
    photographyTips: "Conseils photo",
    aspectRatio: "Ratio d'image",
    portrait: "Portrait (4:5)",
    square: "Carré (1:1)",
    landscape: "Paysage (3:2)",
    scrollForMore: "Faites défiler pour plus",
    categories: {
      title: "Scores par catégorie",
      composition: "Composition",
      lighting: "Éclairage",
      color: "Couleur",
      focus: "Mise au point",
      creativity: "Créativité"
    },
    overall: "Évaluation globale",
    strengths: "Points forts",
    improvements: "Points à améliorer",
    strength: "Force",
    improvement: "Point d'amélioration",
    modifications: "Modifications suggérées",
    composition: "Composition",
    lighting: "Éclairage et exposition",
    color: "Couleur et ton",
    focus: "Mise au point et clarté",
    creativity: "Histoire et originalité",
    assessment: "Évaluation",
    suggestions: "Suggestions",
    share: "Partager le résultat",
    shareCopy: "Ma photo a obtenu un score de {{score}} sur mirror !",
    copied: "Copié !",
    linkCopied: "Lien copié dans le presse-papiers",
    analyzeAnother: "Analyser une autre photo",
    goToUpload: "Télécharger une photo",
    errors: {
      missingData: "Données de résultat manquantes",
      pleaseUpload: "Veuillez recommencer en téléchargeant une photo",
      invalidData: "Format de données invalide",
      fetchFailed: "Échec de récupération de l'analyse",
      shareFailed: "Échec du partage",
      tryAgain: "Veuillez réessayer plus tard"
    }
  },
  footer: {
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité",
    contact: "Contact",
    allRightsReserved: "Tous droits réservés."
  },
  myPage: {
    myAccount: "Mon compte",
    myPhotos: "Mes photos",
    myAnalyses: "Mes analyses",
    favorites: "Favoris",
    stats: "Statistiques",
    collections: "Collections",
    settings: "Paramètres",
    newAnalysis: "Nouvelle analyse",
    recentAnalyses: "Analyses récentes",
    totalAnalyses: "Total des analyses",
    averageScore: "Score moyen",
    bestCategory: "Meilleure catégorie",
    forImprovement: "À améliorer",
    sortBy: "Trier par",
    sortByDate: "Plus récent",
    sortByScore: "Score le plus élevé",
    editVisibility: "Modifier la visibilité",
    doneEditing: "Terminer l'édition",
    editProfile: "Modifier le profil",
    shareProfile: "Partager le profil",
    profileShared: "Lien du profil copié",
    noPhotosYet: "Vous n'avez pas encore analysé de photos.",
    startNewAnalysis: "Commencer une nouvelle analyse",
    analyzeFirst: "Analyser votre première photo",
    noFavoritesYet: "Vous n'avez pas encore enregistré de favoris.",
    browsePhotos: "Parcourir les photos",
    makePublic: "Rendre public",
    makePrivate: "Rendre privé",
    delete: "Supprimer",
    hide: "Masquer",
    show: "Afficher",
    confirmDelete: "Confirmer la suppression",
    confirmDeleteDescription: "Êtes-vous sûr de vouloir supprimer cette analyse ? Cette action ne peut pas être annulée.",
    confirmHide: "Confirmer le masquage",
    confirmHideDescription: "Êtes-vous sûr de vouloir masquer cette photo ? Elle n'apparaîtra pas dans votre galerie.",
    confirmShow: "Confirmer l'affichage",
    confirmShowDescription: "Êtes-vous sûr de vouloir afficher à nouveau cette photo ? Elle apparaîtra dans votre galerie.",
    permanentHideWarning: "Cette action est essentiellement identique à la suppression et ne peut pas être récupérée ultérieurement.",
    photoHidden: "Photo masquée",
    photoHiddenDescription: "Cette photo est maintenant masquée de votre galerie.",
    photoVisible: "Photo visible",
    photoVisibleDescription: "Cette photo est maintenant visible dans votre galerie.",
    madePublic: "Analyse rendue publique",
    madePrivate: "Analyse rendue privée",
    othersCanView: "Les autres peuvent maintenant voir cette analyse avec le lien partagé.",
    onlyYouCanView: "Seul vous pouvez maintenant voir cette analyse.",
    analysisDeleted: "Analyse supprimée",
    analysisDeletedSuccess: "L'analyse a été supprimée avec succès.",
    joined: "Inscrit le",
    untitledPhoto: "Photo sans titre",
    showDetails: "Afficher les détails",
    hideDetails: "Masquer les détails",
    moreItems: "éléments supplémentaires",
    analysisInProgress: "Traitement de l'analyse terminé",
    checkLatestAnalysis: "Votre analyse précédemment demandée a été traitée. Consultez vos derniers résultats d'analyse.",
    errors: {
      loadingFailed: "Échec du chargement des photos",
      tryRefreshing: "Veuillez essayer de rafraîchir la page",
      updateFailed: "Échec de la mise à jour de la visibilité",
      deleteFailed: "Échec de la suppression de l'analyse",
      tryAgain: "Veuillez réessayer"
    }
  },
  profileEdit: {
    title: "Modifier le profil",
    save: "Enregistrer",
    cancel: "Annuler",
    displayName: "Nom d'affichage",
    displayNamePlaceholder: "Entrez votre nom d'affichage",
    bio: "Bio",
    bioPlaceholder: "Entrez une courte bio (max 50 caractères)",
    bioCount: "{{current}}/50",
    socialLinks: "Réseaux sociaux",
    socialLinksDescription: "Ajoutez des liens vers les réseaux sociaux à afficher sur votre profil",
    linkPlaceholder: "Entrez l'URL",
    addCustomLink: "Ajouter un lien personnalisé",
    customLinkLabel: "Nom du lien",
    customLinkLabelPlaceholder: "Entrez le nom du lien",
    customLinkUrl: "URL",
    customLinkUrlPlaceholder: "https://...",
    addLink: "Ajouter",
    profileImage: "Image de profil",
    changeImage: "Changer l'image",
    removeImage: "Supprimer l'image",
    uploadImage: "Télécharger une image",
    errors: {
      bioTooLong: "La bio doit comporter 50 caractères ou moins",
      invalidUrl: "Veuillez entrer une URL valide",
      updateFailed: "Échec de la mise à jour du profil",
      imageTooLarge: "La taille de l'image doit être de 2 Mo ou moins",
      invalidImageType: "Seuls les formats JPG, PNG et GIF sont pris en charge"
    }
  },
  profile: {
    share: "Partager le profil",
    userProfile: "Profil utilisateur",
    publicPhotos: "Photos publiques",
    noPublicPhotos: "Cet utilisateur n'a pas encore partagé de photos.",
    invalidUser: "Utilisateur invalide",
    userNotFound: "Utilisateur non trouvé",
    loadFailed: "Échec du chargement du profil",
    tryAgain: "Veuillez réessayer plus tard",
    updateSuccess: "Profil mis à jour",
    profileUpdated: "Votre profil a été mis à jour avec succès",
    updateFailed: "Échec de la mise à jour du profil",
    enterName: "Entrez votre nom"
  }
};
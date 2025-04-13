import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 성능 최적화: 기본 언어(영어)만 즉시 로드하고 다른 언어는 필요할 때만 로드
// 영어 이외의 언어 번역은 LazyLoad 방식으로 나중에 로드

// English translations (base)
// 영어 (English)
export const enTranslations = {
  analysis: {
    byCharacter: "Character Evaluation",
    overall: {
      title: "Overall Evaluation"
    },
    strengths: "Strengths",
    improvements: "Improvements",
    noStrengths: "No strengths to display.",
    noImprovements: "No improvements to display.",
    modifications: "Suggested Modifications",
    suggestions: "Suggestions",
    categories: {
      composition: "Composition",
      lighting: "Lighting",
      color: "Color",
      focus: "Focus",
      creativity: "Creativity",
      genreSpecific: "Genre Specific Tips"
    },
    newAnalysis: "New Analysis",
    uploadNew: "Upload New Photo",
    analyzeAgain: "Analyze Again",
    analyzeNewPhoto: "Analyze Another Photo",
    leaveFeedback: "Leave Feedback"
  },
  opinions: {
    title: "Feedback on Analysis Result",
    description: "Let us know if the analysis was helpful. Your feedback will be used to improve our service.",
    helpful: "It was helpful",
    notHelpful: "It wasn't helpful",
    commentLabel: "Comment (optional)",
    commentPlaceholder: "Feel free to write your feedback about the analysis result.",
    thankYou: "Feedback Submitted",
    submitted: "Thank you for your valuable feedback.",
    errorTitle: "Error Occurred",
    submitFailed: "An error occurred while submitting your feedback. Please try again."
  },
  share: {
    success: "Share Successful",
    successDesc: "Link has been shared successfully",
    error: "Share Failed",
    errorDesc: "Failed to share link",
    copied: "Copied",
    copiedDesc: "Link copied to clipboard"
  },
  save: {
    success: "Save Successful",
    successDesc: "Image has been saved",
    error: "Save Failed",
    errorDesc: "Failed to save image"
  },
  common: {
    title: "mirror.",
    tagline: "AI reflections of your creativity",
    description:
      "Analyze your photos with advanced AI to receive detailed feedback on composition, lighting, technical aspects, and more.",
    startAnalyzing: "Start Analyzing",
    startNow: "Start Now",
    features: "Features",
    howItWorks: "How It Works",
    language: "Language",
    login: "Sign in",
    logout: "Sign out",
    saveYourResults: "Sign in to save your results",
    account: "My Account",
    score: "Score",
    cancel: "Cancel",
    delete: "Delete",
    user: "User",
    back: "Back",
    backToHome: "Back to Home",
    loginRequired: "Login Required",
    pleaseLoginToView: "Please log in to view this page",
  },
  navigation: {
    home: "Home",
    myPage: "My Page",
    myHistory: "My History",
  },
  features: {
    title: "Features",
    aiPowered: {
      title: "AI-Powered Photo Analysis",
      description:
        "Get professional-level feedback on your photographs with our advanced AI analysis system",
    },
    composition: {
      title: "Composition",
      description:
        "Analyze framing, rule of thirds, balance, symmetry, leading lines, and overall visual structure.",
    },
    lighting: {
      title: "Lighting",
      description:
        "Evaluate exposure, contrast, highlights, shadows, and overall lighting techniques.",
    },
    technical: {
      title: "Technical",
      description:
        "Assess focus, depth of field, sharpness, noise levels, and camera settings.",
    },
    categories: {
      title: "Multiple Categories",
      description:
        "Specialized analysis for portrait, landscape, black & white, architectural and macro photography.",
    },
    multilingual: {
      title: "Multilingual",
      description:
        "Support for 14 languages including English, Japanese, Korean, Chinese, and European languages.",
    },
    feedback: {
      title: "Actionable Feedback",
      description:
        "Specific strengths and practical suggestions for improvement in each photo category.",
    },
  },
  howItWorks: {
    title: "How It Works",
    subtitle: "Simple Three-Step Process",
    description:
      "Get expert photo analysis in minutes with our streamlined workflow",
    step1: {
      title: "1 Upload Your Photo",
      description:
        "Simply upload your photo from your device. We support various image formats and optimize them automatically.",
    },
    step2: {
      title: "2 Choose Analysis Options",
      description:
        "Select your preferred critique style, analysis depth, photography category, and language for personalized results.",
    },
    step3: {
      title: "3 Get Detailed Feedback",
      description:
        "Receive comprehensive analysis with scores and actionable suggestions to elevate your photography skills.",
    },
  },
  cta: {
    title: "Ready to improve your photography?",
    description:
      "Get detailed AI-powered feedback on your photos and take your skills to the next level.",
    button: "Start Now",
  },
  upload: {
    title: "Upload Your Photo",
    dragDrop: "Drag and drop your photo here",
    or: "or",
    browse: "Browse files",
    supportedFormats: "Supported formats: JPG, PNG 25MB",
    preview: "Preview",
    changePhoto: "Change photo",
    continue: "Continue to Options",
    uploading: "Uploading...",
    selectPhoto: "Select photo",
    errors: {
      invalidType: "Invalid file type",
      mustBeImage: "File must be a JPG or PNG image",
      fileTooLarge: "File too large",
      maxSize: "Maximum file size is 25MB",
      uploadFailed: "Upload failed",
      tryAgain: "Please try again later",
    },
    warnings: {
      exifDataIssue: "EXIF data issue",
      limitedExifData:
        "Some EXIF data could not be processed. Limited camera information may be available.",
    },
  },
  options: {
    title: "Pick a Persona",
    subtitle: "Your photo. Their perspective.",
    description:
      "Choose how you would like your photograph to be analyzed. Each option will affect the focus and tone of the feedback.",
    photoToAnalyze: "Photo to analyze",
    loading: "Loading...",
    focusPoint: {
      title: "Analysis Focus",
      description:
        "This option determines the focus area of photo analysis. You can choose to emphasize technical aspects or artistic elements.",
      balanced: "Balanced",
      technical: "Technical Focus",
      artistic: "Artistic Focus",
      originality: "Originality Focus",
      genre: "Genre Specific",
    },
    persona: {
      title: "Critique Style",
      description:
        "Determines the tone and style of feedback. Choose from gentle advice to strict critique.",
      kindTeacher: "Kind Teacher",
      strictProfessor: "Strict Professor",
      harshCritic: "Harsh Critic",
      emotionalWriter: "Emotional Writer",
      bigFan: "Your Biggest Fan",
    },
    detail: {
      title: "Detail Level",
      simple: "Simple (Summary)",
      balanced: "Balanced (Summary + Feedback)",
      detailed: "Detailed (Full Analysis)",
      alwaysDetailed: "Always using detailed analysis for best results",
    },
    language: {
      title: "Language",
      feedbackOnly:
        "This only affects the language of your photo analysis results",
      uiSeparate: "not the interface language.",
      supportedCount: "We support 14 languages for analysis feedback.",
      selectLabel: "Select analysis language",
      en: "English",
      ko: "한국어",
      ja: "日本語",
      zh_CN: "简体中文",
      zh_TW: "繁體中文",
      fr: "Français",
      es: "Español",
      de: "Deutsch",
      nl: "Nederlands",
      it: "Italiano",
      pt: "Português",
      vi: "Tiếng Việt",
      th: "ภาษาไทย",
      id: "Bahasa Indonesia",
    },
    analyze: "Analyze Photo",
    submitting: "Submitting...",
    errors: {
      noPhoto: "No photo found",
      pleaseUpload: "Please upload a photo first",
      invalidData: "Invalid data format",
      submissionFailed: "Submission failed",
      tryAgain: "Please try again later",
      cannotAnalyze: "Cannot analyze this image",
      notRealPhoto: "This image is not a real photograph or is a famous artwork. Please upload a different photo.",
    },
  },
  loading: {
    analyzing: "Analyzing your photo with AI...",
    patience: "This may take a moment",
    processing: "Processing your photo",
    step1: "Analyzing composition and technical elements...",
    step2: "Evaluating artistic qualities...",
    step3: "Generating detailed feedback...",
    step4: "Finalizing results...",
    analysisInProgress: "Analysis in progress",
    waitingForResults:
      "Your analysis is already being processed. Please wait while we check for the results.",
    errors: {
      missingData: "Missing required data",
      pleaseUpload: "Please start over by uploading a photo",
      invalidData: "Invalid data format",
      analysisFailed: "Analysis failed",
      tryAgain: "Please try again later",
      tryAgainLater: "Please try again in a few minutes",
      timeout: "Analysis time out",
      alreadyProcessing: "Analysis is already in progress",
    },
  },
  results: {
    loading: "Loading results...",
    score: "Score",
    exifInfo: "Camera Info",
    noExifData: "No camera info available",
    noDataAvailable: "No data available for this section",
    noAnalysisText: "No analysis text available",
    detectedGenre: "Genre",
    unknownGenre: "Unknown",
    genreSpecific: "{{genre}} Photography Tips",
    photographyTips: "Photography Tips",
    aspectRatio: "Image Ratio",
    portrait: "Portrait (4:5)",
    square: "Square (1:1)",
    landscape: "Landscape (3:2)",
    scrollForMore: "Scroll for more",
    categories: {
      title: "Category Scores",
      composition: "Composition",
      lighting: "Lighting",
      color: "Color",
      focus: "Focus",
      creativity: "Creativity",
    },
    overall: "Overall Assessment",
    strengths: "Strengths",
    improvements: "Areas for Improvement",
    strength: "Strength",
    improvement: "Improvement",
    modifications: "Suggested Modifications",
    composition: "Composition",
    lighting: "Lighting and Exposure",
    color: "Color and Tone",
    focus: "Focus and Clarity",
    creativity: "Story and Originality",
    assessment: "Assessment",
    suggestions: "Suggestions",
    share: "Share Result",
    shareCopy: "My photo scored {{score}} on mirror!",
    copied: "Copied!",
    linkCopied: "Link copied to clipboard",
    analyzeAnother: "Analyze Another Photo",
    goToUpload: "Upload a Photo",
    errors: {
      missingData: "Missing result data",
      pleaseUpload: "Please start over by uploading a photo",
      invalidData: "Invalid data format",
      fetchFailed: "Failed to fetch analysis",
      shareFailed: "Failed to share",
      tryAgain: "Please try again later",
    },
  },
  footer: {
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    contact: "Contact",
    allRightsReserved: "All rights reserved.",
  },
  myPage: {
    myAccount: "My Account",
    myPhotos: "My Photos",
    myAnalyses: "My Analyses",
    favorites: "Favorites",
    stats: "Stats",
    collections: "Collections",
    settings: "Settings",
    newAnalysis: "New Analysis",
    recentAnalyses: "Recent Analyses",
    totalAnalyses: "Total Analyses",
    averageScore: "Average Score",
    bestCategory: "Best Category",
    forImprovement: "For Improvement",
    sortBy: "Sort by",
    sortByDate: "Most recent",
    sortByScore: "Highest score",
    editVisibility: "Edit Visibility",
    doneEditing: "Done Editing",
    editProfile: "Edit Profile",
    shareProfile: "Share Profile",
    profileShared: "Profile link copied",
    noPhotosYet: "You haven't analyzed any photos yet.",
    startNewAnalysis: "Start New Analysis",
    analyzeFirst: "Analyze Your First Photo",
    noFavoritesYet: "You haven't saved any favorites yet.",
    browsePhotos: "Browse Photos",
    makePublic: "Make Public",
    makePrivate: "Make Private",
    delete: "Delete",
    hide: "Hide",
    show: "Show",
    confirmDelete: "Confirm Deletion",
    confirmDeleteDescription:
      "Are you sure you want to delete this analysis? This action cannot be undone.",
    confirmHide: "Confirm Hide",
    confirmHideDescription:
      "Are you sure you want to hide this photo? It will not appear in your gallery.",
    confirmShow: "Confirm Show",
    confirmShowDescription:
      "Are you sure you want to show this photo again? It will appear in your gallery.",
    permanentHideWarning:
      "This action is essentially the same as deletion and cannot be recovered later.",
    photoHidden: "Photo Hidden",
    photoHiddenDescription: "This photo is now hidden from your gallery.",
    photoVisible: "Photo Visible",
    photoVisibleDescription: "This photo is now visible in your gallery.",
    madePublic: "Analysis made public",
    madePrivate: "Analysis made private",
    othersCanView: "Others can now view this analysis with the shared link.",
    onlyYouCanView: "Only you can now view this analysis.",
    analysisDeleted: "Analysis deleted",
    analysisDeletedSuccess: "The analysis has been successfully deleted.",
    joined: "Joined",
    untitledPhoto: "Untitled Photo",
    showDetails: "Show details",
    hideDetails: "Hide details",
    moreItems: "more items",
    analysisInProgress: "Analysis Processing Complete",
    checkLatestAnalysis:
      "Your previously requested analysis has been processed. Check your latest analysis results.",
    errors: {
      loadingFailed: "Failed to load photos",
      tryRefreshing: "Please try refreshing the page",
      updateFailed: "Failed to update visibility",
      deleteFailed: "Failed to delete analysis",
      tryAgain: "Please try again",
    },
  },
  profileEdit: {
    title: "Edit Profile",
    save: "Save",
    cancel: "Cancel",
    displayName: "Display Name",
    displayNamePlaceholder: "Enter your display name",
    bio: "Bio",
    bioPlaceholder: "Enter a short bio (max 50 characters)",
    bioCount: "{{current}}/50",
    socialLinks: "Social Media",
    socialLinksDescription: "Add social media links to display on your profile",
    linkPlaceholder: "Enter URL",
    addCustomLink: "Add Custom Link",
    customLinkLabel: "Link Name",
    customLinkLabelPlaceholder: "Enter link name",
    customLinkUrl: "URL",
    customLinkUrlPlaceholder: "https://...",
    addLink: "Add",
    profileImage: "Profile Image",
    changeImage: "Change Image",
    removeImage: "Remove Image",
    uploadImage: "Upload Image",
    errors: {
      bioTooLong: "Bio must be 50 characters or less",
      invalidUrl: "Please enter a valid URL",
      updateFailed: "Failed to update profile",
      imageTooLarge: "Image size must be 2MB or less",
      invalidImageType: "Only JPG, PNG, and GIF formats are supported",
    },
  },
  profile: {
    share: "Share Profile",
    userProfile: "User Profile",
    publicPhotos: "Public Photos",
    noPublicPhotos: "This user hasn't shared any photos yet.",
    invalidUser: "Invalid User",
    userNotFound: "User not found",
    loadFailed: "Failed to load profile",
    tryAgain: "Please try again later",
    updateSuccess: "Profile Updated",
    profileUpdated: "Your profile has been successfully updated",
    updateFailed: "Failed to update profile",
    enterName: "Enter your name",
  },
  photos: {
    noCameraPhotos: "No photos found with camera: {{camera}}",
    cameraFilterTitle: "Photos with: {{camera}}",
    cameraFilterDescription: "{{count}} photos found",
    loading: "Loading photos...",
  },
};

// See separate translation files for Korean, Japanese, Chinese, etc.

// Japanese, Chinese, and other translations would be added here

// 언어 변경 시 해당 언어 리소스를 동적으로 로드하는 함수
const loadLanguageAsync = async (language: string) => {
  // 이미 로드된 언어면 다시 로드하지 않음
  if (i18n.hasResourceBundle(language, "translation")) {
    console.log(`Language ${language} already loaded, using cached version`);
    return Promise.resolve();
  }

  try {
    // 영어는 이미 로드되어 있으므로 스킵
    if (language === "en") return Promise.resolve();

    console.log(`Loading language: ${language}`);
    
    // 언어별 동적 import (코드 스플리팅)
    let translations;
    try {
      switch (language) {
        case "ko":
          const { koTranslations } = await import("./translations/ko");
          translations = koTranslations;
          break;
        case "ja":
          const { jaTranslations } = await import("./translations/ja");
          translations = jaTranslations;
          break;
        case "zh_CN":
          const { zhTranslations } = await import("./translations/zh");
          translations = zhTranslations;
          break;
        case "zh_TW":
          const { zhTWTranslations } = await import("./translations/tw");
          translations = zhTWTranslations;
          break;
        case "fr":
          const { frTranslations } = await import("./translations/fr");
          translations = frTranslations;
          break;
        case "de":
          const { deTranslations } = await import("./translations/de");
          translations = deTranslations;
          break;
        case "es":
          const { esTranslations } = await import("./translations/es");
          translations = esTranslations;
          break;
        case "it":
          const { itTranslations } = await import("./translations/it");
          translations = itTranslations;
          break;
        case "nl":
          const { nlTranslations } = await import("./translations/nl");
          translations = nlTranslations;
          break;
        case "pt":
          const { ptTranslations } = await import("./translations/pt");
          translations = ptTranslations;
          break;
        case "vi":
          const { viTranslations } = await import("./translations/vi");
          translations = viTranslations;
          break;
        case "th":
          const { thTranslations } = await import("./translations/th");
          translations = thTranslations;
          break;
        case "id":
          const { idTranslations } = await import("./translations/id");
          translations = idTranslations;
          break;
        default:
          console.warn(`No translation file defined for language: ${language}`);
          return Promise.resolve();
      }

      // 로딩된 번역이 유효한지 확인
      if (!translations || typeof translations !== 'object') {
        throw new Error(`Invalid translations format for ${language}: ${typeof translations}`);
      }

      console.log(`Successfully loaded language: ${language}`);
      
      // 번역 리소스 추가
      i18n.addResourceBundle(language, "translation", translations);
      return Promise.resolve();
    } catch (importError) {
      console.error(`Failed to import language file for ${language}:`, importError);
      
      // 영어로 폴백하고 오류를 전파하여 UI에서 처리할 수 있게 함
      if (language !== 'en') {
        console.warn(`Falling back to English due to error loading ${language}`);
        i18n.changeLanguage('en');
      }
      
      throw importError;
    }
  } catch (error) {
    console.error(`Critical error loading language: ${language}`, error);
    return Promise.reject(error);
  }
};

// i18n 초기화 - 최초에는 영어만 로드
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
    },
    fallbackLng: "en",
    debug: false, // 디버그 모드 비활성화로 로깅 최소화
    interpolation: {
      escapeValue: false,
    },
    // 초기화 최적화 설정
    initImmediate: true, // 비동기 초기화 활성화
    load: "languageOnly", // 언어 코드만 사용 (국가 코드 없이)
    ns: ["translation"], // 필요한 네임스페이스만 지정
    defaultNS: "translation",
    keySeparator: ".", // 키 구분자 명시적 지정
    nsSeparator: ":", // 네임스페이스 구분자 명시적 지정
  });

// 언어 변경 이벤트 리스너 추가 - 언어 변경 시 해당 리소스 동적 로드
i18n.on("languageChanged", (lng) => {
  console.log(`Language changed event triggered: ${lng}`);
  loadLanguageAsync(lng).catch((error) => {
    console.error(`Failed to load language ${lng}:`, error);
    // 오류 발생 시 영어로 폴백 (루프 방지를 위해 현재 언어가 이미 영어가 아닌 경우에만)
    if (lng !== 'en') {
      console.warn(`Falling back to English due to error loading ${lng}`);
      setTimeout(() => {
        i18n.changeLanguage('en');
      }, 0);
    }
  });
});

export default i18n;

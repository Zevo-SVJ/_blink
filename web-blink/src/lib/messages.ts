/**
 * Blink — every user-facing string, in both languages.
 *
 * ## Shape
 *
 * `MESSAGES.en` is the source of truth and `Messages` is derived from it, so
 * adding a key to English and forgetting the French translation is a *type
 * error*, not a page that silently falls back to English in production.
 *
 * ## What lives here, and what doesn't
 *
 * Chrome, marketing copy, form labels, errors — anything short. The long-form
 * legal prose lives in `legal-content.tsx` instead: privacy and terms text is
 * structured (headings, lists, links) and translating it as flat strings would
 * mean either losing the structure or embedding markup in a dictionary.
 *
 * ## Translation standard
 *
 * The French is written, not converted. "See yourself the way others see you"
 * is not "Voyez-vous de la façon dont les autres vous voient" — that is the
 * shape of an English sentence wearing French words. Register matters too:
 * Blink's audience is young and the app addresses them as *tu*, consistently,
 * everywhere except the legal pages, where *vous* is the register the content
 * actually calls for.
 */

const en = {
  common: {
    back: "Back",
    backToBlink: "Back to Blink",
    close: "Close",
    cancel: "Cancel",
    email: "Email",
    loading: "Loading…",
    language: "Language",
    languageEnglish: "English",
    languageFrench: "Français",
    switchToFrench: "Passer en français",
    switchToEnglish: "Switch to English",
  },

  nav: {
    howItWorks: "How it works",
    leaderboard: "Leaderboard",
    reviews: "Reviews",
    faq: "FAQ",
    openBlink: "Open Blink",
    logIn: "Log in",
    logOut: "Log out",
    analyzeProfile: "Analyze a profile",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    library: "Library",
    profile: "Profile",
    settings: "Settings",
    ranks: "Ranks",
    welcomeBack: "Welcome back",
    signInToOpen: "Sign in to open your Blink.",
  },

  brand: {
    tagline: "See yourself the way others see you.",
    cta: "See my first impression",
  },

  hero: {
    headlineStart: "See yourself the way",
    headlineAccent: "others see you.",
    subtitle:
    "Blink analyzes your Instagram presence and reveals the first impression you make.",
    // Each chip is a factual claim, so each one is checked against the
    // implementation. See the privacy note in `Hero`.
    trustFree: "Free to try",
    trustNoLogin: "No Instagram login",
    trustNotKept: "Screenshot not kept",
    readsAs: "Reads as",
    lensCrush: "your crush sees you",
    lensStranger: "a stranger sees you",
    lensFriends: "your friends see you",
    lensRecruiter: "a recruiter sees you",
    lensPrefix: "How",
  },

  howItWorks: {
    eyebrow: "How it works",
    heading: "One screenshot becomes a perception.",
    subtitle:
    "Blink reads your profile the way a person would, then shows you what each kind of person walks away with.",
    cta: "See mine",
    stepScreenshot: "Your screenshot",
    stepReads: "Blink reads it",
    stepPerceptions: "Six perceptions",
    /** The demo cards. Sample output, so it is labelled as such. */
    sample: "Example result",
    signals: {
      visualIdentity: "Visual identity",
      aesthetic: "Aesthetic",
      confidence: "Confidence",
    },
  },

  /**
  * The six sample perceptions shown in the How-it-works demo. Structure
  * (ids, tone, layout slots) lives in `blink-data`; only the words are here.
  */
  perceptions: {
    crush: {
      title: "How your crush sees you",
      quote: "They look intentional. Not trying too hard, but definitely not trying nothing.",
      tags: ["Confident", "Mysterious", "High-status"],
    },
    stranger: {
      title: "How a stranger sees you",
      quote: "In 3 seconds you look like someone who has their life together. That's rare.",
      tags: ["Curious", "Trustworthy", "Polished"],
    },
    friends: {
      title: "How your friends see you",
      quote: "Same person, but online they look way more put-together than they admit.",
      tags: ["Loyal", "Funny", "Low-key"],
    },
    recruiter: {
      title: "How a recruiter sees you",
      quote: "Professional without being boring. This profile signals attention to detail.",
      tags: ["Competent", "Clear", "Credible"],
    },
    "green-flag": {
      title: "Your biggest green flag",
      quote: "Nothing here screams desperate. That's a green flag in 2026.",
      tags: ["Secure", "Authentic", "Balanced"],
    },
    "red-flag": {
      title: "Your biggest red flag",
      quote: "Everything is almost too polished. Some people read that as 'hard to read'.",
      tags: ["Distant", "Elusive", "Curated"],
    },
  },

  leaderboardSection: {
    eyebrow: "Where it goes",
    heading: "There's a leaderboard.",
    subtitle:
    "It measures how well a profile reads — so a small account can sit above a famous one.",
    cta: "See where I'd rank",
    captionBoard: "Ranked on how a profile reads. Not on followers.",
    captionClimb: "Improve something real, and you move.",
    captionCategories: "You're ranked inside a category, too.",
    captionLarp: "Larp — one of Blink's categories.",
    captionBadges: "Rank high enough and it becomes status.",
    illustrative: "Illustration — not live standings",
  },

  testimonials: {
    eyebrow: "Reactions",
    heading: "People can't stop comparing scores.",
    // The cards are written examples, not collected reviews. Saying so is
    // both the honest description and what consumer law requires of a
    // testimonial wall that has not been verified.
    subtitle:
    "Written examples of the kind of reaction Blink gets — illustrations, not verified customer reviews.",
    badge: "Example",
    footer: "Find out what your Instagram says about you",
    cta: "See my first impression",
  },

  faq: {
    heading: "Questions",
    items: {
      whatIsBlink: {
        q: "What is Blink?",
        a: "Blink reads your Instagram profile the way a person would and tells you the first impression it actually makes — to a stranger, a crush, a recruiter, your friends.",
      },
      howAnalyze: {
        q: "How does Blink analyze my profile?",
        a: "You upload a screenshot of your profile. An AI vision model looks at what anyone visiting would see — profile picture, name, bio, and the pattern of your grid — and interprets those signals together, not as a checklist.",
      },
      connectAccount: {
        q: "Do I need to connect my Instagram account?",
        a: "No. There is no login, no password, and no permissions to grant. A screenshot is all Blink needs, which also means it works on private accounts.",
      },
      dataStorage: {
        q: "What happens to my screenshot?",
        a: "It is sent to our analysis service and on to the AI provider that reads it, held only for as long as the analysis takes, and not kept afterwards. Blink keeps the written result in your account, plus a fingerprint of the image so the same screenshot can't be re-submitted for points. Full detail is in the Privacy Policy.",
      },
      aiDisclosure: {
        q: "Is the analysis written by an AI?",
        a: "Yes — every score, trait and sentence is generated by an AI vision model, automatically and without a human reading it first. It is an interpretation of one screenshot, not a measurement of a person.",
      },
      recommendations: {
        q: "Can Blink tell me what to change?",
        a: "Yes. Alongside the impression you make, Blink suggests small, specific shifts that move your profile closer to how you want to be read.",
      },
      free: {
        q: "Is Blink free?",
        a: "Yes. Blink is free to use today, and there is nothing to pay for. If paid plans are introduced, the price and the terms will be shown before anyone is asked to pay.",
      },
      someoneElse: {
        q: "Can I analyze someone else's profile?",
        a: "Blink will read a screenshot of another public profile, and it will withhold the improvement advice — that part is only written for the person who controls the account. If you appear in an analysis someone else ran, you can ask us to delete it.",
      },
    },
  },

  finalCta: {
    subtitle: "Your first impression is already out there. Blink shows it to you.",
  },

  footer: {
    product: "Product",
    legal: "Legal",
    social: "Social",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookies & storage",
    legalNotice: "Legal notice",
    contact: "Contact",
    rights: "All rights reserved.",
    madeFor: "Made for the curious.",
    aiNotice: "Analyses are generated by AI.",
  },

  auth: {
    unlockTitle: "Unlock your Blink results",
    signIn: "Sign in",
    signUp: "Create account",
    password: "Password",
    continueWithGoogle: "Continue with Google",
    forgotPassword: "Forgot password?",
    // Age is a condition of the account, so it is stated where the account
    // is created rather than only in the terms.
    ageAndTerms:
    "You must be 16 or over to use Blink. By continuing you accept the Terms of Service and the Privacy Policy.",
    signupTitle: "Unlock your Blink results",
    signupSubtitle: "Create your account to see your complete analysis.",
    signinTitle: "Welcome back",
    signinSubtitle: "Sign in to continue to Blink.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your email and we'll send you a reset link.",
    verifyTitle: "Verify your email",
    verifySubtitle: "We sent a verification link to",
    passwordPlaceholder: "At least 6 characters",
    creatingAccount: "Creating account…",
    signingIn: "Signing in…",
    sending: "Sending…",
    createAccount: "Create account",
    sendResetLink: "Send reset link",
    resendVerification: "Resend verification email",
    backToSignIn: "Back to sign in",
    resent: "Verification email sent again. Check your inbox.",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    createOne: "Create one",
  },

  settings: {
    title: "Settings",
    subtitle: "Your account, privacy and data.",
    account: "Account",
    authMethod: "Authentication method",
    privacy: "Security & Privacy",
    screenshots: "Screenshots",
    screenshotsValue: "Not kept after analysis",
    analyses: "Your analyses",
    analysesValue: "Stored in your account",
    changePassword: "Change password",
    yourData: "Your data",
    exportTitle: "Download your data",
    exportBody:
    "A JSON file containing your account details, your saved analyses, your public profile and your score history.",
    exportButton: "Download my data",
    exportPreparing: "Preparing…",
    exportFailed: "Could not prepare your data. Please try again.",
    dangerZone: "Danger zone",
    deleteBody:
    "Delete your Blink account. This removes your analyses, your score history, your public profile and your avatar. It cannot be undone.",
    deleteButton: "Delete account",
    deleteConfirmQuestion: "Are you sure? This cannot be undone.",
    deleteConfirm: "Yes, delete my account",
    deleting: "Deleting…",
    deleteFailed:
    "Could not delete everything. Nothing was left half-deleted — please try again, or email us and we will do it by hand.",
    // Shown when the data is gone but the login row could not be removed
    // from the client. Saying so is better than implying a clean sweep.
    deletePartial:
    "Your data has been deleted and you have been signed out. Your login record is removed separately — email us and we will confirm once it is gone.",
    privacyRequests: "Privacy requests",
    privacyRequestsBody:
    "To access, correct, export, restrict or object to the processing of your data, email us. We answer within one month.",
    logOut: "Log out",
  },

  product: {
    uploadPrivacy: "Your screenshot is read by an AI model, then not kept.",
    uploadPrivacyLink: "What happens to my screenshot",
  },

  analysis: {
    // Article 50 of the AI Act, and simply the truth: the reader should not
    // have to guess whether a person wrote this.
    aiGenerated: "AI-generated",
    aiNotice:
    "Generated by an AI model from your screenshot. It's an interpretation of one image, not a fact about you.",
    aiNoticeOther:
    "Generated by an AI model from this screenshot. It's an interpretation of one image, not a fact about this person.",
  },

  legalPages: {
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookies & local storage",
    legalNotice: "Legal notice",
    contact: "Contact & support",
    lastUpdated: "Last updated",
    august2026: "August 2026",
  },
};

/**
 * The message tree, typed off English.
 *
 * `en` is declared without `as const`, so every value widens to `string` and
 * the type describes the *shape* rather than the exact English wording. `fr`
 * is then annotated with that shape: a missing key is an error, a key that
 * does not exist in English is an error, and neither can reach production.
 */
export type Messages = typeof en;

const fr: Messages = {
  common: {
    back: "Retour",
    backToBlink: "Retour à Blink",
    close: "Fermer",
    cancel: "Annuler",
    email: "E-mail",
    loading: "Chargement…",
    language: "Langue",
    languageEnglish: "English",
    languageFrench: "Français",
    switchToFrench: "Passer en français",
    switchToEnglish: "Switch to English",
  },

  nav: {
    howItWorks: "Comment ça marche",
    leaderboard: "Classement",
    reviews: "Réactions",
    faq: "FAQ",
    openBlink: "Ouvrir Blink",
    logIn: "Connexion",
    logOut: "Déconnexion",
    analyzeProfile: "Analyser un profil",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    library: "Bibliothèque",
    profile: "Profil",
    settings: "Réglages",
    ranks: "Classement",
    welcomeBack: "Content de te revoir",
    signInToOpen: "Connecte-toi pour ouvrir ton Blink.",
  },

  brand: {
    tagline: "Vois-toi comme les autres te voient.",
    cta: "Voir ma première impression",
  },

  hero: {
    headlineStart: "Vois-toi comme",
    headlineAccent: "les autres te voient.",
    subtitle:
    "Blink analyse ta présence Instagram et révèle la première impression que tu donnes.",
    trustFree: "Gratuit",
    trustNoLogin: "Sans connexion Instagram",
    trustNotKept: "Capture non conservée",
    readsAs: "Perçu comme",
    lensCrush: "ton crush te voit",
    lensStranger: "un inconnu te voit",
    lensFriends: "tes amis te voient",
    lensRecruiter: "un recruteur te voit",
    lensPrefix: "Comment",
  },

  howItWorks: {
    eyebrow: "Comment ça marche",
    heading: "Une capture devient une perception.",
    subtitle:
    "Blink lit ton profil comme le ferait quelqu'un, puis te montre ce que chaque type de personne en retient.",
    cta: "Voir la mienne",
    stepScreenshot: "Ta capture",
    stepReads: "Blink la lit",
    stepPerceptions: "Six perceptions",
    sample: "Exemple de résultat",
    signals: {
      visualIdentity: "Identité visuelle",
      aesthetic: "Esthétique",
      confidence: "Assurance",
    },
  },

  perceptions: {
    crush: {
      title: "Comment ton crush te voit",
      quote: "Ça a l'air réfléchi. Sans en faire trop, mais clairement pas au hasard.",
      tags: ["Sûr de soi", "Mystérieux", "Statut"],
    },
    stranger: {
      title: "Comment un inconnu te voit",
      quote: "En 3 secondes, tu as l'air de quelqu'un qui gère sa vie. C'est rare.",
      tags: ["Intrigant", "Fiable", "Soigné"],
    },
    friends: {
      title: "Comment tes amis te voient",
      quote: "La même personne, mais en ligne t'as l'air bien plus posé que tu ne l'admets.",
      tags: ["Fidèle", "Drôle", "Discret"],
    },
    recruiter: {
      title: "Comment un recruteur te voit",
      quote: "Pro sans être ennuyeux. Ce profil montre le sens du détail.",
      tags: ["Compétent", "Clair", "Crédible"],
    },
    "green-flag": {
      title: "Ton plus gros green flag",
      quote: "Rien ici ne sent l'effort désespéré. En 2026, c'est un green flag.",
      tags: ["Serein", "Authentique", "Équilibré"],
    },
    "red-flag": {
      title: "Ton plus gros red flag",
      quote: "Tout est presque trop léché. Certains lisent ça comme « difficile à cerner ».",
      tags: ["Distant", "Insaisissable", "Trop curaté"],
    },
  },

  leaderboardSection: {
    eyebrow: "La suite",
    heading: "Il y a un classement.",
    subtitle:
    "Il mesure la lisibilité d'un profil — un petit compte peut donc passer devant un compte connu.",
    cta: "Voir où je me situerais",
    captionBoard: "Classé sur la lecture du profil. Pas sur les abonnés.",
    captionClimb: "Améliore quelque chose de réel, et tu montes.",
    captionCategories: "Tu es aussi classé dans une catégorie.",
    captionLarp: "Larp — une des catégories de Blink.",
    captionBadges: "Monte assez haut et ça devient un statut.",
    illustrative: "Illustration — classement non réel",
  },

  testimonials: {
    eyebrow: "Réactions",
    heading: "Tout le monde compare son score.",
    subtitle:
    "Des exemples écrits du type de réaction que Blink provoque — des illustrations, pas des avis clients vérifiés.",
    badge: "Exemple",
    footer: "Découvre ce que ton Instagram dit de toi",
    cta: "Voir ma première impression",
  },

  faq: {
    heading: "Questions",
    items: {
      whatIsBlink: {
        q: "C'est quoi Blink ?",
        a: "Blink lit ton profil Instagram comme le ferait quelqu'un et te dit la première impression qu'il donne vraiment — à un inconnu, à ton crush, à un recruteur, à tes amis.",
      },
      howAnalyze: {
        q: "Comment Blink analyse mon profil ?",
        a: "Tu envoies une capture d'écran de ton profil. Un modèle d'IA visuelle regarde ce que verrait n'importe quel visiteur — photo de profil, nom, bio et l'ensemble de ta grille — et interprète ces signaux comme un tout, pas comme une checklist.",
      },
      connectAccount: {
        q: "Dois-je connecter mon compte Instagram ?",
        a: "Non. Aucune connexion, aucun mot de passe, aucune autorisation à donner. Une capture suffit — c'est aussi pour ça que ça marche sur les comptes privés.",
      },
      dataStorage: {
        q: "Que devient ma capture d'écran ?",
        a: "Elle est transmise à notre service d'analyse puis au fournisseur d'IA qui la lit, conservée uniquement le temps de l'analyse, et pas gardée ensuite. Blink conserve le résultat écrit dans ton compte, ainsi qu'une empreinte de l'image pour éviter qu'une même capture serve deux fois à marquer des points. Le détail complet est dans la Politique de confidentialité.",
      },
      aiDisclosure: {
        q: "L'analyse est-elle écrite par une IA ?",
        a: "Oui — chaque score, chaque trait et chaque phrase est généré par un modèle d'IA visuelle, automatiquement, sans relecture humaine préalable. C'est l'interprétation d'une capture d'écran, pas une mesure de la personne.",
      },
      recommendations: {
        q: "Blink peut-il me dire quoi changer ?",
        a: "Oui. En plus de l'impression que tu donnes, Blink propose de petits ajustements précis qui rapprochent ton profil de la façon dont tu veux être perçu.",
      },
      free: {
        q: "Blink est-il gratuit ?",
        a: "Oui. Blink est gratuit aujourd'hui, il n'y a rien à payer. Si des offres payantes arrivent, le prix et les conditions seront affichés avant tout paiement.",
      },
      someoneElse: {
        q: "Puis-je analyser le profil de quelqu'un d'autre ?",
        a: "Blink lit la capture d'un autre profil public, mais retient les conseils d'amélioration — cette partie n'est écrite que pour la personne qui gère le compte. Si tu apparais dans une analyse lancée par quelqu'un d'autre, tu peux nous demander de la supprimer.",
      },
    },
  },

  finalCta: {
    subtitle: "Ta première impression existe déjà. Blink te la montre.",
  },

  footer: {
    product: "Produit",
    legal: "Légal",
    social: "Réseaux",
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    cookies: "Cookies et stockage",
    legalNotice: "Mentions légales",
    contact: "Contact",
    rights: "Tous droits réservés.",
    madeFor: "Fait pour les curieux.",
    aiNotice: "Les analyses sont générées par IA.",
  },

  auth: {
    unlockTitle: "Débloque tes résultats Blink",
    signIn: "Se connecter",
    signUp: "Créer un compte",
    password: "Mot de passe",
    continueWithGoogle: "Continuer avec Google",
    forgotPassword: "Mot de passe oublié ?",
    ageAndTerms:
    "Il faut avoir 16 ans ou plus pour utiliser Blink. En continuant, tu acceptes les Conditions d'utilisation et la Politique de confidentialité.",
    signupTitle: "Débloque tes résultats Blink",
    signupSubtitle: "Crée ton compte pour voir ton analyse complète.",
    signinTitle: "Content de te revoir",
    signinSubtitle: "Connecte-toi pour continuer sur Blink.",
    forgotTitle: "Réinitialiser ton mot de passe",
    forgotSubtitle: "Entre ton e-mail, on t'envoie un lien de réinitialisation.",
    verifyTitle: "Vérifie ton e-mail",
    verifySubtitle: "On a envoyé un lien de vérification à",
    passwordPlaceholder: "Au moins 6 caractères",
    creatingAccount: "Création du compte…",
    signingIn: "Connexion…",
    sending: "Envoi…",
    createAccount: "Créer un compte",
    sendResetLink: "Envoyer le lien",
    resendVerification: "Renvoyer l'e-mail de vérification",
    backToSignIn: "Retour à la connexion",
    resent: "E-mail de vérification renvoyé. Vérifie ta boîte de réception.",
    haveAccount: "Tu as déjà un compte ?",
    noAccount: "Pas encore de compte ?",
    createOne: "En créer un",
  },

  settings: {
    title: "Réglages",
    subtitle: "Ton compte, ta vie privée et tes données.",
    account: "Compte",
    authMethod: "Méthode de connexion",
    privacy: "Sécurité et confidentialité",
    screenshots: "Captures d'écran",
    screenshotsValue: "Non conservées après l'analyse",
    analyses: "Tes analyses",
    analysesValue: "Conservées dans ton compte",
    changePassword: "Changer le mot de passe",
    yourData: "Tes données",
    exportTitle: "Télécharger tes données",
    exportBody:
    "Un fichier JSON contenant les informations de ton compte, tes analyses enregistrées, ton profil public et ton historique de score.",
    exportButton: "Télécharger mes données",
    exportPreparing: "Préparation…",
    exportFailed: "Impossible de préparer tes données. Réessaie.",
    dangerZone: "Zone de danger",
    deleteBody:
    "Supprime ton compte Blink. Cela efface tes analyses, ton historique de score, ton profil public et ton avatar. C'est irréversible.",
    deleteButton: "Supprimer le compte",
    deleteConfirmQuestion: "Tu es sûr ? C'est irréversible.",
    deleteConfirm: "Oui, supprimer mon compte",
    deleting: "Suppression…",
    deleteFailed:
    "Impossible de tout supprimer. Rien n'a été laissé à moitié effacé — réessaie, ou écris-nous et on le fera à la main.",
    deletePartial:
    "Tes données ont été supprimées et tu as été déconnecté. Ton identifiant de connexion est supprimé séparément — écris-nous et on te confirmera dès que c'est fait.",
    privacyRequests: "Demandes relatives à tes données",
    privacyRequestsBody:
    "Pour accéder à tes données, les corriger, les exporter, en limiter le traitement ou t'y opposer, écris-nous. On répond sous un mois.",
    logOut: "Se déconnecter",
  },

  product: {
    uploadPrivacy: "Ta capture est lue par un modèle d'IA, puis non conservée.",
    uploadPrivacyLink: "Ce que devient ma capture",
  },

  analysis: {
    aiGenerated: "Généré par IA",
    aiNotice:
    "Généré par un modèle d'IA à partir de ta capture. C'est l'interprétation d'une image, pas un fait te concernant.",
    aiNoticeOther:
    "Généré par un modèle d'IA à partir de cette capture. C'est l'interprétation d'une image, pas un fait concernant cette personne.",
  },

  legalPages: {
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    cookies: "Cookies et stockage local",
    legalNotice: "Mentions légales",
    contact: "Contact et assistance",
    lastUpdated: "Dernière mise à jour",
    august2026: "août 2026",
  },
};

export const MESSAGES: Record<"en" | "fr", Messages> = { en, fr };

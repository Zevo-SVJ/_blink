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
  },

  /**
   * The two halves of the problem, delivered over the opening eye.
   *
   * They are one sentence broken in two on purpose: the first is the part
   * every reader already agrees with, the second is the turn.
   */
  problem: {
    knows: "You know your profile.",
    doesnt: "You don't know the impression it gives.",
  },

  /**
   * The film.
   *
   * Section chrome only. The words inside the picture live in
   * `src/remotion/copy.ts`, because they are cut to frames rather than laid
   * out in a document — and because they are baked into a rendered file, not
   * read from here at runtime.
   */
  experience: {
    eyebrow: "What Blink does",
    actProfile: "A profile. Nothing else.",
    actAnalysis: "Blink reads it.",
    actGaze: "Who's looking?",
    actNiche: "Measured against a niche.",
    actScore: "That's the score.",
    whosLooking: "Who's looking",
    measuredAs: "Measured as",
    outOfTen: "out of 10",
    sample: "A sample profile, so you can see the whole thing before you upload anything.",
    /**
     * The demonstration's own content.
     *
     * It lived in `experience/demo.ts` as English literals, so the French
     * landing page ran its whole signature feature in English: "Your crush",
     * "Confident", "Reads as someone with a life already in motion." The
     * gaze ids, the category id, the numbers and the handle stay in that file
     * — they are structure, and two of them are checked against real types.
     * These are the words.
     */
    demo: {
      gazes: {
        crush: {
          short: "Your crush",
          reads: ["Confident", "Interesting", "Mysterious", "Warm"],
          summary: "Reads as someone with a life already in motion.",
        },
        friends: {
          short: "A friend",
          reads: ["Warm", "Consistent", "Confident", "Funny"],
          summary: "Recognisably you — the version they already know.",
        },
        stranger: {
          short: "A stranger",
          reads: ["Distinctive", "Confident", "Hard to read", "Interesting"],
          summary: "Enough to be curious about, not enough to place.",
        },
        recruiter: {
          short: "Someone professional",
          reads: ["Credible", "Ambitious", "Polished", "Confident"],
          summary: "Signals competence before it signals personality.",
        },
      },
      bio: ["building something small", "photos when it's worth it", "London"],
      stats: { posts: "posts", followers: "followers", following: "following" },
      passes: {
        avatar: { label: "Portrait", found: "Direct, unposed" },
        bio: { label: "Bio", found: "Understated" },
        grid: { label: "Recent posts", found: "One consistent palette" },
      },
    },

  },

  film: {
    eyebrow: "In twenty seconds",
    heading: "This is what Blink does.",
    subtitle:
      "Twenty seconds: a profile goes in, a first impression comes out.",
  },

  howItWorks: {
    eyebrow: "How it works",
    heading: "Four steps. One screenshot.",
    subtitle:
    "The same capture carries all the way through — it is never swapped for something else.",
    cta: "See mine",
    /** The demo output. Sample output, so it is labelled as such. */
    sample: "Example result",
    signals: {
      visualIdentity: "Visual identity",
      aesthetic: "Aesthetic",
      confidence: "Confidence",
    },
    /** What the read marks on the capture. */
    regions: {
      photo: "Photo",
      bio: "Bio",
      grid: "Grid",
    },
    /**
     * The four steps. `label` names the step in the selector, `title` and
     * `body` say what happens in it.
     */
    steps: {
      capture: {
        label: "Capture",
        title: "Screenshot the profile.",
        body: "Yours, or anyone's. One image is the whole input — no login, no Instagram connection.",
      },
      upload: {
        label: "Upload",
        title: "Drop it into Blink.",
        body: "It goes straight to the analysis. Nothing is posted anywhere.",
      },
      read: {
        label: "Read",
        title: "Blink reads what a person would.",
        body: "Photo, bio, grid — the three things anyone judges in the first three seconds.",
      },
      score: {
        label: "Score",
        title: "You get a score out of ten.",
        body: "How well the profile fits the niche it is read against — not how likeable you are.",
      },
    },
    /** Step four's card. */
    outOfTen: "/ 10",
    measuredAgainst: "Measured against",
    exampleNiche: "Photography",
    progress: "Step",
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

  /**
   * The landing's activity ticker.
   *
   * Illustrative, and marked as such wherever it is shown — see
   * `lib/activity.ts`. These lived in that file as English literals, so the
   * French landing announced that someone "got a Magnetic verdict".
   */
  activity: {
    actions: [
      "scanned a profile",
      "just got read by a stranger",
      "checked how their crush sees them",
      "climbed into the top 100",
      "ran their first Blink",
      "compared two profiles",
      "moved up 12 places",
      "unlocked a new category",
      "re-scanned after a redesign",
      "found out they read as a Larp",
      "sent their result to a friend",
      "got a Magnetic verdict",
    ],
  },

  leaderboardSection: {
    eyebrow: "Where it goes",
    heading: "There's a leaderboard.",
    subtitle:
    "It measures how well a profile reads — so a small account can sit above a famous one.",
    cta: "See where I'd rank",
    captionBoard: "Ranked on how a profile reads. Not on followers.",
    // The count under each demonstration row: "1.2M followers".
    followers: "followers",
    captionClimb: "Improve something real, and you move.",
    captionCategories: "You're ranked inside a category, too.",
    captionLarp: "Larp — one of Blink's categories.",
    captionBadges: "Rank high enough and it becomes status.",
    illustrative: "Illustration — not live standings",
    /* The board's own chrome. It was English literals in the component, so the
       French page showed a row labelled "You" under a header saying "Global". */
    you: "You",
    global: "Global",
    thisWeek: "This week",
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
    // Shown after the form is submitted. `{email}` is the address typed in.
    verificationSent: "We sent a verification link to {email}. Check your inbox to continue.",
    resetSent: "If an account exists for {email}, we've sent a password reset link.",
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
    change: "Change",
    home: "Home",
    back: "Back",
    gateTitle: "Create your account",
    gateSubtitle:
      "Your analysis is saved to your library, moves your score and places you on the leaderboard — so it needs an account. It takes a few seconds.",
    unlockTitle: "Unlock your Blink results",
    unlockSubtitle: "Create your account to see the complete analysis.",
    dropzone: "Upload profile screenshot",
    dropzoneFormats: "PNG, JPG, WEBP — max {mb}MB",
    uploadTitle: "Show us a profile.",
    uploadBody:
      "Upload a screenshot of an Instagram profile and Blink will analyze the first impression it gives.",
    looksGood: "Looks good?",
    chooseAnother: "Choose another screenshot",
    tryAgain: "Try again",
    analyzeThis: "Analyze this profile",
    screenshotAlt: "Your profile screenshot",
    analyzingAlt: "The profile being analyzed",
    inspecting: "Blink is inspecting this",
    analyzing: "Analyzing…",
    /* Shown while the analysis is on its way to the profile. It was an
       English literal on the analyse screen, so the French app said it too. */
    savingToProfile: "Saving this analysis to your profile…",
    counts: "Verified — this counts",
    notCounted: "Not counted",
    rankUpdated: "Your rank has been updated from this screenshot.",
    lockedBody: "See how your profile comes across — and what you can do about it.",
    lockedFree: "Free — create an account or sign in",
    unlock: "Unlock the results",
    uploadPrivacy: "Your screenshot is read by an AI model, then not kept.",
    uploadPrivacyLink: "What happens to my screenshot",
  },

  analysis: {
    sections: "Analysis sections",
    perception: "Perception",
    signals: "Signals",
    /**
     * The six signals, for reading.
     *
     * The canonical English strings stay in `lib/analysis` and `lib/ranking`,
     * where they are keys — `signalByLabel` looks craft signals up by exactly
     * those words, and a translation reaching them would silently break
     * scoring. These are display names only, keyed by the canonical string
     * through `signalName`. Before this the French analysis screen said
     * "Visual Identity", "Approachability" and "Mystery".
     */
    signalNames: {
      "Visual Identity": "Visual identity",
      Aesthetic: "Aesthetic",
      Confidence: "Confidence",
      Status: "Status",
      Approachability: "Approachability",
      Mystery: "Mystery",
    },
    actions: "Actions",
    nextMove: "Your next move",
    standing: "Standing",
    blinkScore: "Blink Score",
    leaderboard: "Leaderboard",
    ofRanked: "of {total} ranked",
    notRanked: "Not ranked yet",
    category: "Category",
    archetype: "Archetype",
    publicSignals: "Public perception signals",
    topMoves: "Your highest-impact next moves",
    strong: "Strong",
    moderate: "Moderate",
    developing: "Developing",
    emerging: "Emerging",
    lensCrush: "The one you actually wanted",
    lensStranger: "Three seconds, cold",
    lensFriends: "People who know you",
    lensRecruiter: "Someone checking you out",
    // Article 50 of the AI Act, and simply the truth: the reader should not
    // have to guess whether a person wrote this.
    aiGenerated: "AI-generated",
    aiNotice:
    "Generated by an AI model from your screenshot. It's an interpretation of one image, not a fact about you.",
    aiNoticeOther:
    "Generated by an AI model from this screenshot. It's an interpretation of one image, not a fact about this person.",
  },

  app: {
    tabHome: "Home",
    tabAnalyze: "Analyze",
    tabLibrary: "Library",
    tabRanks: "Ranks",
    tabProfile: "Profile",
    primaryNav: "Primary",
    loading: "Loading…",
    retry: "Try again",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    optional: "Optional",
  },

  home: {
    greeting: "Hey, {name}",
    welcome: "Welcome to Blink",
    subtitle: "See how a profile comes across — and make yours read the way you want.",
    analyzeTitle: "Analyze a profile",
    analyzeSubtitle: "Upload a screenshot — yours or anyone's",
    noScoreTitle: "You don't have a Blink Score yet",
    noScoreBody:
      "Upload a screenshot of your own profile — the one showing Edit profile — and Blink will score how well it reads, then show you what to change.",
    blinkScore: "Blink Score",
    rank: "Rank",
    best: "Best",
    streak: "Streak",
    toNextTier: "{points} to go before {tier}. A higher score means a profile that reads more clearly.",
    viewFullProfile: "View full profile",
  },

  library: {
    title: "Library",
    subtitle: "Every profile you've analyzed.",
    emptyTitle: "No analyses yet",
    emptyBody: "Analyze a profile to start building your library.",
    loadFailed: "Blink couldn't load your analyses. Check your connection and try again.",
    yours: "Your profile",
    others: "Others",
    // Whose profile the analysis is of. Not a visibility claim — every row
    // here is readable only by the person who ran it.
    someoneElse: "Someone else",
    noneWithFilter: "Nothing here with that filter.",
  },

  ranksPage: {
    title: "Leaderboard",
    subtitle: "Ranked by how optimized a profile is. Not by followers.",
    addSomeone: "Add someone",
    tabStandings: "Standings",
    tabWinners: "Winners",
    tabAnalyzed: "Analyzed",
    all: "All",
    emptyAnalyzedTitle: "No profiles analyzed yet",
    emptyCategoryTitle: "Nothing in this category",
    emptyCategoryBody: "None of the profiles you've analyzed read as this archetype.",
    uncategorized: "Uncategorized",
    privateRow: "Private",
    scans: "scans",
    suggested: "Suggested — not analyzed yet",
    notAnalyzedYet: "Not analyzed yet",
    privateNote:
      "Only you can see these. Each score here is your own reading of one screenshot — not the score that profile's owner published — so someone can appear on both boards with different numbers. Analyzing a profile never adds anyone to the public leaderboard.",
    you: "You",
    unranked: "Unranked",
    analyzedEmptyBody: "Analyze someone's profile and they'll be ranked here — visible only to you.",
    yourPosition: "Your position",
    noMovement: "No movement recorded yet",
    heldPosition: "Held position",
    movedUp: "Up {n} place(s) since the last snapshot",
    movedDown: "Down {n} place(s) since the last snapshot",
    launchTitle: "The board is still filling up",
    launchTitleCategory: "Nobody is ranked in {category} yet",
    launchBody:
      "Blink only ranks real, verified profiles — so the board starts empty rather than with placeholder names.",
    launchStep1: "Analyze your own profile to get a Blink Score.",
    launchStep2: "Turn on leaderboard visibility in your profile.",
    launchStep3: "Improve, re-upload, and climb as changes are verified.",
    noWinnersTitle: "No winners yet",
    noWinnersBody:
      "Each week Blink crowns the biggest verified improvement overall and in every category. The first results land after a full week of analyses.",
    fairness:
      "Blink ranks profile optimization and perception — never follower count, reach or fame. A 200-follower account can sit above a celebrity if its profile reads more clearly. Positions only move on a verified analysis of a new screenshot, so opening the app never earns progress.",
    score: "score",
    weekOf: "Week of",
    overallWinner: "Overall winner",
    categoryWinner: "{category} winner",

  },

  profilePage: {
    title: "Profile",
    settings: "Settings",
    noVerifiedTitle: "No verified analysis yet",
    noVerifiedBody:
      "Upload a screenshot of your own Instagram profile — the one showing Edit profile — to get your first Blink Score.",
    editProfile: "Edit profile",
    editDialog: "Edit your profile",
    checkFields: "Check the fields above.",
    global: "Global",
    verified: "Verified",
    edit: "Edit",
    yourInstagram: "Your Instagram",
    viewInstagram: "View on Instagram",
    statusMine: "Status",
    statusTheirs: "Status held",
    recordMine: "Your record",
    recordTheirs: "Record",
  },

  onboarding: {
    title: "Set up your profile",
    nameQ: "What should we call you?",
    nameHint: "Shown on your public profile and the leaderboard.",
    handleQ: "What's your Instagram?",
    handleHint: "So people can tell it's really you.",
    linkQ: "Link your profile?",
    linkHint: "Adds a View Instagram button. You can skip this.",
    countryQ: "Where are you from?",
    countryHint: "Shows as a flag next to your name.",
    photoQ: "Add a photo?",
    photoHint: "Optional — we'll use your initial otherwise.",
    boardQ: "Join the leaderboard?",
    boardHint: "You can change this any time in your profile.",
    needName: "Add a name so people know who they're seeing.",
    needHandle: "Add your Instagram username.",
    checkAnswers: "Check your answers.",
    finish: "Finish",
    continue: "Continue",
    skip: "Skip",
  },

  addSomeone: {
    title: "Add someone",
    dialogTitle: "Add someone to the leaderboard",
    blurb:
      "Suggest a profile for the leaderboard. This doesn't run an analysis and doesn't affect your score.",
    categoryLabel: "Which board?",
    whyThem: "Why them",
    handlePlaceholder: "username",
    readFromScreenshot: "Read from your screenshot",
    notImage: "That file isn't an image Blink can read. PNG, JPG or WebP.",
    notHandle: "That doesn't look like an Instagram username.",
    notePlaceholder: "Their grid is unreal",
    adding: "Adding…",
    submit: "Add to leaderboard",
    reading: "Reading the username…",
    screenshotAdded: "Screenshot added",
    addScreenshot: "Add a screenshot",
    lookingForHandle: "Looking for the @ in the image",
    tapToChange: "Tap to choose a different one",
    screenshotHint: "Optional — we'll try to read the username from it",
    already: "Already added",
    alreadyBody: "{handle} is already on your board.",
    added: "Added to your board",
    // Says exactly what happened and no more: the row is on this user's board,
    // and adding somebody does not publish them.
    addedBody: "{handle} is on your board now. Only you can see it.",
    notSaved:
      "Blink couldn't save that. The leaderboard isn't set up yet, so nothing was added — try again later.",
  },

  identity: {
    uploading: "Uploading…",
    changePicture: "Change picture",
    addPicture: "Add picture",
    pictureHint: "Optional. Shown on the leaderboard.",
    displayName: "Display name",
    yourName: "Your name",
    instagramUsername: "Instagram username",
    instagramLink: "Instagram link",
    country: "Country",
    publicOn: "Your profile is public",
    publicOff: "Only you can see your score",
  },

  share: {
    title: "Share your result",
    dialogTitle: "Share your Blink result",
    buildFailed: "Blink couldn't build the card. Try again.",
    shareTitle: "My Blink result",
    shared: "Shared",
    unavailable: "Sharing isn't available here — try downloading instead.",
    saved: "Saved",
    saveFailed: "Blink couldn't save the card. Try again.",
    saveImage: "Save image",
  },

  /**
   * "How to climb" — the paths, the track names and the standing line.
   *
   * This prose lived as literals inside `lib/climb.ts`, so the French Profile
   * screen was half English: seven paths, three track names and four standing
   * lines, all untranslated. Which paths appear and in what order is still
   * decided there, from the reader's own stats — only the words are here.
   *
   * `{label}`, `{signal}`, `{score}` and `{rank}` are filled in by the caller.
   * Where a path reads differently when Blink does not yet know the category
   * or the strongest signal, both wordings are given.
   */
  climbPaths: {
    tracks: {
      perception: "Improve perception",
      momentum: "Build momentum",
      recognition: "Earn recognition",
    },
    standing: {
      noScore: "Analyze your own profile to get a score and a position.",
      unranked: "You're at {score}. Turn on leaderboard visibility to take a position.",
      climbing: "You're at {score}, rank #{rank}, and climbing.",
      falling: "You're at {score}, rank #{rank}. Momentum has turned negative.",
      steady: "You're at {score}, rank #{rank}.",
    },
    identity: {
      kind: "Your identity",
      title: "Lean into {label}",
      titleUnknown: "Lean into what you already are",
      whatToTry:
        "Blink reads you as {label}. Post two or three more in the treatment that already reads that way — same palette, same framing, same energy. You are not starting a new direction, you are making the existing one unmistakable.",
      whatToTryUnknown:
        "Pick the three posts that feel most like you and make the next few look like they belong beside them. Not a new direction — a clearer version of the one you have.",
      why:
        "{signal} is already your strongest signal. Signals compound: the clearer a profile is about one thing, the higher every other axis reads, because nothing is fighting for the interpretation.",
      whyUnknown:
        "Coherence is a fifth of the score, and it is the axis that lifts the others. A profile that is unmistakably about one thing reads as deliberate rather than accumulated.",
      notNeeded: "Nothing about your profile as it stands. No new bio, no new picture, no new aesthetic.",
      impact: "Typically +0.3 to +0.7",
    },
    bodyOfWork: {
      kind: "Your work",
      title: "Deepen the body of work",
      whatToTry:
        "Add to the grid in the treatment you already use — Reels count. Depth, not variety: five more posts that look like they belong together do more than five that each try something new.",
      why: "A grid that stops early reads as abandoned rather than curated. Volume in one direction is what turns a consistent look into a body of work, which is what lifts Visual Identity and Aesthetic together.",
      notNeeded: "A new look. This path is explicitly about more of the same.",
      impact: "Typically +0.2 to +0.6",
    },
    lane: {
      kind: "Your lane",
      title: "Compete inside {label}",
      titleUnknown: "Compete inside your category",
      whatToTry:
        "The global board mixes every kind of profile. {label} is a much smaller field, and it is the one where your signals are actually comparable. Keep your category clear and your position in it moves faster than your global rank ever will.",
      whatToTryUnknown:
        "Categories are smaller boards where your signals are compared against profiles doing the same thing. The clearer your category reads, the more meaningful — and the more winnable — your position becomes.",
      why: "Category rank is computed from the same score against a narrower field, so the same improvement moves you further. It is also how weekly winners are chosen.",
      notNeeded: "Changing what kind of account you run to chase an easier category.",
      impact: "Moves your category rank fastest",
    },
    verify: {
      kind: "Housekeeping",
      title: "Re-verify what you've already changed",
      whatToTry:
        "Upload a fresh screenshot after any real change. Blink re-reads the profile and the new score replaces the old one.",
      why: "Nothing moves your rank until it is verified. Changes you have already made are worth nothing to the board until a new screenshot proves them.",
      notNeeded: "Any further changes — this is about banking the ones you already made.",
      impact: "Unlocks every other path",
    },
    streak: {
      kind: "Housekeeping",
      title: "Show up weekly",
      whatToTry: "One verified analysis a week keeps your streak alive. A single upload counts.",
      why: "Streaks record sustained attention, and an active profile holds its position while dormant ones drift down as others improve.",
      notNeeded: "Posting on a schedule. This is about analysing, not performing.",
      impact: "Protects your rank",
    },
    momentum: {
      kind: "Momentum",
      title: "Turn momentum positive",
      whatToTry:
        "Momentum is the gap between your last two verified analyses. Make one concrete change — any of the paths here — and re-upload to flip it.",
      why: "Momentum is what separates profiles on similar scores, and it is the signal weekly winners are chosen on: biggest verified improvement, not highest score.",
      notNeeded: "A big change. The smallest real one still registers.",
      impact: "Decides close positions",
    },
    perception: {
      kind: "Optional",
      title: "Sharpen the first three seconds",
      whatToTry:
        "If someone landing cold can't tell what the account is about, the fastest fixes are the name field, the first line of the bio, and highlight covers in your existing palette. Take any one of them, or none.",
      why: "Clarity is a tenth of the score and the axis most often left on the table. But deliberate opacity is a valid strategy — if being hard to read is the point, this path is not for you.",
      notNeeded: "Your profile picture, your aesthetic, or how you already present yourself.",
      impact: "Typically +0.1 to +0.3",
    },
  },

  climb: {
    title: "How to climb",
    startHere: "Start here",
    readOff: "Read off your screenshot",
    body:
      "Blink saw this on your last upload. Make the change, upload a new screenshot, and it counts towards your rank.",
    whyThisHelps: "Why this helps.",
    noNeedToChange: "You don't need to change.",
    noRedesign:
      "You never have to redesign your profile to climb. Depth, consistency and staying active move the score on their own.",
    uploadNew: "Upload a new screenshot",
  },

  detail: {
    title: "Analysis",
    shareThis: "Share this result",
    share: "Share",
    notFoundTitle: "Analysis not found",
    notFoundBody: "It may have been deleted, or it belongs to another account.",
  },

  publicProfile: {
    aPublicProfile: "A public Blink profile.",
    tryIt: "Try it",
    notAvailableTitle: "Profile not available",
    notAvailableBody: "This profile is private, or it isn't on the leaderboard yet.",
    backToRanks: "Back to Ranks",
    anonymous: "Anonymous",
  },

  /**
   * Ids stay in the database; only these words change per language.
   * Keyed by the same ids `lib/categories`, `lib/ranking` and `lib/badges`
   * already use, so a language can never introduce a new category or tier.
   */
  categories: {
    larp: { label: "Larp", blurb: "Genuinely high status, deliberately understated. Signals wealth without ever explaining it." },
    creator: { label: "Creator", blurb: "Built around an audience. The output is the point." },
    entrepreneur: { label: "Entrepreneur", blurb: "Building something, and says so. Credibility over mystique." },
    artist: { label: "Artist", blurb: "The work speaks first. Identity sits behind it." },
    fitness: { label: "Fitness", blurb: "Training and progress as the visual language." },
    fashion: { label: "Fashion", blurb: "Styling and taste do the communicating." },
    lifestyle: { label: "Lifestyle", blurb: "A life presented as one coherent aesthetic." },
    personal: { label: "Personal", blurb: "An ordinary account, not built for an audience." },
  },

  tiers: {
    unread: { label: "Unread", meaning: "The profile hasn't decided what it's saying yet." },
    emerging: { label: "Emerging", meaning: "A direction is forming, but it reads inconsistently." },
    defined: { label: "Defined", meaning: "The impression is clear and holds together." },
    sharp: { label: "Sharp", meaning: "Deliberate. Every element is pulling the same way." },
    magnetic: { label: "Magnetic", meaning: "Reads as intentional within seconds." },
    iconic: { label: "Iconic", meaning: "Nothing is accidental. The impression is unmistakable." },
  },

  badges: {
    elite: "Elite",
    topten: "Top 10",
    rising: "Rising",
    bestRank: "Best rank",
    peakScore: "Peak score",
    movement: "Movement",
    momentum: "Momentum",
    streak: "Streak",
    verified: "Verified",
    // The accessible name of the claimed mark. Says what it means — the owner
    // claimed this profile — not "verified", which would imply a human checked.
    claimedProfile: "Claimed profile",
    noChange: "No change yet",
    sinceLast: "since last update",
    /** Suffix on the streak count: "4w". */
    weeks: "w",
    /** Appended to a category name for its champion: "Creator Icon". */
    icon: "Icon",
    /**
     * The sentence each badge shows when it is opened.
     *
     * These lived in `badges.ts` as literals, so a French profile opened a
     * badge and got a paragraph of English. `{category}` is the category
     * name; `{whose}` is filled from `mine` or `theirs` below.
     */
    details: {
      champion:
        "First in {category}. Held for as long as nobody in the category outscores this profile.",
      elite: "Top three on the global board — every category, every account size.",
      topten: "Top ten on the global board.",
      rising: "Gained three or more places since the last snapshot.",
      best:
        "The highest position {whose} profile has held. It never drops, even when the current rank does.",
      peak: "The highest verified Blink Score {whose} profile has reached.",
      movement: "Places moved on the global board since the last snapshot.",
      movementNone: "Places moved since the last leaderboard snapshot. Nothing recorded yet.",
      momentum:
        "Points gained or lost since the previous verified analysis. Only a new screenshot moves it.",
      streak: "Consecutive weeks with a verified analysis. Opening the app doesn't count.",
      verified: "Profile changes Blink has confirmed from a new screenshot.",
      mine: "your",
      theirs: "their",
    },
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
  },

  problem: {
    knows: "Tu connais ton profil.",
    doesnt: "Tu ne connais pas l'impression qu'il donne.",
  },

  experience: {
    eyebrow: "Ce que fait Blink",
    actProfile: "Un profil. Rien d'autre.",
    actAnalysis: "Blink le lit.",
    actGaze: "Qui regarde ?",
    actNiche: "Mesuré pour une niche.",
    actScore: "Voilà le score.",
    whosLooking: "Qui regarde",
    measuredAs: "Mesuré comme",
    outOfTen: "sur 10",
    sample: "Un profil d'exemple, pour tout voir avant d'envoyer quoi que ce soit.",
    demo: {
      gazes: {
        crush: {
          short: "Ton crush",
          reads: ["Sûr de soi", "Intrigant", "Mystérieux", "Chaleureux"],
          summary: "Se lit comme quelqu'un dont la vie est déjà en mouvement.",
        },
        friends: {
          short: "Un ami",
          reads: ["Chaleureux", "Constant", "Sûr de soi", "Drôle"],
          summary: "Bien toi — la version qu'ils connaissent déjà.",
        },
        stranger: {
          short: "Un inconnu",
          reads: ["Singulier", "Sûr de soi", "Difficile à cerner", "Intrigant"],
          summary: "Assez pour intriguer, pas assez pour situer.",
        },
        recruiter: {
          short: "Quelqu'un de pro",
          reads: ["Crédible", "Ambitieux", "Soigné", "Sûr de soi"],
          summary: "Signale la compétence avant la personnalité.",
        },
      },
      bio: ["je construis un truc, doucement", "des photos quand ça vaut le coup", "Londres"],
      stats: { posts: "posts", followers: "abonnés", following: "abonnements" },
      passes: {
        avatar: { label: "Portrait", found: "Direct, sans pose" },
        bio: { label: "Bio", found: "Sobre" },
        grid: { label: "Posts récents", found: "Une seule palette" },
      },
    },

  },

  film: {
    eyebrow: "En vingt secondes",
    heading: "Voilà ce que fait Blink.",
    subtitle:
      "Vingt secondes : un profil entre, une première impression en sort.",
  },

  howItWorks: {
    eyebrow: "Comment ça marche",
    heading: "Quatre étapes. Une capture.",
    subtitle:
    "La même capture va jusqu'au bout — elle n'est jamais remplacée par autre chose.",
    cta: "Voir la mienne",
    sample: "Exemple de résultat",
    signals: {
      visualIdentity: "Identité visuelle",
      aesthetic: "Esthétique",
      confidence: "Assurance",
    },
    regions: {
      photo: "Photo",
      bio: "Bio",
      grid: "Grille",
    },
    steps: {
      capture: {
        label: "Capture",
        title: "Fais une capture du profil.",
        body: "Le tien, ou celui de n'importe qui. Une image suffit — sans connexion, sans lier Instagram.",
      },
      upload: {
        label: "Envoi",
        title: "Dépose-la dans Blink.",
        body: "Elle part directement à l'analyse. Rien n'est publié nulle part.",
      },
      read: {
        label: "Lecture",
        title: "Blink lit ce qu'une personne lirait.",
        body: "Photo, bio, grille — les trois choses que tout le monde juge en trois secondes.",
      },
      score: {
        label: "Score",
        title: "Tu obtiens une note sur dix.",
        body: "À quel point le profil colle à la niche sur laquelle il est lu — pas à quel point tu es sympathique.",
      },
    },
    outOfTen: "/ 10",
    measuredAgainst: "Mesuré sur",
    exampleNiche: "Photographie",
    progress: "Étape",
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

  activity: {
    actions: [
      "a scanné un profil",
      "vient d'être lu par un inconnu",
      "a vu comment son crush le voit",
      "est entré dans le top 100",
      "a lancé son premier Blink",
      "a comparé deux profils",
      "a gagné 12 places",
      "a débloqué une nouvelle catégorie",
      "a rescanné après un relooking",
      "a découvert qu'il se lit comme un Larp",
      "a envoyé son résultat à un ami",
      "a obtenu un verdict Magnétique",
    ],
  },

  leaderboardSection: {
    eyebrow: "La suite",
    heading: "Il y a un classement.",
    subtitle:
    "Il mesure la lisibilité d'un profil — un petit compte peut donc passer devant un compte connu.",
    cta: "Voir où je me situerais",
    captionBoard: "Classé sur la lecture du profil. Pas sur les abonnés.",
    followers: "abonnés",
    captionClimb: "Améliore quelque chose de réel, et tu montes.",
    captionCategories: "Tu es aussi classé dans une catégorie.",
    captionLarp: "Larp — une des catégories de Blink.",
    captionBadges: "Monte assez haut et ça devient un statut.",
    illustrative: "Illustration — classement non réel",
    you: "Toi",
    global: "Global",
    thisWeek: "Cette semaine",
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
    verificationSent:
      "On a envoyé un lien de vérification à {email}. Vérifie ta boîte de réception pour continuer.",
    resetSent:
      "Si un compte existe pour {email}, on a envoyé un lien de réinitialisation.",
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
    change: "Changer",
    home: "Accueil",
    back: "Retour",
    gateTitle: "Crée ton compte",
    gateSubtitle:
      "Ton analyse est enregistrée dans ta bibliothèque, fait bouger ton score et te place au classement — il faut donc un compte. Ça prend quelques secondes.",
    unlockTitle: "Débloque tes résultats Blink",
    unlockSubtitle: "Crée ton compte pour voir l'analyse complète.",
    dropzone: "Dépose la capture du profil",
    dropzoneFormats: "PNG, JPG, WEBP — {mb} Mo max",
    uploadTitle: "Montre-nous un profil.",
    uploadBody:
      "Envoie la capture d'un profil Instagram et Blink analysera la première impression qu'il donne.",
    looksGood: "Ça te va ?",
    chooseAnother: "Choisir une autre capture",
    tryAgain: "Réessayer",
    analyzeThis: "Analyser ce profil",
    screenshotAlt: "La capture de ton profil",
    analyzingAlt: "Le profil en cours d'analyse",
    inspecting: "Blink examine ça",
    analyzing: "Analyse…",
    savingToProfile: "Enregistrement de cette analyse sur ton profil…",
    counts: "Vérifié — ça compte",
    notCounted: "Non comptabilisé",
    rankUpdated: "Ton rang a été mis à jour à partir de cette capture.",
    lockedBody: "Vois comment ton profil est perçu — et ce que tu peux y faire.",
    lockedFree: "Gratuit — crée un compte ou connecte-toi",
    unlock: "Débloquer les résultats",
    uploadPrivacy: "Ta capture est lue par un modèle d'IA, puis non conservée.",
    uploadPrivacyLink: "Ce que devient ma capture",
  },

  analysis: {
    sections: "Sections de l'analyse",
    perception: "Perception",
    signals: "Signaux",
    signalNames: {
      "Visual Identity": "Identité visuelle",
      Aesthetic: "Esthétique",
      Confidence: "Assurance",
      Status: "Statut",
      Approachability: "Accessibilité",
      Mystery: "Mystère",
    },
    actions: "Actions",
    nextMove: "Ta prochaine étape",
    standing: "Position",
    blinkScore: "Blink Score",
    leaderboard: "Classement",
    ofRanked: "sur {total} classés",
    notRanked: "Pas encore classé",
    category: "Catégorie",
    archetype: "Archétype",
    publicSignals: "Signaux de perception publique",
    topMoves: "Tes actions les plus efficaces",
    strong: "Fort",
    moderate: "Moyen",
    developing: "En progression",
    emerging: "Émergent",
    lensCrush: "Celui qui t'intéresse vraiment",
    lensStranger: "Trois secondes, à froid",
    lensFriends: "Ceux qui te connaissent",
    lensRecruiter: "Quelqu'un qui te regarde de près",
    aiGenerated: "Généré par IA",
    aiNotice:
    "Généré par un modèle d'IA à partir de ta capture. C'est l'interprétation d'une image, pas un fait te concernant.",
    aiNoticeOther:
    "Généré par un modèle d'IA à partir de cette capture. C'est l'interprétation d'une image, pas un fait concernant cette personne.",
  },

  app: {
    tabHome: "Accueil",
    tabAnalyze: "Analyser",
    tabLibrary: "Bibliothèque",
    tabRanks: "Classement",
    tabProfile: "Profil",
    primaryNav: "Navigation principale",
    loading: "Chargement…",
    retry: "Réessayer",
    save: "Enregistrer",
    saving: "Enregistrement…",
    close: "Fermer",
    optional: "Facultatif",
  },

  home: {
    greeting: "Salut {name}",
    welcome: "Bienvenue sur Blink",
    subtitle: "Vois comment un profil est perçu — et fais lire le tien comme tu le veux.",
    analyzeTitle: "Analyser un profil",
    analyzeSubtitle: "Envoie une capture — le tien ou celui de quelqu'un d'autre",
    noScoreTitle: "Tu n'as pas encore de Blink Score",
    noScoreBody:
      "Envoie une capture de ton propre profil — celle où apparaît Modifier le profil — et Blink notera sa lisibilité, puis te dira quoi changer.",
    blinkScore: "Blink Score",
    rank: "Rang",
    best: "Record",
    streak: "Série",
    toNextTier: "{points} avant {tier}. Un score plus haut veut dire un profil qui se lit plus clairement.",
    viewFullProfile: "Voir le profil complet",
  },

  library: {
    title: "Bibliothèque",
    subtitle: "Tous les profils que tu as analysés.",
    emptyTitle: "Aucune analyse pour l'instant",
    emptyBody: "Analyse un profil pour commencer ta bibliothèque.",
    loadFailed: "Blink n'a pas pu charger tes analyses. Vérifie ta connexion et réessaie.",
    yours: "Ton profil",
    others: "Les autres",
    // "Autre", not "Quelqu'un d'autre": the chip sits beside the handle, and
    // the long form pushed "@mysteryguy" down to "@myster…" — truncating the
    // one thing on the row that identifies it. Matches the "Les autres" tab.
    someoneElse: "Autre",
    noneWithFilter: "Rien ici avec ce filtre.",
  },

  ranksPage: {
    title: "Classement",
    subtitle: "Classé selon l'optimisation du profil. Pas selon les abonnés.",
    addSomeone: "Ajouter quelqu'un",
    tabStandings: "Classement",
    tabWinners: "Vainqueurs",
    tabAnalyzed: "Analysés",
    all: "Tous",
    emptyAnalyzedTitle: "Aucun profil analysé",
    emptyCategoryTitle: "Rien dans cette catégorie",
    emptyCategoryBody: "Aucun des profils que tu as analysés ne correspond à cet archétype.",
    uncategorized: "Sans catégorie",
    privateRow: "Privé",
    scans: "analyses",
    suggested: "Suggérés — pas encore analysés",
    notAnalyzedYet: "Pas encore analysé",
    privateNote:
      "Toi seul peux les voir. Chaque score ici, c'est ta lecture d'une seule capture — pas le score publié par la personne — donc quelqu'un peut apparaître sur les deux classements avec des chiffres différents. Analyser un profil n'ajoute jamais personne au classement public.",
    you: "Toi",
    unranked: "Non classé",
    analyzedEmptyBody: "Analyse le profil de quelqu'un et il apparaîtra ici — visible uniquement par toi.",
    yourPosition: "Ta position",
    noMovement: "Aucun mouvement enregistré",
    heldPosition: "Position conservée",
    movedUp: "{n} place(s) gagnée(s) depuis le dernier relevé",
    movedDown: "{n} place(s) perdue(s) depuis le dernier relevé",
    launchTitle: "Le classement se remplit encore",
    launchTitleCategory: "Personne n'est classé en {category} pour l'instant",
    launchBody:
      "Blink ne classe que des profils réels et vérifiés — le classement démarre donc vide plutôt qu'avec des noms fictifs.",
    launchStep1: "Analyse ton propre profil pour obtenir un Blink Score.",
    launchStep2: "Active la visibilité au classement dans ton profil.",
    launchStep3: "Améliore, renvoie une capture, et monte à mesure que c'est vérifié.",
    noWinnersTitle: "Pas encore de vainqueurs",
    noWinnersBody:
      "Chaque semaine, Blink couronne la plus forte progression vérifiée au général et dans chaque catégorie. Les premiers résultats arrivent après une semaine complète d'analyses.",
    fairness:
      "Blink classe l'optimisation et la perception d'un profil — jamais le nombre d'abonnés, la portée ou la notoriété. Un compte de 200 abonnés peut devancer une célébrité si son profil se lit plus clairement. Les positions ne bougent que sur une analyse vérifiée d'une nouvelle capture : ouvrir l'app ne fait pas monter le score.",
    score: "score",
    weekOf: "Semaine du",
    overallWinner: "Vainqueur général",
    categoryWinner: "Vainqueur {category}",

  },

  profilePage: {
    title: "Profil",
    settings: "Réglages",
    noVerifiedTitle: "Aucune analyse vérifiée",
    noVerifiedBody:
      "Envoie une capture de ton propre profil Instagram — celle où apparaît Modifier le profil — pour obtenir ton premier Blink Score.",
    editProfile: "Modifier le profil",
    editDialog: "Modifier ton profil",
    checkFields: "Vérifie les champs ci-dessus.",
    global: "Général",
    verified: "Vérifiées",
    edit: "Modifier",
    yourInstagram: "Ton Instagram",
    viewInstagram: "Voir sur Instagram",
    statusMine: "Statut",
    statusTheirs: "Statut détenu",
    recordMine: "Ton palmarès",
    recordTheirs: "Palmarès",
  },

  onboarding: {
    title: "Configure ton profil",
    nameQ: "On t'appelle comment ?",
    nameHint: "Affiché sur ton profil public et au classement.",
    handleQ: "C'est quoi ton Instagram ?",
    handleHint: "Pour qu'on voie que c'est bien toi.",
    linkQ: "Lier ton profil ?",
    linkHint: "Ajoute un bouton Voir Instagram. Tu peux passer.",
    countryQ: "Tu viens d'où ?",
    countryHint: "Affiché en drapeau à côté de ton nom.",
    photoQ: "Ajouter une photo ?",
    photoHint: "Facultatif — sinon on utilise ton initiale.",
    boardQ: "Rejoindre le classement ?",
    boardHint: "Tu peux changer d'avis à tout moment dans ton profil.",
    needName: "Ajoute un nom pour qu'on sache qui on regarde.",
    needHandle: "Ajoute ton pseudo Instagram.",
    checkAnswers: "Vérifie tes réponses.",
    finish: "Terminer",
    continue: "Continuer",
    skip: "Passer",
  },

  addSomeone: {
    title: "Ajouter quelqu'un",
    dialogTitle: "Ajouter quelqu'un au classement",
    blurb:
      "Suggère un profil pour le classement. Ça ne lance aucune analyse et ça n'affecte pas ton score.",
    categoryLabel: "Quel classement ?",
    // Neutral on purpose: "Pourquoi lui" would assume the person's gender.
    whyThem: "Pourquoi ce profil",
    handlePlaceholder: "pseudo",
    readFromScreenshot: "Lu sur ta capture",
    notImage: "Ce fichier n'est pas une image que Blink peut lire. PNG, JPG ou WebP.",
    notHandle: "Ça ne ressemble pas à un pseudo Instagram.",
    notePlaceholder: "Sa grille est dingue",
    adding: "Ajout…",
    submit: "Ajouter au classement",
    reading: "Lecture du pseudo…",
    screenshotAdded: "Capture ajoutée",
    addScreenshot: "Ajouter une capture",
    lookingForHandle: "Recherche du @ dans l'image",
    tapToChange: "Touche pour en choisir une autre",
    screenshotHint: "Facultatif — on essaiera d'y lire le pseudo",
    already: "Déjà ajouté",
    alreadyBody: "{handle} est déjà sur ton classement.",
    added: "Ajouté à ton classement",
    addedBody: "{handle} est sur ton classement. Toi seul peux le voir.",
    notSaved:
      "Blink n'a pas pu enregistrer. Le classement n'est pas encore configuré, donc rien n'a été ajouté — réessaie plus tard.",
  },

  identity: {
    uploading: "Envoi…",
    changePicture: "Changer la photo",
    addPicture: "Ajouter une photo",
    pictureHint: "Facultatif. Affichée au classement.",
    displayName: "Nom affiché",
    yourName: "Ton nom",
    instagramUsername: "Pseudo Instagram",
    instagramLink: "Lien Instagram",
    country: "Pays",
    publicOn: "Ton profil est public",
    publicOff: "Toi seul vois ton score",
  },

  share: {
    title: "Partager ton résultat",
    dialogTitle: "Partager ton résultat Blink",
    buildFailed: "Blink n'a pas pu créer la carte. Réessaie.",
    shareTitle: "Mon résultat Blink",
    shared: "Partagé",
    unavailable: "Le partage n'est pas disponible ici — essaie de télécharger.",
    saved: "Enregistré",
    saveFailed: "Blink n'a pas pu enregistrer la carte. Réessaie.",
    saveImage: "Enregistrer l'image",
  },

  climbPaths: {
    tracks: {
      perception: "Améliorer la perception",
      momentum: "Créer de l'élan",
      recognition: "Gagner en reconnaissance",
    },
    standing: {
      noScore: "Analyse ton propre profil pour avoir un score et une position.",
      unranked: "Tu es à {score}. Active la visibilité sur le classement pour prendre une position.",
      climbing: "Tu es à {score}, rang #{rank}, et tu montes.",
      falling: "Tu es à {score}, rang #{rank}. Ton élan est devenu négatif.",
      steady: "Tu es à {score}, rang #{rank}.",
    },
    identity: {
      kind: "Ton identité",
      title: "Assume ton côté {label}",
      titleUnknown: "Assume ce que tu es déjà",
      whatToTry:
        "Blink te lit comme {label}. Poste deux ou trois contenus de plus dans le traitement qui va déjà dans ce sens — même palette, même cadrage, même énergie. Tu ne pars pas dans une nouvelle direction, tu rends celle qui existe indiscutable.",
      whatToTryUnknown:
        "Prends les trois posts qui te ressemblent le plus et fais en sorte que les suivants aient leur place à côté. Pas une nouvelle direction — une version plus nette de celle que tu as déjà.",
      why:
        "{signal} est déjà ton signal le plus fort. Les signaux se renforcent : plus un profil est clair sur une chose, plus tous les autres axes montent, parce que rien ne se dispute l'interprétation.",
      whyUnknown:
        "La cohérence vaut un cinquième du score, et c'est l'axe qui tire les autres vers le haut. Un profil qui parle sans ambiguïté d'une seule chose se lit comme réfléchi plutôt qu'accumulé.",
      notNeeded: "Rien à changer sur ton profil actuel. Pas de nouvelle bio, pas de nouvelle photo, pas de nouvelle esthétique.",
      impact: "En général +0,3 à +0,7",
    },
    bodyOfWork: {
      kind: "Ton travail",
      title: "Étoffe le corpus",
      whatToTry:
        "Ajoute à la grille dans le traitement que tu utilises déjà — les Reels comptent. De la profondeur, pas de la variété : cinq posts de plus qui vont ensemble valent mieux que cinq qui tentent chacun autre chose.",
      why: "Une grille qui s'arrête tôt se lit comme abandonnée plutôt que curatée. C'est le volume dans une seule direction qui transforme un style constant en corpus, et c'est ce qui fait monter Identité visuelle et Esthétique ensemble.",
      notNeeded: "Un nouveau style. Ce chemin parle justement de faire plus de la même chose.",
      impact: "En général +0,2 à +0,6",
    },
    lane: {
      kind: "Ton terrain",
      title: "Joue dans la catégorie {label}",
      titleUnknown: "Joue dans ta catégorie",
      whatToTry:
        "Le classement global mélange tous les types de profils. {label} est un terrain bien plus petit, et c'est celui où tes signaux sont réellement comparables. Garde ta catégorie lisible et ta position y bougera plus vite que ton rang global.",
      whatToTryUnknown:
        "Les catégories sont des classements plus petits où tes signaux sont comparés à des profils qui font la même chose. Plus ta catégorie se lit clairement, plus ta position devient parlante — et gagnable.",
      why: "Le rang de catégorie est calculé à partir du même score sur un terrain plus étroit : la même amélioration te fait donc gagner plus de places. C'est aussi comme ça que les gagnants de la semaine sont choisis.",
      notNeeded: "Changer le type de compte que tu tiens pour viser une catégorie plus facile.",
      impact: "Fait bouger ton rang de catégorie le plus vite",
    },
    verify: {
      kind: "Entretien",
      title: "Fais revérifier ce que tu as déjà changé",
      whatToTry:
        "Envoie une nouvelle capture après chaque vrai changement. Blink relit le profil et le nouveau score remplace l'ancien.",
      why: "Rien ne bouge ton rang tant que ce n'est pas vérifié. Les changements que tu as déjà faits ne valent rien pour le classement tant qu'une nouvelle capture ne les prouve pas.",
      notNeeded: "D'autres changements — il s'agit d'encaisser ceux que tu as déjà faits.",
      impact: "Débloque tous les autres chemins",
    },
    streak: {
      kind: "Entretien",
      title: "Montre-toi chaque semaine",
      whatToTry: "Une analyse vérifiée par semaine garde ta série en vie. Un seul envoi suffit.",
      why: "Les séries enregistrent une attention continue, et un profil actif garde sa position pendant que les profils dormants reculent à mesure que les autres progressent.",
      notNeeded: "Poster selon un calendrier. Il s'agit d'analyser, pas de performer.",
      impact: "Protège ton rang",
    },
    momentum: {
      kind: "Élan",
      title: "Repasse en élan positif",
      whatToTry:
        "L'élan, c'est l'écart entre tes deux dernières analyses vérifiées. Fais un changement concret — n'importe lequel des chemins ici — et renvoie une capture pour l'inverser.",
      why: "L'élan est ce qui départage des profils au score voisin, et c'est le signal sur lequel les gagnants de la semaine sont choisis : la plus grosse progression vérifiée, pas le score le plus haut.",
      notNeeded: "Un gros changement. Le plus petit changement réel compte quand même.",
      impact: "Départage les positions serrées",
    },
    perception: {
      kind: "Facultatif",
      title: "Affûte les trois premières secondes",
      whatToTry:
        "Si quelqu'un qui arrive sans contexte ne comprend pas de quoi parle le compte, les correctifs les plus rapides sont le champ nom, la première ligne de la bio, et les couvertures de stories à la une dans ta palette actuelle. Prends-en un, ou aucun.",
      why: "La clarté vaut un dixième du score et c'est l'axe le plus souvent laissé de côté. Mais l'opacité assumée est une stratégie valable — si être difficile à lire est le but, ce chemin n'est pas pour toi.",
      notNeeded: "Ta photo de profil, ton esthétique, ou la façon dont tu te présentes déjà.",
      impact: "En général +0,1 à +0,3",
    },
  },

  climb: {
    title: "Comment monter",
    startHere: "Commence ici",
    readOff: "Lu sur ta capture",
    body:
      "Blink a vu ça sur ton dernier envoi. Fais le changement, envoie une nouvelle capture, et ça compte pour ton rang.",
    whyThisHelps: "Pourquoi ça aide.",
    noNeedToChange: "Tu n'as pas besoin de changer.",
    noRedesign:
      "Tu n'as jamais besoin de refaire ton profil pour monter. La profondeur, la constance et le fait de rester actif font monter le score tout seuls.",
    uploadNew: "Envoyer une nouvelle capture",
  },

  detail: {
    title: "Analyse",
    shareThis: "Partager ce résultat",
    share: "Partager",
    notFoundTitle: "Analyse introuvable",
    notFoundBody: "Elle a peut-être été supprimée, ou elle appartient à un autre compte.",
  },

  publicProfile: {
    aPublicProfile: "Un profil public Blink.",
    tryIt: "Essayer",
    notAvailableTitle: "Profil indisponible",
    notAvailableBody: "Ce profil est privé, ou il n'est pas encore au classement.",
    backToRanks: "Retour au classement",
    anonymous: "Anonyme",
  },

  categories: {
    larp: { label: "Larp", blurb: "Statut élevé, volontairement discret. Signale la richesse sans jamais l'expliquer." },
    creator: { label: "Créateur", blurb: "Construit autour d'une audience. Le contenu est le sujet." },
    entrepreneur: { label: "Entrepreneur", blurb: "Construit quelque chose, et le dit. Crédibilité plutôt que mystère." },
    artist: { label: "Artiste", blurb: "L'œuvre parle en premier. L'identité vient après." },
    fitness: { label: "Fitness", blurb: "L'entraînement et la progression comme langage visuel." },
    fashion: { label: "Mode", blurb: "Le style et le goût font passer le message." },
    lifestyle: { label: "Lifestyle", blurb: "Une vie présentée comme une esthétique cohérente." },
    personal: { label: "Personnel", blurb: "Un compte ordinaire, pas fait pour une audience." },
  },

  tiers: {
    unread: { label: "Illisible", meaning: "Le profil n'a pas encore décidé ce qu'il raconte." },
    emerging: { label: "Émergent", meaning: "Une direction se dessine, mais elle manque de constance." },
    defined: { label: "Défini", meaning: "L'impression est claire et tient debout." },
    sharp: { label: "Net", meaning: "Assumé. Chaque élément tire dans le même sens." },
    magnetic: { label: "Magnétique", meaning: "Se lit comme intentionnel en quelques secondes." },
    iconic: { label: "Iconique", meaning: "Rien n'est laissé au hasard. L'impression est unique." },
  },

  badges: {
    elite: "Élite",
    topten: "Top 10",
    rising: "En hausse",
    bestRank: "Meilleur rang",
    peakScore: "Score record",
    movement: "Progression",
    momentum: "Élan",
    streak: "Série",
    verified: "Vérifiées",
    claimedProfile: "Profil revendiqué",
    noChange: "Aucun changement",
    sinceLast: "depuis la dernière mise à jour",
    weeks: " sem.",
    icon: "Icône",
    details: {
      champion:
        "Premier en {category}. Conservé tant que personne de la catégorie ne fait mieux.",
      elite: "Top trois du classement général — toutes catégories, toutes tailles de compte.",
      topten: "Top dix du classement général.",
      rising: "Au moins trois places gagnées depuis le dernier relevé.",
      best:
        "La meilleure position que {whose} profil ait tenue. Elle ne redescend jamais, même quand le rang actuel baisse.",
      peak: "Le meilleur Blink Score vérifié que {whose} profil ait atteint.",
      movement: "Places gagnées ou perdues au classement général depuis le dernier relevé.",
      movementNone: "Places gagnées ou perdues depuis le dernier relevé. Rien d'enregistré pour l'instant.",
      momentum:
        "Points gagnés ou perdus depuis l'analyse vérifiée précédente. Seule une nouvelle capture le fait bouger.",
      streak: "Semaines consécutives avec une analyse vérifiée. Ouvrir l'app ne compte pas.",
      verified: "Changements de profil que Blink a confirmés à partir d'une nouvelle capture.",
      mine: "ton",
      theirs: "son",
    },
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

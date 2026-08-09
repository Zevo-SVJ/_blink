export type Tone = "sky" | "navy" | "rose" | "amber" | "green" | "red" | "neutral";

export interface Perception {
  id: string;
  title: string;
  emoji: string;
  quote: string;
  tags: string[];
  tone: Tone;
  score: number;
  traits: string[];
}

export const PERCEPTIONS: Perception[] = [
  {
    id: "crush",
    title: "How your crush sees you",
    emoji: "❤️",
    quote: "They look intentional. Not trying too hard, but definitely not trying nothing.",
    tags: ["Confident", "Mysterious", "High-status"],
    tone: "sky",
    score: 8.7,
    traits: ["Confident", "Mysterious", "High-status"],
  },
  {
    id: "stranger",
    title: "How a stranger sees you",
    emoji: "👀",
    quote: "In 3 seconds you look like someone who has their life together. That's rare.",
    tags: ["Curious", "Trustworthy", "Polished"],
    tone: "navy",
    score: 8.2,
    traits: ["Curious", "Trustworthy", "Polished"],
  },
  {
    id: "friends",
    title: "How your friends see you",
    emoji: "🤝",
    quote: "Same person, but online they look way more put-together than they admit.",
    tags: ["Loyal", "Funny", "Low-key"],
    tone: "green",
    score: 8.9,
    traits: ["Loyal", "Funny", "Low-key"],
  },
  {
    id: "recruiter",
    title: "How a recruiter sees you",
    emoji: "💼",
    quote: "Professional without being boring. This profile signals attention to detail.",
    tags: ["Competent", "Clear", "Credible"],
    tone: "sky",
    score: 8.4,
    traits: ["Competent", "Clear", "Credible"],
  },
  {
    id: "green-flag",
    title: "Your biggest green flag",
    emoji: "🟢",
    quote: "Nothing here screams desperate. That's a green flag in 2026.",
    tags: ["Secure", "Authentic", "Balanced"],
    tone: "green",
    score: 8.8,
    traits: ["Secure", "Authentic", "Balanced"],
  },
  {
    id: "red-flag",
    title: "Your biggest red flag",
    emoji: "🚩",
    quote: "Everything is almost too polished. Some people read that as 'hard to read'.",
    tags: ["Distant", "Elusive", "Curated"],
    tone: "red",
    score: 6.2,
    traits: ["Distant", "Elusive", "Curated"],
  },
];

/**
 * A reaction to Blink, as it would appear in a feed.
 *
 * The identity fields are deliberately loose. An earlier version stored one
 * string shaped `"mia.s., 21"` and rendered it as `@mia.s., 21`, so every
 * reaction had the same silhouette — which is exactly what a generated
 * testimonial wall looks like. Handle and age are separate now, age is
 * optional, and the handles use the range of formats people actually pick.
 */
export interface Testimonial {
  id: string;
  /** Rendered after an `@`. Lowercase, social-media style. */
  handle: string;
  /** Shown beside the handle when present. Plenty of accounts don't. */
  age?: number;
  initial: string;
  text: string;
  likes?: number;
  /** Hue for the avatar gradient, so the row reads as different people. */
  hue: number;
}

/**
 * Thirty-four reactions, all distinct.
 *
 * The marquee shows several at once and loops forever, so repetition is the
 * failure mode: two similar lines passing together is what makes a stream read
 * as filler. They vary in length (three words to a full sentence), in register
 * (delighted, defensive, sceptical, deadpan), and in what they react to — the
 * score, the crush lens, the red flag, the leaderboard, running it on someone
 * else.
 */
export const TESTIMONIALS: Testimonial[] = [
  { id: "1", handle: "mia.s", age: 21, initial: "M", text: "nah this is actually accurate 😭", likes: 1243, hue: 200 },
  { id: "2", handle: "jordxn", age: 23, initial: "J", text: "bro HOW did it know 💀", likes: 892, hue: 20 },
  { id: "3", handle: "sof", age: 22, initial: "S", text: "ok the crush one is crazy", likes: 567, hue: 320 },
  { id: "4", handle: "notdre", initial: "D", text: "waitttt", likes: 210, hue: 160 },
  { id: "5", handle: "leah.jpg", age: 24, initial: "L", text: "mine said mysterious and my gf said thats literally just me being shy 😭", likes: 1456, hue: 260 },
  { id: "6", handle: "nate_wtf", age: 22, initial: "N", text: "8.7 is crazy generous lmao", likes: 743, hue: 40 },
  { id: "7", handle: "ellaaa", age: 19, initial: "E", text: "this actually made me change my pfp", likes: 1120, hue: 300 },
  { id: "8", handle: "ry", initial: "R", text: "nah run yours rn", likes: 430, hue: 180 },
  { id: "9", handle: "tashaaa.b", age: 21, initial: "T", text: "the recruiter perspective hit different... i need to fix my bio", likes: 987, hue: 340 },
  { id: "10", handle: "josh4x", age: 20, initial: "J", text: "i thought it would be cringe but its weirdly motivating", likes: 654, hue: 80 },
  { id: "11", handle: "ava", initial: "A", text: "lowkey changed how i post", likes: 521, hue: 240 },
  { id: "12", handle: "marc.exe", age: 24, initial: "M", text: "sent this to my friends and now they wont stop roasting me", likes: 1102, hue: 120 },
  { id: "13", handle: "kenny.h", age: 23, initial: "K", text: "my red flag was 'too curated' ... fair", likes: 789, hue: 60 },
  { id: "14", handle: "zoeee", age: 20, initial: "Z", text: "why is the stranger one always right??", likes: 1345, hue: 280 },
  { id: "15", handle: "dyl", initial: "D", text: "bruh", likes: 67, hue: 10 },
  { id: "16", handle: "chlo.e", age: 19, initial: "C", text: "i got 8.4 and ive never been more confident in my life", likes: 920, hue: 220 },
  { id: "17", handle: "lucasm", age: 25, initial: "L", text: "gonna pretend i didnt see my crush perspective ty", likes: 1567, hue: 50 },
  { id: "18", handle: "hannahhh", age: 21, initial: "H", text: "the green flag thing was actually sweet 🥹", likes: 1104, hue: 330 },
  { id: "19", handle: "eli._", initial: "E", text: "no way it caught that", likes: 340, hue: 140 },
  { id: "20", handle: "rubyy", age: 23, initial: "R", text: "skeptical at first ngl but its lowkey valid", likes: 876, hue: 20 },
  { id: "21", handle: "sam.b", age: 21, initial: "S", text: "ran my ex for research purposes", likes: 2040, hue: 200 },
  { id: "22", handle: "ivy", age: 22, initial: "I", text: "blink is just publicly acceptable astrology", likes: 1890, hue: 90 },
  { id: "23", handle: "noah.k", age: 24, initial: "N", text: "my friends said mine was too accurate to be funny", likes: 632, hue: 170 },
  { id: "24", handle: "mayaaa", age: 19, initial: "M", text: "8.2?? id take that to my therapist", likes: 412, hue: 310 },
  { id: "25", handle: "carter_", age: 23, initial: "C", text: "way more useful than any ig analytics tool", likes: 703, hue: 70 },
  { id: "26", handle: "piper.mp3", age: 20, initial: "P", text: "opened this before i even finished reading the page", likes: 555, hue: 250 },
  { id: "27", handle: "jakey", age: 22, initial: "J", text: "now i cant stop analyzing everyone elses profile", likes: 999, hue: 30 },
  { id: "28", handle: "lilyxo", age: 21, initial: "L", text: "the 'stranger' test is lowkey brutal but fair", likes: 844, hue: 350 },
  { id: "29", handle: "benj", age: 25, initial: "B", text: "how did it know i was mysterious im literally an open book", likes: 1203, hue: 110 },
  { id: "30", handle: "nina.raw", age: 22, initial: "N", text: "the only thing thats made me update my highlights in 2 years", likes: 1301, hue: 190 },
  { id: "31", handle: "omar", initial: "O", text: "i have 300 followers and im above someone with 90k. im never recovering", likes: 1720, hue: 145 },
  { id: "32", handle: "prii.ya", age: 20, initial: "P", text: "showed my mum. she agreed with the red flag. devastating", likes: 1388, hue: 295 },
  { id: "33", handle: "t0m", initial: "T", text: "genuinely thought it was gonna say something nice", likes: 611, hue: 15 },
  { id: "34", handle: "yasmin.k", age: 24, initial: "Y", text: "did not expect a screenshot to read me like that", likes: 1045, hue: 265 },
];

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const FAQS: FAQ[] = [
  {
    id: "what-is-blink",
    question: "What is Blink?",
    answer:
      "Blink reads your Instagram profile the way a person would and tells you the first impression it actually makes — to a stranger, a crush, a recruiter, your friends.",
  },
  {
    id: "how-analyze",
    question: "How does Blink analyze my profile?",
    answer:
      "You upload a screenshot of your profile. Blink looks at what anyone visiting would see — profile picture, name, bio, and the pattern of your grid — and interprets those signals together, not as a checklist.",
  },
  {
    id: "connect-account",
    question: "Do I need to connect my Instagram account?",
    answer:
      "No. There is no login, no password, and no permissions to grant. A screenshot is all Blink needs, which also means it works on private accounts.",
  },
  {
    id: "data-storage",
    question: "Does Blink store my Instagram data?",
    answer:
      "Your screenshot is used to produce your result and is not kept. Blink saves your results so you can revisit them, and never posts anything or sells your data.",
  },
  {
    id: "recommendations",
    question: "Can Blink tell me what to change?",
    answer:
      "Yes. Alongside the impression you make, Blink suggests small, specific shifts that move your profile closer to how you want to be read.",
  },
  {
    id: "free",
    question: "Is Blink free?",
    answer:
      "Your first impression is free. Deeper perspectives and improvement tools come with a premium plan.",
  },
];

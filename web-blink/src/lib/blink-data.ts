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

export interface Testimonial {
  id: string;
  handle: string;
  initial: string;
  text: string;
  likes?: number;
  hue: number;
}

export const TESTIMONIALS: Testimonial[] = [
  { id: "1", handle: "mia.s., 21", initial: "M", text: "nah this is actually accurate 😭", likes: 1243, hue: 200 },
  { id: "2", handle: "jordxn, 23", initial: "J", text: "bro HOW did it know 💀", likes: 892, hue: 20 },
  { id: "3", handle: "sof, 22", initial: "S", text: "ok the crush one is crazy", likes: 567, hue: 320 },
  { id: "4", handle: "dre, 20", initial: "D", text: "waitttt", likes: 210, hue: 160 },
  { id: "5", handle: "leah, 24", initial: "L", text: "mine said mysterious and my gf said thats literally just me being shy 😭", likes: 1456, hue: 260 },
  { id: "6", handle: "nate, 22", initial: "N", text: "8.7 is crazy generous lmao", likes: 743, hue: 40 },
  { id: "7", handle: "ella, 19", initial: "E", text: "this actually made me change my pfp", likes: 1120, hue: 300 },
  { id: "8", handle: "ryan, 25", initial: "R", text: "nah run yours rn", likes: 430, hue: 180 },
  { id: "9", handle: "tasha, 21", initial: "T", text: "the recruiter perspective hit different... i need to fix my bio", likes: 987, hue: 340 },
  { id: "10", handle: "josh, 20", initial: "J", text: "i thought it would be cringe but its weirdly motivating", likes: 654, hue: 80 },
  { id: "11", handle: "ava, 22", initial: "A", text: "lowkey changed how i post", likes: 521, hue: 240 },
  { id: "12", handle: "marc, 24", initial: "M", text: "sent this to my friends and now they wont stop roasting me", likes: 1102, hue: 120 },
  { id: "13", handle: "ken, 23", initial: "K", text: "my red flag was 'too curated' ... fair", likes: 789, hue: 60 },
  { id: "14", handle: "zoe, 20", initial: "Z", text: "why is the stranger one always right??", likes: 1345, hue: 280 },
  { id: "15", handle: "dylan, 22", initial: "D", text: "bruh", likes: 67, hue: 10 },
  { id: "16", handle: "chloe, 19", initial: "C", text: "i got 8.4 and ive never been more confident in my life", likes: 920, hue: 220 },
  { id: "17", handle: "lucas, 25", initial: "L", text: "gonna pretend i didnt see my crush perspective ty", likes: 1567, hue: 50 },
  { id: "18", handle: "hannah, 21", initial: "H", text: "the green flag thing was actually sweet 🥹", likes: 1104, hue: 330 },
  { id: "19", handle: "eli, 20", initial: "E", text: "no way it caught that", likes: 340, hue: 140 },
  { id: "20", handle: "ruby, 23", initial: "R", text: "skeptical at first ngl but its lowkey valid", likes: 876, hue: 20 },
  { id: "21", handle: "sam, 21", initial: "S", text: "ran my ex for research purposes", likes: 2040, hue: 200 },
  { id: "22", handle: "ivy, 22", initial: "I", text: "blink is just publicly acceptable astrology", likes: 1890, hue: 90 },
  { id: "23", handle: "noah, 24", initial: "N", text: "my friends said mine was too accurate to be funny", likes: 632, hue: 170 },
  { id: "24", handle: "maya, 19", initial: "M", text: "8.2?? id take that to my therapist", likes: 412, hue: 310 },
  { id: "25", handle: "carter, 23", initial: "C", text: "way more useful than any ig analytics tool", likes: 703, hue: 70 },
  { id: "26", handle: "piper, 20", initial: "P", text: "downloaded this app before i even finished reading", likes: 555, hue: 250 },
  { id: "27", handle: "jake, 22", initial: "J", text: "now i cant stop analyzing everyone elses profile", likes: 999, hue: 30 },
  { id: "28", handle: "lily, 21", initial: "L", text: "the 'stranger' test is lowkey brutal but fair", likes: 844, hue: 350 },
  { id: "29", handle: "ben, 25", initial: "B", text: "how did it know i was mysterious im literally an open book", likes: 1203, hue: 110 },
  { id: "30", handle: "nina, 22", initial: "N", text: "this is the only thing that has made me update my highlights in 2 years", likes: 1301, hue: 190 },
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
      "Blink analyzes how your Instagram presence comes across to different people — your crush, a stranger, a recruiter, your friends — and surfaces the first impression you actually make.",
  },
  {
    id: "how-analyze",
    question: "How does Blink analyze my Instagram?",
    answer:
      "We look at public signals on your profile: your bio, content patterns, highlights, profile picture, overall aesthetic, and how they work together. Then we interpret them in context, not as a checklist.",
  },
  {
    id: "judging",
    question: "Is Blink actually judging my profile?",
    answer:
      "Not in a 'good or bad' way. Blink is a mirror. It shows you how your profile is likely read by others. A minimal profile can signal confidence or distance depending on context.",
  },
  {
    id: "crush-perspective",
    question: "What does 'How your crush sees you' mean?",
    answer:
      "It means we simulate the impression your profile creates for someone evaluating you romantically — what signals feel attractive, mysterious, approachable, high-status, or uncertain.",
  },
  {
    id: "recommendations",
    question: "Can Blink tell me what I should change?",
    answer:
      "Yes. Based on your perception profile, Blink suggests small, intentional shifts that align your Instagram with how you want to be seen.",
  },
  {
    id: "connect-account",
    question: "Do I need to connect my Instagram account?",
    answer:
      "You can start by simply entering a public username. Optional deeper features will ask for a secure, read-only connection when you're ready.",
  },
  {
    id: "data-storage",
    question: "Does Blink store my Instagram data?",
    answer:
      "We only store what is necessary to show your results and improve your experience. We never sell your data or post on your behalf.",
  },
  {
    id: "private-account",
    question: "Can I use Blink if my account is private?",
    answer:
      "Some features require a public profile because they read public signals. If your account is private, you can connect it to analyze your own profile privately.",
  },
  {
    id: "free",
    question: "Is Blink free?",
    answer:
      "Blink has a free first impression preview. Full perspectives and improvement tools will be available with a premium plan when we launch.",
  },
];

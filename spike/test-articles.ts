/**
 * Diverse test article set for extraction quality evaluation.
 *
 * Selection criteria:
 * - 10+ articles across 6+ domains
 * - Mix of lengths: short (500w), medium (2000w), long (5000w+)
 * - Mix of styles: technical, argumentative, narrative, explanatory
 * - Real articles from real authors (not synthetic)
 */

export interface TestArticle {
  id: string;
  title: string;
  domain: string;
  style: string;
  expected_length: "short" | "medium" | "long";
  url: string;
  content?: string; // filled by fetcher
}

export const TEST_ARTICLES: TestArticle[] = [
  // === AI / Machine Learning ===
  {
    id: "ai-01",
    title: "Karpathy: Software 2.0",
    domain: "AI",
    style: "argumentative",
    expected_length: "medium",
    url: "https://karpathy.medium.com/software-2-0-a64152b37c35",
  },
  {
    id: "ai-02",
    title: "Scaling Laws for Neural Language Models (Kaplan et al.)",
    domain: "AI",
    style: "technical",
    expected_length: "long",
    url: "https://arxiv.org/html/2001.08361v1",
  },
  {
    id: "ai-03",
    title: "Simon Willison: Not all AI-assisted programming is vibe coding",
    domain: "AI/Programming",
    style: "argumentative",
    expected_length: "medium",
    url: "https://simonwillison.net/2025/Mar/19/vibe-coding/",
  },

  // === Cognitive Science / Philosophy ===
  {
    id: "cog-01",
    title: "Stanford Encyclopedia: Bayesian Epistemology",
    domain: "Philosophy",
    style: "explanatory",
    expected_length: "long",
    url: "https://plato.stanford.edu/entries/epistemology-bayesian/",
  },
  {
    id: "cog-02",
    title: "Farnam Street: Mental Models - The Best Way to Make Intelligent Decisions",
    domain: "Cognitive Science",
    style: "explanatory",
    expected_length: "medium",
    url: "https://fs.blog/mental-models/",
  },

  // === Economics / Strategy ===
  {
    id: "econ-01",
    title: "Paul Graham: How to Do Great Work",
    domain: "Strategy/Career",
    style: "argumentative",
    expected_length: "long",
    url: "https://paulgraham.com/greatwork.html",
  },
  {
    id: "econ-02",
    title: "Ben Thompson: The End of the Beginning",
    domain: "Business/Tech Strategy",
    style: "analytical",
    expected_length: "medium",
    url: "https://stratechery.com/2020/the-end-of-the-beginning/",
  },

  // === Biology / Neuroscience ===
  {
    id: "bio-01",
    title: "Quanta: The Brain Makes Sense of the World Through Compression",
    domain: "Neuroscience",
    style: "narrative/explanatory",
    expected_length: "medium",
    url: "https://www.quantamagazine.org/the-brain-makes-sense-of-the-world-through-compression-20250331/",
  },

  // === Design / Product ===
  {
    id: "design-01",
    title: "Dieter Rams: Ten Principles for Good Design",
    domain: "Design",
    style: "prescriptive",
    expected_length: "short",
    url: "https://www.vitsoe.com/us/about/good-design",
  },

  // === History / Social Science ===
  {
    id: "hist-01",
    title: "Wait But Why: The AI Revolution - The Road to Superintelligence",
    domain: "Technology/Society",
    style: "narrative",
    expected_length: "long",
    url: "https://waitbutwhy.com/2015/01/artificial-intelligence-revolution-1.html",
  },

  // === Software Engineering ===
  {
    id: "eng-01",
    title: "Martin Fowler: Is High Quality Software Worth the Cost?",
    domain: "Software Engineering",
    style: "argumentative",
    expected_length: "medium",
    url: "https://martinfowler.com/articles/is-quality-worth-cost.html",
  },

  // === Mathematics / Logic ===
  {
    id: "math-01",
    title: "3Blue1Brown: But what is a neural network? (transcript)",
    domain: "Mathematics",
    style: "explanatory",
    expected_length: "medium",
    url: "https://www.3blue1brown.com/lessons/neural-networks",
  },
];

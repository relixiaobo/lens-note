# Reading Should Not Be Consumption — It Should Be Compilation

*— Why I'm building Lens*

Date: 2026-04-09
Status: Draft v1 — needs review and polish before publishing

---

## 1. Last Week I Froze in Front of My Computer Again

I remember reading a paper two months ago — about how Transformer attention is mathematically equivalent to biological memory. That discovery excited me for days. I discussed it in two different AI sessions.

But when I tried to find it again last week —

- ChatGPT's history couldn't find it ("modern hopfield" returned zero results)
- Claude's chat log found a fragment, but the key formulas were missing
- My Obsidian vault had 3 related notes, none of which contained the core derivation
- Readwise had nothing (I didn't read it from there)
- Chrome bookmarks had 27 bookmarks starting with "attention"

It took me 25 minutes to piece that insight back together.

Then I realized: this wasn't the first time. This year I've re-researched the same topic at least **five times**. Each time taking half a day. Each time after chatting with AI, my understanding was **slightly deeper than the last time**, but that "slightly deeper" wasn't captured by any system. My AI starts from zero every time — the next time I open Claude, it still doesn't know what I've already figured out.

I tolerated this state of affairs for a year. This month I decided to stop and think clearly about **why**.

## 2. I'm Not Someone Who Can't Take Notes

Let me be clear upfront, so you don't think this is "someone else's problem."

I've used Notion (organizing projects), Obsidian (personal knowledge base), Roam Research (tried it for a few months), Tana (current side tool), Readwise (highlights from books and articles), Mem.ai (wanted to try AI auto-organization), Apple Notes (quick jottings). My "second brain" has 3000+ entries total.

But what's **actually in my head** is roughly a 3% distilled version of that.

The remaining 97% is dead weight. Stored. Not reused. Occasionally surfaced when searching. **Not participating in my current thinking**.

What frustrates me even more: I've spent a lot of money on AI this past year. I chat with AI 3-5 hours every day. But **AI has nothing to do with my note-taking system**:

- ChatGPT's memory is a black box, can't be exported, siloed in its own ecosystem
- Claude opens with no memory
- Claude Code has a memory system but it's only available to Claude Code
- Cursor had a memories feature, but removed it shortly after launching it

I have more and more AIs, **but they don't know each other, and none of them know me**.

The more I thought about it, the more absurd this situation seemed. A person pays several thousand dollars for 5 "intelligent assistants," and each assistant has to re-introduce themselves every morning. This is not a technology problem — it's **a product paradigm error**.

## 3. What's Wrong

The basic assumption of traditional note-taking tools is:

> You read → you save → you re-read later

This assumption is from 1995. Back then AI didn't exist, storage costs were high, and reading something once was precious. Saving the original text made sense because **the future consumer is another version of you**.

The 2025 reality is:

1. **You're not going to re-read those 3000 notes**. You know it, I know it, we all know it
2. **An LLM can process the original text faster than you**. You need 30 minutes to read a paper. Claude needs 8 seconds
3. **Your AI doesn't have access to your notes**. It's in one silo, your notes are in another silo
4. **Every AI tool is isolated from the others**. What you think about in ChatGPT can't get into Claude Code

Readwise did one thing right — it makes you review a few highlights every day, "fishing back" things you've read. But its essence is still "save the original + help you find it" — it doesn't **understand** what you've saved.

Obsidian / Notion / Tana did another thing right — they let you manually organize a knowledge graph. But they assume **you'll spend the time organizing**. Most people's (including mine) Obsidian vaults end up as a pile of orphan notes and a few half-finished MOCs.

Mem0, Letta, and similar "AI memory" products did a third thing — they have AI automatically extract facts from conversations. But Mem0 has a famous production audit (GitHub issue #4573) that found: out of 10,134 auto-extracted memories, **97.8% were garbage**. Including 808 duplicate "User prefers Vim" entries.

When I finished reading that issue, it hit me:

**What we're solving is not a storage problem — it's a compilation problem.**

## 4. Compilation Is Not a Metaphor

The word "compilation" is borrowed from programming, but it's very precise.

Code is written for humans to read; machines can't read it. A compiler translates code into instructions machines can execute. **Compilation happens when you finish writing the code, not every time you run it.**

The way today's "knowledge tools" treat information is like a language without a compiler. You write something down, save it, and every time you "run" it (query, think, discuss with AI), you have to re-parse it. Every time starting from raw text. No intermediate representation. No compounding.

**Andrej Karpathy wrote a gist last month called [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)**. His core argument is simple:

> Don't have AI patch together answers from raw documents at every query; instead, have it **continuously maintain a structured wiki**. Compile once, reuse many times.

When I read that gist I felt like I'd been struck by lightning — it crystallized a year of vague dissatisfaction. Karpathy wrote only 1500 words, provided no implementation, but he gave us the paradigm.

Then a few weeks later, I listened to **Mengyan's conversation with Li Jigang** on a podcast. Li Jigang is one of the most serious practitioners of "cognitive operation" engineering in the Chinese AI community. He described how he reads:

> Before, I would read first, consuming my brain's computing power. Now **the model reads first**, and I then decide whether to read the original.
>
> Reading is about collecting different **viewfinders**. Every person, every discipline has their own viewfinder. Truth is high-dimensional, and each viewfinder is just one projection of it. My goal is to collect as many viewfinders as possible.

Karpathy's "continuous compilation" and Li Jigang's "viewfinder collection" collided in my mind.

**They were saying the same thing.**

Karpathy says: don't store, compile. Li Jigang says: what compilation produces is not a summary — it's **a way of seeing the world**.

So I started thinking about a concrete question: **If I build a tool that takes raw materials (web pages, papers, conversations, PDFs) and compiles them into structured objects, what kind of objects would let me not start from zero the next time I open AI?**

I spent a month surveying the literature. I read 20+ papers on AI memory (MemGPT, HippoRAG, A-MEM, Titans, Mem0, Zep, CoALA), looked at 15+ existing products, deeply studied philosophy of science and cognitive science (Lakatos's research programmes, Popper's falsification cycle, Toulmin's argumentation model, Klein's data-frame theory), read every one of Li Jigang's 14 ljg-skills, and also reverse-engineered Claude Code 2.1's memory system along the way.

Then I wrote a 2000-line methodology document. Then I started building.

## 5. Lens

What I built is called **Lens**. The name comes from Li Jigang's "viewfinder" — a way of seeing the world.

**One-sentence positioning**:

> Lens compiles what you read into structured cognitive objects — Claims (falsifiable assertions), Frames (viewfinders), Questions (open questions) — organized into Programmes (research programmes), enabling both humans and AI to continue reasoning based on these structures.

Not saving the original text. Not making a summary. Not making a smarter note. It's **a compiler for understanding**.

### What It Looks Like

Lens's core is a local command-line tool:

```
$ lens ingest https://arxiv.org/abs/2008.02217
Compiling into Programme: "AI Memory Systems"...
✅ Added 5 claims, 1 frame, 2 questions
⚠️  1 contradiction detected: clm_006 vs clm_004
📈 Confidence updated: 3 existing claims (2 ↑, 1 ↓)

$ lens context "The relationship between Modern Hopfield and attention"

## Current Best Understanding
Modern Hopfield networks are mathematically equivalent to softmax attention
(Ramsauer et al. 2020, Bricken & Pehlevan 2021). LLMs already have a
biological-style associative memory mechanism built in.

## Related claims (confidence: high, 3 independent sources)
- clm_012: Attention retrieval = Hopfield energy minimization
- clm_018: SDM (Kanerva 1988) is the mathematical substrate
- clm_023: Vector DB is a crude approximation of this mechanism

## Related frame
- frm_007: "Biology-first AI architecture"
  (sees: neural computation primitives | ignores: symbolic AI legacy)

## Open questions
- q_015: If attention is already Hopfield, what's the role of external memory?
- q_022: Is Titans' neural long-term memory module a continuation of this direction?

## Sources
Ramsauer et al. 2020 (NeurIPS)
Bricken & Pehlevan 2021 (NeurIPS)
Kanerva 1988
```

This output is for both humans (terminal reading) and agents (`--json`). In Claude Code I just run `lens context "..."`, then have it continue thinking based on this context — what it gets is **already-compiled understanding**, not raw paper chunks.

**The key**: these claims, frames, and questions are not invented by Lens. They were extracted from original texts, cross-validated, deduplicated, and confidence-updated as I ingested multiple related materials over the past few weeks. **Now they belong to me**, decoupled from any AI service.

### Where the Data Lives

All on your local machine. Markdown files + SQLite index under the `~/.lens/` directory. No cloud, no accounts, no lock-in.

- You can open and view them directly with VSCode
- You can `cp -r ~/.lens /backup` to back up
- You can git init and version control
- You can grep to search
- For multi-device sync use **iCloud Drive** — put `~/.lens/` under the iCloud path, and Apple handles e2e encrypted sync to Mac / iPad / iPhone. Lens itself does not operate any sync servers

### 4 Entry Points

1. **CLI** (`lens ingest`, `lens context`, `lens show`, etc.) — the core
2. **Local Web App** (`lens serve` → `localhost:9999`) — visual browsing of Programmes, contradictions, question trees
3. **Browser Extension** — one-click compile while reading web pages, highlights become Excerpts while reading PDFs
4. **Agent Plugin** (MCP shim) — Claude Code / Cursor can call `lens.search` / `lens.context` through the `lens` tool

One set of local data, 4 access methods, shared between you and your AI.

## 6. Three Concrete Differences

To clarify how Lens differs from Notion / Readwise / Obsidian / Mem0, here are 3 specific scenarios:

### Scenario A: Contradictions Are Automatically Caught

In Week 3 you ingest Mem0's official documentation, which says "graph memory is 2% better than vector memory." In Week 5 you ingest Zep's blog post, which says "graph memory is 18.5% better than vector memory."

Any other tool would **silently** save both notes, unrelated to each other.

Lens detects the contradiction and automatically adds it to the anomaly queue. The next time you ask about "graph vs vector memory":

```
⚠️ 1 unresolved contradiction on this topic.
Source 1 (Mem0):  +2%
Source 2 (Zep):   +18.5%
Run `lens contradictions show anomaly_001` to review.
```

Then you can manually decide: are both right (different conditions)? Was one rebutted? Or create a synthesis claim ("graph is effective for multi-hop tasks, nearly useless for simple fact retrieval") to replace both?

This is not a feature. It's epistemic honesty. Mem0's 97.8% garbage rate exists precisely because it lacks this layer.

### Scenario B: Memory Continuity Across AIs

You discuss "CLS theory and its relationship to LLMs" in ChatGPT and extract several key insights. Two weeks later you open Claude Code for a coding task.

Other tools: Claude Code knows nothing.

Lens: `lens context "CLS theory and LLMs"` returns the claims you marked in ChatGPT 2 weeks ago, the frames you had open at the time, and 3 open questions you raised but didn't answer. Claude Code continues the discussion on the foundation of these compiled structures.

**For the first time, one AI session continues another AI session** — not because some vendor locked in the memory, but because the memory belongs to you, stored on your local machine.

### Scenario C: Programme Health Monitoring

3 months later, your "AI Memory Systems" Programme has 30 Claims, 8 Frames, 15 Open Questions, and 5 Anomalies. You open Lens to see how this Programme is progressing:

```
$ lens programme health "AI Memory Systems"

Status: progressive ✓

Hard Core: 3 frames, stable for 45 days
Protective Belt: 27 claims (avg confidence: high)
Open Questions: 15 (6 new this month — progressive signal)
Anomalies: 3 unresolved, 2 resolved by synthesis

⚠️ Recommended: review anomaly_003 (stale 12 days)
```

Behind this output is **Lakatos's methodology of scientific research programmes** — the framework he wrote in *The Methodology of Scientific Research Programmes* in 1978, engineering-implemented for the first time in a daily-driver tool.

What you see is not a pile of notes — it's **a living map of your own thinking**: with a core, boundaries, progress, counterexamples, and health status. No existing product has ever delivered this kind of experience.

## 7. It's Not for Everyone

I have to be honest — Lens is not "AI-powered Notion." It won't make your life easier. It will make your **reading heavier**, but it will make **understanding actually stick**.

**Lens is for**:

- People who read papers / long-form / technical materials every day
- People doing long-term research (scholars, analysts, journalists, strategy workers)
- Technical users who heavily use AI agents
- People already using Obsidian / Tana / Roam but feel "something's missing"
- People who believe thinking can compound

**Lens is not for**:

- People who just want to jot down quick notes (Apple Notes is better)
- People who want AI to automatically organize everything without lifting a finger (that's Mem0's dead end)
- People unwilling to argue with their own notes (Lens will throw contradictions in your face)
- People hoping a product will think for them (Lens will only help you think deeper)

This is a tool that **requires your investment**. The more you invest, the greater the compounding returns. It doesn't pursue 1 million users — it pursues giving those who are **truly thinking seriously** a tool worthy of them.

## 8. Where I Borrowed From

Lens's design is not original. It's a synthesis — engineering several ideas that I believe are correct but have never been put together, into one product:

- **Andrej Karpathy's LLM Wiki paradigm** — continuous compilation beats ad-hoc retrieval
- **Li Jigang's cognitive operation set** — viewfinders, dimensionality reduction, roundtable, concept dissection, and other reusable thinking actions
- **Imre Lakatos's research programme structure** (1978) — Hard Core + Protective Belt + Open Questions + Anomalies
- **Frederick Reif's Hierarchical Knowledge Organization** (MIT Press 2010, Chapter 9) — knowledge organized in cluster hierarchies, 5 elaboration dimensions, overlapping clusters as a feature
- **Francis Miller's Multi-level Content** (2018, 91-page paper that is itself a multi-level demo) — 9 types of knowledge structures + Knowledge Maps as a visual necessity + 11 atomic zooming out operations
- **Karl Popper's P1→TT→EE→P2 cycle** — knowledge progress = problems being continuously replaced by deeper problems
- **Stephen Toulmin's argumentation model** (1958) — Claim = Data + Warrant + Qualifier + Rebuttal
- **Bayesian Epistemology** — traceable dynamic updating of confidence
- **Gary Klein's Data-Frame Theory of Sensemaking** (2006) — people understand data through frames, a model distilled from intelligence analysis and emergency medicine
- **McClelland's Complementary Learning Systems theory** (1995) — mathematical proof that fast and slow learning must be separated
- **Whittington's Tolman-Eichenbaum Machine** (Cell 2020) — proves that frames are first-class neural representations of relational structure
- **Ramsauer's Modern Hopfield Networks** (2020) — proves that Transformer attention = biological-style associative memory
- **Claude Code 2.1's memdir implementation** — I reverse-engineered its memory system and found that Anthropic engineers independently converged on the same architecture as me

The complete citation list (~120 entries) is in the repo's [references.md](./references.md).

**Every single entry can be traced back to a specific design decision**. Lens is not arbitrary — every field, every operation, every type can find its basis in one of the sources above.

This isn't for the sake of authority. It's so that I (and you) can go back to the original source and check "why is this the way it is" whenever any design decision is questioned.

## 9. Invitation

Lens is currently v0.1 alpha. I use it every day. The core CLI works, the local Web App can browse things ingested daily, and the browser extension is being written.

It's open source (repo link: TODO). Installation:

```bash
brew install lens        # macOS
npm i -g @lens/cli       # cross-platform
```

Or just star the repo and wait until I get the v0.2 browser extension done before trying it.

If you're the kind of person I described above, I **especially want** your feedback — not "bug reports," but your judgment after using it for a week on **whether it's actually useful**. Lens's ultimate form should be shaped by early users' real pain, not by my vision alone.

I'll be sharing progress on [Twitter / X link: TODO]. One devlog per week.

If you're the kind of person who'll spend 3 minutes reading this and then quietly close the tab — that's fine. Lens probably isn't for you.

But if you've read this far and want to keep going — it's probably for you.

---

## One Last Thing

From Karpathy I learned "continuous compilation beats ad-hoc retrieval." From Li Jigang I learned "collecting viewfinders beats accumulating facts." From Lakatos I learned "research programmes beat single theories." From Reif and Miller I learned "the same piece of knowledge should have multiple levels you can zoom through." From the Claude Code source code I learned "files are the source of truth."

But the one thing I ultimately learned is a simple judgment:

> **Reading should not be consumption. Reading should be compilation.**

Every time you read an article, it shouldn't just be "I've seen it" and then discarded. It should mean **one more structure in your cognitive system** — one that can be referenced, questioned, overturned, and inherited. This structure belongs to you, not to any SaaS. It's shared with your AI but not locked in by AI. It will create new connections between the articles you read, and will proactively remind you when you contradict yourself.

Lens is my first engineering attempt at this belief. If it resonates, give it a try. If it doesn't resonate, I hope this article at least made you think about "**how am I reading**."

— Xiaobo

---

## Post-launch TODO (Must be handled before publishing)

Things this draft still needs, by priority:

### Must Have

- [ ] **A hero image**: ideally a GIF or static image showing `lens ingest` terminal output + Programme visualization
- [ ] **3 demo videos/GIFs**: 20-30 seconds each for Scenario A (contradictions), Scenario B (cross-AI), Scenario C (Programme health)
- [ ] **Repo link and install commands**: v0.1 can start with a "Coming soon + email subscribe"
- [ ] **Author bio**: a paragraph introducing yourself, why trust you
- [ ] **Twitter / X handle**: for ongoing updates

### Strongly Recommended

- [ ] **A bilingual quote box with Li Jigang's podcast original words in Chinese and English**: so readers of both languages can resonate
- [ ] **One or two screenshots of the Claude Code 2.1 memdir reverse engineering**: to prove "independent convergence with Anthropic" isn't a bluff
- [ ] **A before/after comparison**: the chaos before ingest vs the Programme view after ingest

### Nice to Have

- [ ] **A FAQ at the end**: Why not SaaS? Why not MCP-first? Why not mobile? (3-sentence answers each)
- [ ] **An honest "what I was wrong about" admission**: e.g., I initially thought the basic-memory approach was enough, then realized it wasn't
- [ ] **A "why now" explanation**: the triple timing of LLM compilation capability maturing + agent ecosystem explosion + context window growth

### Publishing Channels

- [ ] Author's Substack / personal blog (first release)
- [ ] Hacker News (1-2 days after launch, not as Show HN)
- [ ] X/Twitter thread (10-12 excerpts + visuals)
- [ ] Sspai / v2ex (simultaneous Chinese-language first release)
- [ ] Send to 5-10 people you think will resonate and ask them to share
- [ ] **Don't** submit to Product Hunt (wrong audience)

---

## Writing Notes (For your review)

A few specific decisions I made — feel free to change them if you disagree:

1. **The title is "Reading Should Not Be Consumption — It Should Be Compilation"** — direct, oppositional, selectively attractive. But it might turn away readers looking for something easy. Alternative: "Why I'm Building a Compiler for Understanding" (safer but less sharp)

2. **Opens with a personal scenario rather than a manifesto** — easy to relate to but requires readers to be patient until Section 4 to see the thesis. Alternative: open with manifesto then add personal story

3. **Explicitly calls out Mem0 #4573's 97.8% garbage rate** — might be somewhat offensive to people working on Mem0, but this is the core evidence for the product direction difference; omitting it would lose the force

4. **Directly names "not for" audiences** — counterintuitive but will filter out wrong users. Whether early users are the right fit matters more than their number

5. **Heavy citations (Karpathy / Li Jigang / Lakatos / Popper / Toulmin / Klein / McClelland / Whittington / Ramsauer)** — will scare off readers who dislike academic content, but will strongly attract the "serious thinker" segment. This is intentional filtering

6. **No aggressive CTA** — doesn't say "download now" or "join the waitlist." This is actually alignment: not pursuing conversion but pursuing resonance

7. **Length approximately 4500 Chinese characters** — 10-15 minutes of reading. Too long and you'll lose readers, but too short and you can't convey the weight of the reframe. This is my judgment on the trade-off

If you think it's good, the main polish points are:
- Add your own specific experiences (a specific paper, a specific conversation) to make Scenario 1 more real
- Make "my" identity explicit (your background will affect credibility)
- Whether to keep all the source citations in Section 8 (could cut half and put them in the references link)
- Whether to include specific descriptions of screenshots / GIFs to give visual designers a clear brief

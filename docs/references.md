# Intellectual Sources and References for Lens Design

Date: 2026-04-08

This document collects all theories, research, and products referenced during the lens design process, organized by topic. Each entry includes a one-sentence explanation of its relationship to lens design.

All citations in `positioning.md` and `methodology.md` can be found here.

---

## I. Five Major Traditions Forming the Methodological Spine

These five are the core of the lens methodology; see [methodology.md](./methodology.md) for details.

### Lakatos — Research Programmes (Macro Structure)

- **Imre Lakatos**, *The Methodology of Scientific Research Programmes* (Cambridge UP, 1978)
  → Source of the Programme meta-structure: Hard Core + Protective Belt + Positive/Negative Heuristics + progressive/degenerative diagnostics
  → [Wiki](https://en.wikipedia.org/wiki/Imre_Lakatos)

### Reif + Miller — Hierarchical Detail Axis (Hierarchical Knowledge Organization)

- **Frederick Reif**, *Applying Cognitive Science to Education: Thinking and Learning in Scientific and Other Complex Domains* (MIT Press, 2010), Chapter 9 "Organizing Knowledge"
  → **The 5th pillar of the lens methodological spine**. Reif was a Carnegie Mellon physicist + cognitive scientist + education scholar whose second career focused on "how to effectively organize large amounts of knowledge"
  → Core contribution: **hierarchical knowledge organization** — knowledge organized in cluster hierarchies, with central/important elements at higher levels and subordinate knowledge at lower levels, connected bidirectionally through "elaboration"
  → **4 elaboration dimensions** (Miller later added a 5th):
     1. Big picture ↔ detail
     2. Important/core ↔ subsidiary
     3. Whole ↔ constituent parts
     4. General rules ↔ specific exceptions
  → **4 practical tips**: cluster size control, internal cluster organization, **overlapping clusters** (adjacent clusters can overlap, like a map including parts of neighboring states), cross-references
  → Contribution to lens: the `elaboration` field on Claims, Programme cluster design, "overlapping clusters" pointing to boundary claims design
  → [MIT Press](https://mitpress.mit.edu/9780262515146/)

- **Francis Miller**, *Organising Knowledge with Multi-level Content: Making knowledge easier to understand, remember and communicate* (v1.1, 2018)
  → 91-page complete paper, an application and extension of Reif's theory. The paper **itself is a demo of multi-level content** — with a 1-page overall summary + 10-page Part summaries + 80 pages of detailed text
  → **Extensions of Reif**:
     1. Added a 5th elaboration dimension: **wider context ↔ narrower focus**
     2. Defined **9 types of knowledge structures** (see below)
     3. Explicitly made **Knowledge Maps** (visual representation) a requirement rather than optional
     4. Presented **zooming in / zooming out** as the two fundamental operations for creating multi-level content
     5. Listed **11 atomic zooming out cognitive operations**: generalising, summarising, categorising, contextualising, systematising, comparing, simplifying, structuring, connecting, ranking, filtering
  → **9 types of knowledge structures** (source of lens's `structure_type` field):
     1. Taxonomy (classification)
     2. Causal explanation (causality)
     3. Description
     4. Timeline
     5. Argument / case (argumentation)
     6. Content structure
     7. Story (narrative)
     8. Process / sequence
     9. Relationships
  → Contribution to lens: `structure_type` field, Knowledge Maps as a first-class view in the Local Web App, 11 zooming out operations corresponding to lens compile operators
  → Primarily draws on Reif (MIT Press 2010) + Sweller's Cognitive Load Theory + Christopher Alexander's Pattern Theory
  → [PDF](https://www.francismiller.com/organising_knowledge_paper.pdf) · [Landing page](https://www.francismiller.com/organising-knowledge/)

### Popper — Falsificationist Cycle (Dynamics)

- **Karl Popper**, *Logik der Forschung* / *The Logic of Scientific Discovery* (1934/1959)
  → P1→TT→EE→P2 cycle: knowledge progress = problems being replaced by deeper problems
  → [Wiki](https://en.wikipedia.org/wiki/The_Logic_of_Scientific_Discovery)

- **Karl Popper**, *Objective Knowledge: An Evolutionary Approach* (Oxford UP, 1972)
  → Three Worlds theory: World 3 = objective knowledge itself. The objects compiled by lens are World 3 instances
  → [Wiki](https://en.wikipedia.org/wiki/Three_worlds_(Popper))

### Toulmin — Argumentation Model (Local Structure)

- **Stephen Toulmin**, *The Uses of Argument* (Cambridge UP, 1958)
  → Complete Toulmin structure for Claims: Claim + Data + Warrant + Backing + Qualifier + Rebuttal
  → Key insight: **Frame is Toulmin's Warrant** — the license of inference that pushes Data to Claim
  → [Cambridge](https://www.cambridge.org/core/books/uses-of-argument/26CF801BC12004587B66778297D5567C)

- **Douglas Walton, Chris Reed & Fabrizio Macagno**, *Argumentation Schemes* (Cambridge UP, 2008)
  → Extended Toulmin to 60+ argumentation schemas (Argument from Expert Opinion, from Cause to Effect, from Analogy, etc.), each with critical questions
  → [Cambridge](https://www.cambridge.org/core/books/argumentation-schemes/8E10A4C2F90A6E8F3B7C9A3B6E5B3A9F)

### Bayesian Epistemology (Confidence Dynamics)

- **Bayesian Epistemology** — Stanford Encyclopedia of Philosophy
  → Claim confidence is not a number; it is a traceable quantity updated by Bayes' rule
  → [SEP](https://plato.stanford.edu/entries/epistemology-bayesian/)

---

## II. Other Related Philosophy of Science and Epistemology

### Kuhn — Paradigms and Crisis

- **Thomas Kuhn**, *The Structure of Scientific Revolutions* (University of Chicago Press, 1962)
  → The model of anomaly accumulation → crisis → revolution
  → Lens's "Crisis Warning" mechanism is the engineering implementation of Kuhn
  → [Wiki](https://en.wikipedia.org/wiki/The_Structure_of_Scientific_Revolutions)

### Klein — Sensemaking (Data-Frame Theory)

- **Gary Klein, Brian Moon & Robert Hoffman**, "Making Sense of Sensemaking" *IEEE Intelligent Systems* (2006)
  → Data-Frame Theory: people understand data through frames; data either fits or breaks a frame
  → 6 sensemaking activities: notice / frame / reframe / question / elaborate / compare
  → Actually adopted in high-pressure decision environments such as intelligence analysis, emergency medicine, and military command
  → [IEEE](https://ieeexplore.ieee.org/document/1667948)

- **Karl Weick**, *Sensemaking in Organizations* (Sage, 1995)
  → Organizational sensemaking: understanding is constructed retrospectively, not predicted in advance
  → [Sage](https://us.sagepub.com/en-us/nam/sensemaking-in-organizations/book4988)

### Laudan — Problems as Units

- **Larry Laudan**, *Progress and its Problems* (UC Press, 1977)
  → The fundamental unit of science is not the theory, but the problem. A theory's quality is determined by how many problems it solves
  → Empirical problems / conceptual problems / anomalous problems
  → Directly supports lens making Question a central concept
  → [Wiki](https://en.wikipedia.org/wiki/Larry_Laudan)

### Platt — Strong Inference

- **John Platt**, "Strong Inference" *Science* 146:347-353 (1964)
  → Operationalized scientific method: list alternative hypotheses + design crucial experiment + eliminate + recurse
  → Lens Question's `alternative_hypotheses` field comes directly from this
  → [Science](https://www.science.org/doi/10.1126/science.146.3642.347)

### Other Related Epistemology

- **Edmund Gettier**, "Is Justified True Belief Knowledge?" *Analysis* 23:121-123 (1963)
  → Classic challenge to the three conditions of knowledge: JTB is not enough. Lens's `voice` field is an engineering response to Gettier's concern
  → [Analysis](https://www.jstor.org/stable/3326922)

- **W.V.O. Quine**, "Two Dogmas of Empiricism" (1951) + Quine & Ullian, *The Web of Belief* (1970)
  → Web of belief: beliefs form a web, there are no atomic beliefs. Modifying any one point ripples through the surrounding area
  → Lens's contradiction graph is the engineering implementation of this idea
  → [Wiki](https://en.wikipedia.org/wiki/Two_Dogmas_of_Empiricism)

- **Michael Polanyi**, *The Tacit Dimension* (1966)
  → "We know more than we can tell." A reminder for lens: not all understanding can be compiled into structured objects
  → [Wiki](https://en.wikipedia.org/wiki/Tacit_knowledge)

- **Charles Sanders Peirce** — Inference to the Best Explanation (IBE) / Abduction
  → Given evidence, infer the "best explanation" hypothesis. This is the cognitive action lens performs when extracting Claims during the compile stage
  → [SEP](https://plato.stanford.edu/entries/abduction/)

- **Daniel Kahneman** — Adversarial Collaboration
  → Researchers with opposing views pre-commit to a joint experiment, forcing epistemic honesty
  → Li Jigang's "roundtable" is the LLM version of this idea
  → [Edge.org](https://www.edge.org/conversation/daniel_kahneman-the-costs-of-collective-action)

- **Chris Argyris** — Double-Loop Learning
  → Single-loop learning adjusts actions; double-loop learning adjusts the mental model itself
  → Lens's Frame revision mechanism is the engineering implementation of double-loop learning
  → [Wiki](https://en.wikipedia.org/wiki/Double-loop_learning)

- **Ikujiro Nonaka** — SECI Model
  → The spiral between tacit and explicit knowledge (Socialization → Externalization → Combination → Internalization)
  → Lens's ingest → compile → review flow corresponds to Externalization + Combination
  → [Wiki](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)

### Systematic Evidence Synthesis Methodologies

- **Cochrane Collaboration** — Systematic Review Methodology
  → Standardized process for medical evidence synthesis: raw studies → quality assessment → meta-analysis → recommendation
  → Lens's evidence_independence tracking mechanism borrows from Cochrane's approach to handling "same primary data, different papers"
  → [Cochrane Handbook](https://training.cochrane.org/handbook)

- **PRISMA** — Page et al, "PRISMA 2020 Statement" *BMJ* (2021)
  → Reporting standards for systematic reviews. Suggests that lens's lineage operations should look in this direction in the future
  → [PRISMA](http://www.prisma-statement.org/)

- **Mons, Velterop, Schultes et al** — Nanopublications (2010+)
  → Decomposing scientific papers into minimally citable assertion + provenance units
  → Lens's Claim + Excerpt + provenance model is closest to the nanopub design philosophy
  → [nanopub.org](http://nanopub.org/)

---

## III. Cognitive Science: How the Human Brain Understands the World

See the research report on the "neuroscience/biomimicry" path in the conversation history for details.

### Dual-Speed Storage / Complementary Learning Systems

- **McClelland, McNaughton & O'Reilly** (1995), "Why there are complementary learning systems in the hippocampus and neocortex" *Psychological Review* 102:419-457
  → The foundational paper for CLS theory. Proves the mathematical conflict between fast and slow learning → two systems are necessary
  → This is the theoretical foundation for lens's "recent vs knowledge" dual-layer (though cut from v0)
  → [Stanford PDF](https://stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf)

- **Kumaran, Hassabis & McClelland** (2016), "What Learning Systems do Intelligent Agents Need? Complementary Learning Systems Theory Updated" *Trends in Cognitive Sciences*
  → Modern update of CLS theory, explicitly extending it to "what learning systems do AI agents need"
  → [Cell](https://www.cell.com/trends/cognitive-sciences/abstract/S1364-6613(16)30043-2)

### Hippocampal Pattern Separation / Completion

- **Yassa & Stark** (2011), "Pattern separation in the hippocampus" *Trends in Neurosciences*
  → Sparse orthogonal coding by the dentate gyrus (DG): similar inputs are mapped to non-overlapping representations
  → Biological basis for lens's Claim dedup philosophy ("force differentiation at write time")
  → [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3183227/)

- **Edmund Rolls** (2013), "The mechanisms for pattern completion and pattern separation in the hippocampus"
  → CA3's recurrent network as an attractor network
  → [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3904133/)

### Hippocampal Sharp-Wave Ripples / Offline Consolidation

- **György Buzsáki** (2015), "Hippocampal sharp wave-ripple: A cognitive biomarker for episodic memory and planning" *Hippocampus*
  → During sleep, the hippocampus replays at ~20x compression speed — the physical mechanism for memory transfer to the cortex
  → Inspired the design intuition for "background consolidation loop" (though lens v0 doesn't implement it)
  → [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4648295/)

### Memory Is Reconstruction, Not Retrieval

- **Daniel Schacter & Donna Addis** (2012), "Constructive memory: past and future"
  → Every recall is a re-synthesis based on residual cues
  → Directly supports lens having the LLM do reconstruction at query time rather than returning raw text chunks
  → [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3341652/)

- **Karim Nader, Glenn Schafe & Joseph LeDoux** (2000), "Fear memories require protein synthesis in the amygdala for reconsolidation after retrieval" *Nature*
  → Reconsolidation phenomenon: memory re-enters a plastic state upon retrieval
  → Implication: lens's read operation can also be a write opportunity
  → [Nature](https://www.nature.com/articles/35021052)

### Gist vs Verbatim

- **Valerie Reyna & Charles Brainerd** — Fuzzy Trace Theory
  → The human brain stores "verbatim traces" and "gist traces" in parallel; the former decays faster
  → Cognitive basis for lens Claim's `canonical_wording` vs `alternative_wordings` dual-track design
  → [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4815269/)

### Active Forgetting

- **Blake Richards & Paul Frankland** (2017), "The Persistence and Transience of Memory" *Neuron*
  → Active forgetting is a feature, not a bug: the brain has dedicated molecular mechanisms to erase details in order to generalize
  → Reminder for lens: retaining everything = overfitting = decision rigidity
  → [Cell](https://www.cell.com/neuron/fulltext/S0896-6273(17)30365-3)

### Engram Research

- **Susumu Tonegawa et al** (2015), "Memory engram storage and retrieval"
  → Used optogenetics to activate/inhibit specific cell assemblies to control memory
  → Demonstrates that memory is a distributed cell ensemble, not a single neuron
  → [Tonegawa Lab PDF](https://tonegawalab.mit.edu/wp-content/uploads/2015/09/309_Tonegawa_COIN_2015.pdf)

### Cognitive Map (Relational Space)

- **James Whittington et al** (2020), "The Tolman-Eichenbaum Machine: Unifying Space and Relational Memory through Generalization in the Hippocampal Formation" *Cell*
  → A unified model of hippocampus + grid cells, simultaneously explaining spatial navigation and non-spatial relational reasoning
  → Proves that a frame is not a metaphor — it is a first-class neural representation of relational structure
  → [Cell](https://www.cell.com/cell/fulltext/S0092-8674(20)31388-X)

- **Kim Stachenfeld, Matthew Botvinick & Samuel Gershman** (2017), "The hippocampus as a predictive map" *Nature Neuroscience*
  → The hippocampus encodes successor representations — not "current location" but "where you'll go from here"
  → [Nature](https://www.nature.com/articles/nn.4650)

- **Timothy Behrens et al** (2018), "What is a cognitive map?" *Neuron*
  → A cognitive map is a continuously interpolable embedding space
  → [Cell](https://www.cell.com/neuron/fulltext/S0896-6273(18)30856-0)

### Catastrophic Forgetting Prevention

- **Gido van de Ven, Hava Siegelmann & Andreas Tolias** (2020), "Brain-inspired replay for continual learning with artificial neural networks" *Nature Communications*
  → Implements CLS theory as an algorithm to prevent catastrophic forgetting (generative replay)
  → [Nature](https://www.nature.com/articles/s41467-020-17866-2)

---

## IV. Cognitive Science: Structured Forms of Knowledge

### Schema and Frame

- **Frederic Bartlett**, *Remembering: A Study in Experimental and Social Psychology* (Cambridge UP, 1932)
  → Foundation of Schema theory. Memory is "reconstructive" rather than "retrieval"
  → [Wiki](https://en.wikipedia.org/wiki/Frederic_Bartlett)

- **David Rumelhart**, "Schemata: the building blocks of cognition" in Spiro et al eds., *Theoretical Issues in Reading Comprehension* (1980)
  → Formalization of schemas: data structure with variables, default values, sub-schemas
  → This is the cognitive science basis for lens's Frame type

- **Marvin Minsky**, "A Framework for Representing Knowledge" MIT AI Memo 306 (1974)
  → The AI version of frames: terminals (slots) + markers + defaults + attached procedures
  → [MIT AI Lab](https://web.media.mit.edu/~minsky/papers/Frames/frames.html)

- **Charles Fillmore**, "Frame Semantics" in *Linguistics in the Morning Calm* (1982)
  → Linguistic frames: the conceptual scene evoked by words; each frame has core/peripheral frame elements
  → FrameNet is its engineering implementation ([FrameNet](https://framenet.icsi.berkeley.edu/))

- **Collin Baker, Charles Fillmore & John Lowe**, "The Berkeley FrameNet Project" (1998) + **Ruppenhofer et al**, *FrameNet II: Extended Theory and Practice* (2016)
  → Complete schema of frame_name + core_FEs + peripheral_FEs + lexical_units + frame_relations

- **George Lakoff**, *Don't Think of an Elephant* (2004) + *Moral Politics* (1996)
  → Cognitive/political version of frames: metaphorical role assignment + value judgment
  → Directly inspired the "viewfinder" workflow: choosing a frame means choosing what to see and what to ignore

- **George Lakoff & Mark Johnson**, *Philosophy in the Flesh* (1999) + Mark Johnson, *The Body in the Mind* (1987)
  → Image schemas: CONTAINER, PATH, BALANCE, FORCE, and other pre-conceptual embodied patterns
  → [Wiki](https://en.wikipedia.org/wiki/Image_schema)

### Scripts (Procedural Cognitive Structures)

- **Roger Schank & Robert Abelson**, *Scripts, Plans, Goals and Understanding* (1977)
  → Script = temporally/causally ordered sequence of actions + roles + props
  → Classic example: restaurant script (ENTER → ORDER → EAT → PAY → EXIT)
  → Reminder for lens: procedural memory is a separate species (lens does not implement it for now)

### Mental Models

- **Philip Johnson-Laird**, *Mental Models* (Harvard UP, 1983)
  → Mental model = structured simulation of states, supporting "running" during reasoning
  → Different from frames: mental models are runnable; frames are static structures

- **Peter Senge**, *The Fifth Discipline* (1990)
  → Organizational mental models: deeply held assumptions influence action
  → Complementary to Argyris's double-loop learning

### Causal Models

- **Judea Pearl**, *Causality* (Cambridge UP, 2000) + *The Book of Why* (Basic Books, 2018)
  → Causal model = DAG + intervention semantics. Three rungs: association / intervention / counterfactual
  → One of the strongest "knowledge representation structures," but deferred in lens v0 (not LLM-friendly)
  → [The Book of Why](http://bayes.cs.ucla.edu/WHY/)

- **Judea Pearl**, *Probabilistic Reasoning in Intelligent Systems* (Morgan Kaufmann, 1988)
  → Foundation of Bayesian belief networks

### Analogical Reasoning

- **Dedre Gentner**, "Structure-mapping: A theoretical framework for analogy" *Cognitive Science* 7:155-170 (1983)
  → Analogy = cross-domain alignment of relational structure, following the systematicity principle
  → SME (Structure Mapping Engine) is its engineering implementation

- **Gilles Fauconnier & Mark Turner**, *The Way We Think: Conceptual Blending and the Mind's Hidden Complexities* (Basic Books, 2002)
  → Four-space model: input1 + input2 + generic + blend
  → Explains creative combination

### Pragmatic Reasoning

- **Patricia Cheng & Keith Holyoak** (1985), "Pragmatic reasoning schemas" *Cognitive Psychology* 17:391-416
  → Abstract but domain-tuned rule sets (permission / obligation, etc.)
  → Explains the framing effect in the Wason selection task

---

## V. AI Knowledge Representation / Classical KR

### Semantic Networks and Concept Maps

- **M. Ross Quillian** (1968), "Semantic Memory" in Minsky ed., *Semantic Information Processing*
  → Foundation of semantic networks. Today's KGs are all its descendants
  → [Wiki](https://en.wikipedia.org/wiki/Semantic_network)

- **Joseph Novak & Bob Gowin**, *Learning How to Learn* (Cambridge UP, 1984)
  → Concept maps: nodes = concepts, **labeled linking phrases** = relations (each edge reads as a grammatical proposition)
  → Directly inspired lens's typed relation design
  → [IHMC](https://cmap.ihmc.us/docs/theory-of-concept-maps)

### Ontology

- **Tom Gruber** (1993), "A translation approach to portable ontology specifications" *Knowledge Acquisition* 5:199-220
  → Classic definition: "Ontology is an explicit specification of a conceptualization"
  → Lens's stance: ontology is background vocabulary, not a user-facing type

- **OWL 2** — W3C Web Ontology Language (2012)
  → Description Logic subset, TBox + ABox. Too heavy for lens
  → [W3C](https://www.w3.org/TR/owl2-overview/)

### Production Rules / Cognitive Architectures

- **Allen Newell & Herbert Simon**, *Human Problem Solving* (1972) + **John Anderson**, ACT-R (1993)
  → Production rules: IF condition THEN action
  → Procedural knowledge representation

### IBIS — Issue-Based Information System

- **Werner Kunz & Horst Rittel** (1970), "Issues as elements of information systems" Working Paper 131, UC Berkeley
  → IBIS = Issue → Positions → Arguments (pro/con) → sub-Issues
  → Lens's Question type + alternative_hypotheses directly corresponds

- **Jeffrey Conklin & Michael Begeman** (1988), gIBIS
  → Graphical implementation of IBIS, ancestor of design rationale tools
  → [ACM](https://dl.acm.org/doi/10.1145/58566.59297)

### Argument Mapping

- **Tim van Gelder** (2003), "Enhancing Deliberation Through Computer-Supported Argument Mapping" in Kirschner et al eds., *Visualizing Argumentation*
  → Argument maps: tree/graph of contention + co-premise groups + objections + rebuttals
  → More rigorous than Toulmin — forces co-premises to be explicit
  → [vanGelder PDF](https://timvangelder.com/wp-content/uploads/2008/12/Enhancing-Deliberation-2003.pdf)

### Framing in Media / Communication

- **Robert Entman** (1993), "Framing: Toward Clarification of a Fractured Paradigm" *Journal of Communication* 43:51-58
  → Frame = problem definition + causal interpretation + moral evaluation + treatment recommendation
  → 4-slot structure complements Toulmin/IBIS

### Norman's Conceptual vs Mental Model

- **Donald Norman**, *The Design of Everyday Things* (1988)
  → Designer's conceptual model vs user's mental model vs system's system image
  → Reminder for lens: compiled artifacts belong to different "model roles"

---

## VI. Computational Memory Theory

### Sparse Distributed Memory (The Data Structure Most Directly Corresponding to Biological Memory)

- **Pentti Kanerva**, *Sparse Distributed Memory* (MIT Press, 1988)
  → High-dimensional sparse vector storage + partial match recall + pattern completion
  → Designed 40 years ago to simulate the hippocampus, still works today
  → [Berkeley PDF](https://redwood.berkeley.edu/wp-content/uploads/2020/08/KanervaP_SDMrelated_models.pdf)

### Modern Hopfield Networks

- **Hubert Ramsauer et al** (2020), "Hopfield Networks is All You Need" NeurIPS 2020
  → Modern Hopfield network capacity is exponential
  → **Mathematically proves Hopfield retrieval ≈ Transformer attention** — LLMs are already performing biological-style associative memory internally
  → [arXiv](https://arxiv.org/abs/2008.02217)

### Attention Equals SDM

- **Trenton Bricken & Cengiz Pehlevan** (2021), "Attention Approximates Sparse Distributed Memory" NeurIPS 2021
  → Extends Ramsauer's conclusion to Kanerva SDM
  → Implication: Transformer attention has a built-in biological-style associative memory mechanism
  → [arXiv](https://arxiv.org/abs/2111.05498)

### Hyperdimensional Computing / VSA

- **Pentti Kanerva** (2009), "Hyperdimensional computing"
- **Denis Kleyko et al** (2022), "A Survey on Hyperdimensional Computing"
  → Encoding arbitrary structures in 10000+ dimensional vectors. Three operations: Bind/Bundle/Permute
  → Library: [torchhd](https://github.com/hyperdimensional-computing/torchhd)
  → [Survey arXiv](https://arxiv.org/abs/2111.06077)

### Successor Representations

- **Peter Dayan** (1993), "Improving generalization for temporal difference learning: The successor representation"
  → Each state's representation = expected future visitation frequency starting from here
  → Later shown to be the computational essence of hippocampal place cells

### TEM (Repeated; same as Whittington above)

- **James Whittington et al** (2020), "The Tolman-Eichenbaum Machine" *Cell*
  → The first neural network model to unify spatial navigation and relational reasoning
  → [Cell](https://www.cell.com/cell/fulltext/S0092-8674(20)31388-X)

### Hierarchical Temporal Memory

- **Jeff Hawkins** — HTM / Numenta
  → Thousand Brains Theory: sparse distributed representations + sequence learning + cortical columns
  → [Numenta](https://numenta.com/)

---

## VII. AI Memory Academic Research

### Classic Architecture Papers

- **Charles Packer et al** (2023), "MemGPT: Towards LLMs as Operating Systems"
  → OS metaphor: main context (RAM) + archival store (disk), agent pages itself
  → Later commercialized as Letta
  → [arXiv 2310.08560](https://arxiv.org/abs/2310.08560)

- **Joon Sung Park et al** (2023), "Generative Agents: Interactive Simulacra of Human Behavior"
  → Stanford Smallville: memory stream + reflection hierarchy + recency × importance × relevance retrieval
  → The most influential agent memory paper, though the importance score component is hype
  → [arXiv 2304.03442](https://arxiv.org/abs/2304.03442)

- **Noah Shinn et al** (2023), "Reflexion: Language Agents with Verbal Reinforcement Learning"
  → Verbal RL: on failure, write a post-mortem to the episodic buffer, retry next time
  → Insight: self-critique is a first-class memory type
  → [arXiv 2303.11366](https://arxiv.org/abs/2303.11366)

- **Guanzhi Wang et al** (2023), "Voyager: An Open-Ended Embodied Agent with Large Language Models"
  → Skill library = executable JS functions + semantic index
  → Procedural memory should be code, not prose
  → [arXiv 2305.16291](https://arxiv.org/abs/2305.16291)

- **Wanjun Zhong et al** (2023), "MemoryBank: Enhancing Large Language Models with Long-Term Memory"
  → Ebbinghaus forgetting curve implementation, but lacks ablation
  → [arXiv 2305.10250](https://arxiv.org/abs/2305.10250)

- **Theodore Sumers et al** (2023), "Cognitive Architectures for Language Agents (CoALA)"
  → Divides agent memory into working / episodic / semantic / procedural (Baddeley-derived taxonomy)
  → This vocabulary became the lingua franca for subsequent papers
  → [arXiv 2309.02427](https://arxiv.org/abs/2309.02427)

### Retrieval and Knowledge Representation

- **Akari Asai et al** (2023), "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection"
  → Adaptive retrieval + self-evaluation
  → [arXiv 2310.11511](https://arxiv.org/abs/2310.11511)

- **Parth Sarthi et al** (2024), "RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval" ICLR 2024
  → Recursive clustering + summary tree
  → Strong baseline
  → [arXiv 2401.18059](https://arxiv.org/abs/2401.18059)

- **Microsoft Research** (2024), "From Local to Global: A Graph RAG Approach to Query-Focused Summarization"
  → Entity KG + Leiden community detection + hierarchical summaries
  → Suitable for sensemaking queries, high cost
  → [arXiv 2404.16130](https://arxiv.org/abs/2404.16130)

- **Bernal Jiménez Gutiérrez et al** (2024), "HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models" NeurIPS 2024
  → Explicitly based on hippocampal indexing theory: LLM extracts KG + Personalized PageRank for multi-hop retrieval
  → The strongest "brain-inspired RAG" work
  → [arXiv 2405.14831](https://arxiv.org/abs/2405.14831)

- **Zirui Guo et al** (2024), "LightRAG: Simple and Fast Retrieval-Augmented Generation"
  → Lightweight version of GraphRAG (removes community detection)
  → [arXiv 2410.05779](https://arxiv.org/abs/2410.05779)

### Evaluation Benchmarks

- **Adyasha Maharana et al** (2024), "Evaluating Very Long-Term Conversational Memory of LLM Agents (LOCOMO)"
  → Currently the only widely used long-term conversational memory benchmark
  → Uses synthetic data, suggesting lens should build its own eval
  → [arXiv 2402.17753](https://arxiv.org/abs/2402.17753)

### 2024-2026 Latest Developments

- **Wujiang Xu et al** (2025), "A-MEM: Agentic Memory for LLM Agents" NeurIPS 2025
  → Zettelkasten style: each memory is a note + LLM-generated tags/keywords/contextual description + dynamic links
  → The academic work closest to lens's design goals
  → [arXiv 2502.12110](https://arxiv.org/abs/2502.12110)

- **Prateek Chhikara et al** (2025), "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory"
  → Currently the most honest production-level paper. On LOCOMO: +26% more accurate than OpenAI managed memory, -90% tokens
  → Graph variant only +2% — proves graph layer is not decisive
  → [arXiv 2504.19413](https://arxiv.org/abs/2504.19413)

- **Ali Behrouz, Peilin Zhong & Vahab Mirrokni** (Google DeepMind, 2025), "Titans: Learning to Memorize at Test Time" NeurIPS 2025
  → Neural long-term memory module that updates at test time based on surprise signal
  → Suggests future memory will return to model weights
  → [arXiv 2501.00663](https://arxiv.org/abs/2501.00663)

### Surveys

- **ACM TOIS** — "A Survey on the Memory Mechanism of Large Language Model-based Agents"
  → [ACM](https://dl.acm.org/doi/10.1145/3748302)

### Knowledge Conflicts

- **Knowledge Conflicts for LLMs: A Survey** EMNLP 2024
  → Directly relevant to lens's contradiction handling
  → [ACL Anthology](https://aclanthology.org/2024.emnlp-main.486.pdf)

### Entity Extraction

- **LLM-empowered knowledge graph construction: A survey** (2024)
  → SOTA entity resolution is a layered pipeline: rules → embeddings → LLM arbitration
  → Directly supports lens's layered dedup design
  → [arXiv](https://arxiv.org/html/2510.20345v1)

### Adaptive Memory

- **Learn to Memorize: Optimizing LLM-based Agents with Adaptive Memory Framework** (2025)
  → Learned retrieval scorer outperforms hand-crafted importance weights
  → Suggests lens's importance signal should come from downstream usage, not LLM scoring
  → [alphaXiv](https://www.alphaxiv.org/overview/2508.16629v1)

---

## VIII. AI Memory Commercial Products

### Major Products

- **Mem0** — [docs.mem0.ai](https://docs.mem0.ai)
  → vector + LLM extraction, flat memory + optional graph triple
  → GitHub issue [#4573](https://github.com/mem0ai/mem0/issues/4573): production audit found 97.8% is garbage
  → Cautionary tale: automatic extraction + weak dedup = disaster

- **Letta** (formerly MemGPT) — [letta.com](https://letta.com), [GitHub](https://github.com/letta-ai/letta)
  → core memory blocks + archival memory + recall log
  → [Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute) is a rare "background lint" implementation
  → [Memory Blocks](https://www.letta.com/blog/memory-blocks)
  → [Re-architecting Letta v1](https://www.letta.com/blog/letta-v1-agent)

- **Zep / Graphiti** — [getzep.com](https://getzep.com), [GitHub](https://github.com/getzep/graphiti)
  → Bi-temporal knowledge graph, three-layer dedup (exact/fuzzy/LLM)
  → [Zep paper arXiv 2501.13956](https://arxiv.org/abs/2501.13956)
  → [Lies, Damn Lies, Statistics — Debunking mem0 benchmark](https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/)

- **Cognee** — [cognee.ai](https://www.cognee.ai), [GitHub](https://github.com/topoteretes/cognee)
  → cognify pipeline + memify post-processing
  → [Memify introduction](https://www.cognee.ai/blog/cognee-news/product-update-memify)

- **Supermemory** — [supermemory.ai](https://supermemory.ai)
  → SaaS, shared memory across ChatGPT/Claude/Cursor
  → [How it works](https://supermemory.ai/docs/concepts/how-it-works)

- **Memori** — [GitHub](https://github.com/MemoriLabs/Memori)
  → SQL-native, explicitly against vector-only approaches

- **basic-memory** — [GitHub](https://github.com/basicmachines-co/basic-memory)
  → Markdown files + SQLite index + WikiLinks
  → The product closest to lens in design (outside the compile paradigm)

- **Open WebUI Memory** — [docs](https://docs.openwebui.com/features/chat-conversations/memory/)

### MCP Memory Servers

- **Anthropic Knowledge Graph Memory MCP** (official reference)
  → [GitHub](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
  → JSONL storing entity/relation/observation triples
  → Degenerate case: users produce "prose disguised as entities"

- **doobidoo/mcp-memory-service** — KG + autonomous consolidation
- **DeusData/codebase-memory-mcp** — code-specific KG, 66 languages

### Framework Memory

- **LangGraph / LangMem** — [docs](https://docs.langchain.com/oss/python/langgraph/memory)
  → BaseStore + LangMem SDK's semantic/episodic/procedural extraction

- **LlamaIndex Memory** — [docs](https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/memory/)
  → New Memory class + composable MemoryBlocks

---

## IX. Platform-Level Memory Implementations

### Anthropic

- **Anthropic Memory Tool** — [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
  → Single `memory` tool with 6 commands: view/create/str_replace/insert/delete/rename
  → Backend is arbitrary (filesystem / S3 / SQLite), server never sees files
  → Works in conjunction with context editing + compaction

- **Anthropic Context Management** — [blog](https://claude.com/blog/context-management)

- **Effective Context Engineering for AI Agents** — [Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### Claude Code

- **Claude Code Memory** — [docs](https://code.claude.com/docs/en/memory)
  → CLAUDE.md (human-written) + automatic memory system (agent-written)
  → 4 types: user / feedback / project / reference
  → In-depth source analysis of cc-2.1 available in conversation history

### LangGraph / LangMem listed above

### ChatGPT

- **OpenAI ChatGPT Memory** — bio tool + Model Set Context
  → 4 implicit channels: Assistant Response Preferences / Notable Past Conversation Topics / Helpful User Insights / User Interaction Metadata
  → [Reverse engineering by Embrace The Red](https://embracethered.com/blog/posts/2025/chatgpt-how-does-chat-history-memory-preferences-work/)

### Cursor

- **Cursor Rules** — [docs](https://docs.cursor.com/context/rules)
  → 4 rule types: Always / Auto-Attached / Agent Requested / Manual

- **Cursor Memories** (deprecated in v2.1.x)
  → [forum](https://forum.cursor.com/t/0-51-memories-feature/98509)
  → Cautionary example: automatic memory extraction rolled back due to lack of user trust

### Cline / Windsurf / Cody

- **Cline Memory Bank** — [docs](https://docs.cline.bot/features/memory-bank)
  → Conventional markdown file structure + .clinerules forcing agent to read every time

- **Windsurf Cascade Memories** — [docs](https://docs.windsurf.com/windsurf/cascade/memories)
  → Auto-generated + locally stored + not committed to git

---

## X. PKM Methodologies

### Zettelkasten / Smart Notes

- **Niklas Luhmann** — Original Zettelkasten (90,000+ slip-box)
  → Permanent notes + fleeting notes + literature notes + structure notes
  → [Wiki](https://en.wikipedia.org/wiki/Zettelkasten)

- **Sönke Ahrens**, *How to Take Smart Notes* (2017)
  → The foundational book for the modern Zettelkasten
  → [zettelkasten.de explainer](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/)

### How to Read a Book

- **Mortimer Adler & Charles Van Doren**, *How to Read a Book* (1940/1972)
  → 4 levels of reading: elementary / inspectional / analytical / syntopical
  → 4 analytical questions directly correspond to lens Question types
  → [Wiki](https://en.wikipedia.org/wiki/How_to_Read_a_Book)

### Building a Second Brain

- **Tiago Forte**, *Building a Second Brain* (2022)
  → PARA (Projects/Areas/Resources/Archives) + CODE (Capture/Organize/Distill/Express)
  → Progressive Summarization 4 layers
  → [fortelabs.com](https://fortelabs.com/blog/basboverview/)

### Evergreen Notes / Andy Matuschak

- **Andy Matuschak** — [Evergreen notes](https://notes.andymatuschak.org/Evergreen_notes)
  → Atomic, concept-oriented, densely linked, permanent and improvable
  → [Should be atomic](https://notes.andymatuschak.org/Evergreen_notes_should_be_atomic)

- **Andy Matuschak** — [Mnemonic medium](https://notes.andymatuschak.org/Mnemonic_medium)
  → Spaced repetition prompts as atomic Q/A units

### Block-based Systems

- **Roam Research** — [forum on block references](https://forum.roamresearch.com/t/some-beginner-questions-about-block-reference/434)
  → Block as atom, each block has a stable UUID

- **Logseq** — block + tag + property `::`

- **Tana** — supertag + field entries
  → [Tana vs Logseq](https://www.unlocktana.com/blog/tana-vs-logseq)
  → Object of reference for nodex/soma; Tana's supertag pattern is borrowed by lens's typed entity (v0.5)

- **Notion** — block + page + database
  → [Notion data model](https://www.notion.com/blog/data-model-behind-notion)

- **Obsidian** — markdown file + wikilinks + YAML frontmatter

### Digital Gardens

- **Maggie Appleton** — [Digital Garden History](https://maggieappleton.com/garden-history)
  → Plants / seedlings / evergreen maturity tiers

### Reading / Highlighting Tools

- **Readwise** — [API docs](https://readwise.io/api_deets), [Reader API](https://readwise.io/reader_api)
  → Highlight is the atomic unit; its schema is already a referable canonical form

- **MarginNote / LiquidText** — [comparison](https://www.marginnote.com/press/marginnote-liquidtext)

### Note-Taking Methods

- **Cornell Note-Taking Method** — [University of York](https://subjectguides.york.ac.uk/note-taking/cornell)
  → Three columns: cue + notes + summary

- **Joseph Novak & Alberto Cañas** — [Theory underlying concept maps](https://cmap.ihmc.us/docs/theory-of-concept-maps)

### AI-Era Note-Taking Tools

- **Mem.ai** — [Productivity Stack guide](https://productivitystack.io/guides/mem-ai-guide/)
  → AI auto-tagging + intelligently surfaced

- **Granola** — [docs](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes)
  → AI-enhanced meeting notes

---

## XI. Direct Sources of Inspiration

### Karpathy

- **Andrej Karpathy** — [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) (2026-04-04)
  → Source of Lens's "continuous compilation beats ad-hoc retrieval" paradigm
  → Three-layer structure: Raw Sources / Wiki / Schema
  → Three operations: Ingest / Query / Lint

- **Andrej Karpathy** — [System Prompt Learning thread](https://x.com/karpathy/status/1921368644069765486)
  → Mentioned the idea of deriving memory from system prompts

### Li Jigang

- **lijigang/ljg-skills** — [GitHub](https://github.com/lijigang/ljg-skills)
  → Source of Lens's cognitive operation set
  → 14 skills: ljg-learn (8-layer concept dissection) / ljg-rank (dimensionality reduction) / ljg-roundtable (roundtable) / ljg-paper-river (paper lineage tracing) / ljg-writes (thinking through while writing), etc.

- **E45 Mengyan's Conversation with Li Jigang — How Humans Find Their Place** (2026)
  → Local transcript file: `/Users/lixiaobo/Documents/Coding/nodex/docs/research/E45_Meng_Yan_Li_Jigang_How_Humans_Find_Their_Place_transcript.txt`
  → Provides core concepts such as "viewfinder," "dimensionality reduction," "roundtable," "second-order/third-order questions," "water education/fire education," and "model reads first"
  → Key references:
    - Viewfinder definition: lines 27, 33-39
    - Dimensionality reduction / three fundamental qualities: lines 207-255
    - Structure (company possibility space): lines 123-129
    - Roundtable discussion: lines 938-963
    - Feed = Fate: lines 1473, 1485
    - Second-order/third-order questions: lines 1562-1568
    - Water/fire education: lines 1604-1635
    - Agency / "Every person as a dragon among people": lines 1575, 1617

---

## XII. Other Works That Provided Inspiration but Were Not Deeply Cited

- **Friston Free Energy Principle** — Predictive processing theory. Lens's action of "interpreting new data with existing frames" is isomorphic to predictive processing, but lens does not require engineering-level minimization
- **Hawkins Thousand Brains Theory** — Numenta's latest framework, converging with cognitive map theory
- **DIKW Pyramid** (Ackoff 1989) — Data → Information → Knowledge → Wisdom. Explicitly **opposed** by lens — this pyramid implies linear progression, but in reality it is a cycle
- **Aristotle's Episteme / Techne / Phronesis** — Three types of knowledge, serving as a reminder in lens design that "there is more than one type of knowledge"
- **Roy Bhaskar Critical Realism** — Ontological realism + epistemological relativism. Highly resonant with Li Jigang's "reality exists but can only be seen through viewfinders"

---

## XIII. Tools and Open Source Dependencies (Used in the Source Pipeline)

These are the open source tools directly integrated into the lens v0.1 Source Pipeline. Each has been researched and confirmed as the best-in-class or clearly preferred choice for 2025-2026.

### Web article extraction

- **Defuddle** by **Kepano** (founder of Obsidian) — [github.com/kepano/defuddle](https://github.com/kepano/defuddle)
  → Web article cleanup + markdown conversion
  → More forgiving than Mozilla Readability, retains more content (standardized handling of footnotes/math/code/tables/callouts)
  → TypeScript native, with `defuddle/node` for Node.js usage
  → Paired with `linkedom` as DOM parser
  → Rich metadata extraction (title/author/published/domain/language/schema.org)
  → **Lens v0.1's `web_article` extractor**

### PDF extraction

- **Marker** by **Vik Paruchuri** — [github.com/VikParuchuri/marker](https://github.com/VikParuchuri/marker)
  → Python library, PDF → markdown conversion
  → Preserves sections/paragraphs/lists/footnotes/reading order/images/tables/hyperlinks/references
  → Two modes: fast local mode vs `--use_llm` mode (using LLM to assist with complex tables and formulas)
  → 2026's open source PDF extraction "Swiss Army knife" ([Jimmy Song comparison](https://jimmysong.io/blog/pdf-to-markdown-open-source-deep-dive/), [Menon Lab comparison](https://themenonlab.blog/blog/best-open-source-pdf-to-markdown-tools-2026))
  → **Lens v0.1's `pdf_paper` extractor**, `--use_llm` not enabled by default

- **MinerU** (Shanghai AI Lab) — [github.com/opendatalab/MinerU](https://github.com/opendatalab/MinerU)
  → King of complex layouts + CJK (Chinese/Japanese/Korean)
  → Alternative extractor, to be enabled in v0.3 for `--locale zh` users

- **Grobid** — [github.com/kermitt2/grobid](https://github.com/kermitt2/grobid)
  → Established academic PDF extraction
  → **Not adopted by lens**: converts formulas and tables to images, not LLM-friendly

### Audio transcription (v0.3)

- **MLX Whisper** — Whisper implementation on Apple's MLX framework
  → Fastest on Apple Silicon, 2-4x faster than whisper.cpp ([2026 benchmark](https://notes.billmill.org/dev_blog/2026/01/updated_my_mlx_whisper_vs._whisper.cpp_benchmark.html))
  → **Lens v0.3's default audio extractor on macOS Apple Silicon**

- **Lightning-Whisper-MLX** by **Mustafa Aljadery** — [github.com/mustafaaljadery/lightning-whisper-mlx](https://github.com/mustafaaljadery/lightning-whisper-mlx)
  → Claims to be 10x faster than whisper.cpp
  → Alternative, to be decided after v0.3 benchmark

- **whisper.cpp** by **Georgi Gerganov** — [github.com/ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp)
  → C++ implementation, cross-platform
  → **Lens v0.3's default audio extractor on non-Apple-Silicon**

### Chat export formats

- **ChatGPT export schema** ([OpenAI Developer Community](https://community.openai.com/t/decoding-exported-data-by-parsing-conversations-json-and-or-chat-html/403144))
  → `conversations.json` is a tree structure; the `mapping` field stores parent/children relationships
  → Lens only processes the default branch (path from root to last leaf)

- **Claude.ai export format** ([Claude Help Center](https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data))
  → JSON array, flat structure, simpler than ChatGPT
  → Includes conversations + memory + projects (from 2026 onward)

- **Claude Code session format** ([Session Continuation blog](https://blog.fsck.com/releases/2026/02/22/claude-code-session-continuation/))
  → `~/.claude/projects/<encoded_cwd>/<session_uuid>.jsonl`
  → Append-only JSONL, one event per line
  → No locking, no corruption risk; lens can safely read snapshots

### Supporting Libraries

- **linkedom** — [github.com/WebReflection/linkedom](https://github.com/WebReflection/linkedom)
  → Lightweight DOM implementation; Defuddle depends on it in Node.js mode
  → Lighter than JSDOM (MB-scale, no Chromium)

- **better-sqlite3** — [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
  → Node.js SQLite binding, synchronous API; used for lens's index.sqlite

- **sqlite-vec** — [github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec)
  → SQLite vector search extension, used for embedding similarity queries

---

## Citation Standards

When citing any of the above sources in lens's code, documentation, commit messages, or user-facing copy:

1. **Use full name + year + publication** — not just abbreviations
2. **Link to the original source** — Wikipedia can serve as an entry point but not the final destination
3. **Acknowledge deviations** — if lens's implementation deviates from the original author's intent, explicitly state "borrowed X's Y but did not adopt Z"
4. **Do not abuse authority** — citations are for grounding design, not for making the design sound sophisticated

---

## Coverage of These Sources

| Dimension | Number of Sources |
|---|---|
| Methodological spine (Lakatos/Reif+Miller/Popper/Toulmin/Bayes) | 5 + 6 peripheral support |
| Other philosophy of science + systematic review methodologies | ~10 |
| Cognitive science (brain research + knowledge representation) | ~30 |
| Computational memory theory (SDM/Hopfield/HDC) | ~6 |
| AI memory academic research | ~15 |
| AI memory commercial products | ~12 |
| Platform-level memory implementations | ~10 |
| PKM methodologies | ~15 |
| Direct inspiration (Karpathy + Li Jigang) | 2 + 14 skills |
| **Total** | **~122 independent citations** |

This list is not meant to showcase reading volume. It is the **traceable basis for every design decision** in lens — any design choice can be traced back to a specific theory or precedent, and when disputes arise, one can go back to the original text for verification.

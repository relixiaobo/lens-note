---
id: note_01KNW9P133AN1SPH4NRDER58WY
type: note
text: >-
  「先跑，再补」的 Skill 设计方法论，是对「提示工程」传统路径的逆转。传统提示工程往往从猜测开始：想象 Claude
  可能需要什么，然后预先写好说明。这篇文章的建议是相反的：先运行真实任务，观察智能体在哪里卡住，再针对失败点补写 Skill。这与
  note_01KNW5GTR6EHTCJV4EG6TPZR2C
  的「威胁建模」类比共享同一认识论：不要穷举覆盖，要通过观察识别真实瓶颈。两者都拒绝预先猜测，都依赖对真实场景的定向搜索。但这篇文章更进一步：它把这个原则应用于
  Skill 的构建过程本身——Skill 不是在任务执行前设计好的，而是在任务执行后，从失败点中蒸馏出来的。这是一种「需求驱动」而非「供给驱动」的能力构建。
role: claim
source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
status: active
created_at: '2026-04-10T18:15:18.355Z'
evidence:
  - text: '从评估开始，别猜: 别预先猜 Claude 需要什么。先跑任务，观察哪里卡住，再针对性地补。'
    source: src_01KNW9JEBQ5CHN50JZEDKHRZR5
    locator: Skills 设计的最佳实践 / 从评估开始，别猜
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
bridges:
  - note_01KNW5GTR6EHTCJV4EG6TPZR2C
---
「先跑，再补」的 Skill 设计方法论，是对「提示工程」传统路径的逆转。传统提示工程往往从猜测开始：想象 Claude 可能需要什么，然后预先写好说明。这篇文章的建议是相反的：先运行真实任务，观察智能体在哪里卡住，再针对失败点补写 Skill。这与 note_01KNW5GTR6EHTCJV4EG6TPZR2C 的「威胁建模」类比共享同一认识论：不要穷举覆盖，要通过观察识别真实瓶颈。两者都拒绝预先猜测，都依赖对真实场景的定向搜索。但这篇文章更进一步：它把这个原则应用于 Skill 的构建过程本身——Skill 不是在任务执行前设计好的，而是在任务执行后，从失败点中蒸馏出来的。这是一种「需求驱动」而非「供给驱动」的能力构建。

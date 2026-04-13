---
id: src_01KNWEHN7BKDHBXB80X107CBT6
type: source
source_type: note_batch
title: 'Notes: highlights-batch-03'
word_count: 266
ingested_at: '2026-04-10T19:40:18.027Z'
created_at: '2026-04-10T19:40:18.027Z'
status: active
---
1. Arc 最大的困局是：Chrome 已经足够好，一百分的话，Chrome 已经是 85 分产品。Arc 的创新，可能提升了 3-5 分，达到了 90 分体验。悲催的是，这增加的 5 分体验，很难让大量用户迁移。

2. 在收集信息和溯源环节起到一定帮助（perplexity），在写笔记和组织环节基本没有帮助

3. 如果我们将地铁视为一个“帮助乘客从 A 点到 B 点”的交通方案，那么在这整个方案的实现过程中，“如何让乘客付费”这个业务环节的重要性和实施成本可能只占总方案的 1%。它太不重要，也太没有话语权。

4. We used an LLM judge that evaluated each output against criteria in a rubric: factual accuracy (do claims match sources?), citation accuracy (do the cited sources match the claims?), completeness (are all requested aspects covered?), source quality (did it use primary sources over lower-quality secondary sources?), and tool efficiency (did it use the right tools a reasonable number of times?).

5. 因为对公司而言，值得去做的事情是无限的，如果没有人来决定关键方针，力量就会变得分散。

6. 我一直相信，作为一种习惯，“不断提问”必然会成为人类最基本也最有价值的行为之一。可以马上得到答案的问题就扔给机器，人的价值在于在面对不知道答案的问题时，可以不断思考，不断提问。正确地提出问题，本身就很有价值。这是探索、科学和创造性的基础，是创新。人类未来的工作将会变成提问，以及应对不确定性。

7. 如果出现疑问，我会思考其原理，建立一个假说。接着将一切能设想到的情形全部验证一遍，直到“无论从哪个角度来思考，全部都能解释得通”才肯作罢。然后说出：“这就是答案。”所以，但凡发现无法解释的“为什么？”，就不能放在一边不管。如果我的假说中有无法解释清楚的部分，那么它就是错的。一定另有缘由，我必须把它找出来。这样一来，必须得另外建立新的假说，重新开始思考。

8. LinkedIn 的做法是： 1). 使用 YAML 格式而不是 JSON，相对来说容错率更高 2). 用日志记录常见的 YAML 错误，优化自己的 YAML 解析器，可以解析 LLM 返回的不规范的 YAML 3). 如果还是无法解析则将错误信息交给 LLM 修复，并且不断优化提示词，提升 LLM 修复的成功率

9. 能够建立起这个循环，才是一个人真正的才能。

10. Two of our findings stand in contrast to other work. First, we find the share of messages related to computer coding is relatively small: only 4.2% of ChatGPT messages are related to computer programming, compared to 33% of work-related Claude conversations Handa et al. (2025). 8 Second, we find the share of messages related to companionship or social-emotional issues is fairly small: only 1.9% of ChatGPT messages are on the topic of Relationships and Personal Reflection and 0.4% are related

11. 对于思考过的问题，如果已经理顺思路，直接回答即可。然而，如果被抛来尚未研究过的问题，即使可以立刻建立起假说，验证的过程也才刚刚开始。

12. Once intelligence reaches a threshold, multi-agent systems become a vital way to scale performance.

13. 如果 workflow 不确定但 context 确定，也就是输入清晰但走法多样，Agent 就要去自主规划路径，例如市场分析报告生成、个性化推荐等，大多数 End-to-End RL Agent 都擅长做这类任务，因为它们在训练阶段就习得了大量的路径规划和解题思路。

14. 一个应用程序可以使用不同的模型来响应不同类型的查询。针对不同查询提供不同的解决方案有几项好处。首先，这使你可以拥有专门的解决方案，例如一个专门处理技术故障排除的模型和另一个专门处理订阅的模型。专门化的模型可能比通用模型表现更好。其次，这可以帮助你节省成本。将所有查询都路由到一个昂贵的模型，不如将简单的查询路由到更便宜的模型，这样可以帮助你节省成本。

15. Tools should enable agents to subdivide and solve tasks in much the same way that a human would, given access to the same underlying resources, and simultaneously reduce the context that would have otherwise been consumed by intermediate outputs.

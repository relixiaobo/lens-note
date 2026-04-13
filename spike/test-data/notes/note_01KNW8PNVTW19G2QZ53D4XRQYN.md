---
id: note_01KNW8PNVTW19G2QZ53D4XRQYN
type: note
text: >-
  用专门训练的小模型（如 Llama 2 微调版）做评估，比用通用大模型做评估的方向更值得关注。通用 LLM-as-judge
  方案存在一个隐患：评估者的判断标准难以稳定，且随基座模型版本迭代而漂移。而训练一个专属评估模型，相当于将「评估标准」固化成可版本控制的工件——这与软件工程中「测试是规约的另一种表达」的思想高度一致。评估模型的权重就是评估标准的持久化；这让评估本身成了一个可以被
  CI 可靠复现的确定性过程，而不是依赖某个特定 API 调用的随机采样。
role: claim
source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
status: active
created_at: '2026-04-10T17:58:11.044Z'
evidence:
  - text: 基于 llama 2 训练一个评测模型（验证召回率和引文精度）
    source: src_01KNW8KCKXCD1H8AHFPC6X1TZ8
    locator: src_01KNW8KCKXCD1H8AHFPC6X1TZ8 Evaluation Framework 1
qualifier: presumably
voice: synthesized
scope: big_picture
structure_type: argument
supports:
  - note_01KNWCMZZ65N5YA21AKYNJSM1T
---
用专门训练的小模型（如 Llama 2 微调版）做评估，比用通用大模型做评估的方向更值得关注。通用 LLM-as-judge 方案存在一个隐患：评估者的判断标准难以稳定，且随基座模型版本迭代而漂移。而训练一个专属评估模型，相当于将「评估标准」固化成可版本控制的工件——这与软件工程中「测试是规约的另一种表达」的思想高度一致。评估模型的权重就是评估标准的持久化；这让评估本身成了一个可以被 CI 可靠复现的确定性过程，而不是依赖某个特定 API 调用的随机采样。

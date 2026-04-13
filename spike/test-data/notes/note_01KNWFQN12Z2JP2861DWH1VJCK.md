---
id: note_01KNWFQN12Z2JP2861DWH1VJCK
type: note
text: >-
  基于嵌入的检索（向量搜索）的工作原理：用嵌入模型（如 BERT、sentence-transformers、OpenAI/Google
  的专有模型）将数据块转换为向量，再通过 ANN 算法（如 FAISS、ScaNN、ANNOY、hnswlib）检索最近邻。评估 ANN
  算法的四个核心指标：召回率、每秒查询数（QPS）、构建时间、索引大小，这四者之间存在索引与查询的权衡关系。
role: claim
source: src_01KNWFKAFTHAGSKA9T49619BS1
status: active
created_at: '2026-04-10T20:01:02.981Z'
evidence:
  - text: >-
      基于嵌入的检索（也称为向量搜索）您可以使用嵌入模型将数据块转换为嵌入向量，如BERT、sentence-transformers和 OpenAI 或
      Google
      提供的专有嵌入模型。给定一个查询，通过向量搜索算法检索与查询嵌入最接近的数据。向量搜索通常被视为最近邻搜索，使用近似最近邻（ANN）算法，如FAISS（Facebook
      AI 相似搜索）、Google 的ScaNN、Spotify 的ANNOY和hnswlib（分层导航小世界）。
    source: src_01KNWFKAFTHAGSKA9T49619BS1
    locator: 'src_01KNWFKAFTHAGSKA9T49619BS1, note 7'
qualifier: certain
voice: restated
scope: detail
supports:
  - note_01KNWFC1M44VDMGV8X7VNR3JEG
---
基于嵌入的检索（向量搜索）的工作原理：用嵌入模型（如 BERT、sentence-transformers、OpenAI/Google 的专有模型）将数据块转换为向量，再通过 ANN 算法（如 FAISS、ScaNN、ANNOY、hnswlib）检索最近邻。评估 ANN 算法的四个核心指标：召回率、每秒查询数（QPS）、构建时间、索引大小，这四者之间存在索引与查询的权衡关系。

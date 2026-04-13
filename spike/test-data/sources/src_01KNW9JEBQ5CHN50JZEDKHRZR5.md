---
id: src_01KNW9JEBQ5CHN50JZEDKHRZR5
type: source
source_type: markdown
title: equipping-agents-for-the-real-world-with-agent-skills
word_count: 79
raw_file: raw/src_01KNW9JEBQ5CHN50JZEDKHRZR5.md
ingested_at: '2026-04-10T18:13:20.887Z'
created_at: '2026-04-10T18:13:20.887Z'
status: active
---
# Equipping agents for the real world with Agent Skills

Reading notes and highlights from this source.

- Skills 中 Scripts 的作用
  - 脚本适合的场景：
    - 重复性高的操作
    - 排序、计算等确定性操作
    - 需要精确逻辑的任务
  - 有些事情用代码做比用 LLM 生成更好
  - 具体好处
    - 省 token：脚本和被处理的文件都不用进上下文
    - 效率：运行排序算法 << 用 token 生成排序结果
    - 可靠性：代码是确定性的，LLM 不是
- Skills 设计的最佳实践
  - 结构化拆分: SKILL.md 太长就拆。互斥的内容分开放，省 token。
  - 从评估开始，别猜: 别预先猜 Claude 需要什么。先跑任务，观察哪里卡住，再针对性地补。
  - 让 Claude 自己改进 Skill: 跑完任务后让 Claude 总结：什么方法有效、哪里出错了。然后更新 Skill。
  - 关注 name 和 description: 这两个字段决定 Claude 会不会触发你的 Skill。写不好等于白写。

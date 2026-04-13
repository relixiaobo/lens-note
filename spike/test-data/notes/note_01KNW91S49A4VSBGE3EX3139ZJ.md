---
id: note_01KNW91S49A4VSBGE3EX3139ZJ
type: note
text: >-
  assets/ introduces a third context relationship not addressed in previous
  notes about progressive disclosure or lazy loading: *permanent exclusion*
  combined with *indirect reference*. scripts/ results enter context;
  references/ text enters context on demand; but assets/ content never enters
  context at all — only file paths are used. This makes assets/ the only purely
  filesystem-resident artifact class. The implication: for binary or structured
  non-text content (images, fonts, CSS, config templates), the model can
  coordinate *use* of the resource without internalizing *content* of the
  resource. The model acts as a pointer-holder, not a content-holder.
role: observation
source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
status: active
created_at: '2026-04-10T18:04:14.841Z'
evidence:
  - text: 'assets/: 相关静态资源，包括HTML 模板、CSS 文件、图像、配置模板或字体等，仅通过路径引用的文件，不加载到上下文'
    source: src_01KNW8Z9C7Y72AHDJZPDCKCTCJ
    locator: assets/ description bullet
qualifier: presumably
voice: synthesized
scope: detail
structure_type: description
supports:
  - note_01KNW91S4B4A41AFKPNEG9XRY6
---
assets/ introduces a third context relationship not addressed in previous notes about progressive disclosure or lazy loading: *permanent exclusion* combined with *indirect reference*. scripts/ results enter context; references/ text enters context on demand; but assets/ content never enters context at all — only file paths are used. This makes assets/ the only purely filesystem-resident artifact class. The implication: for binary or structured non-text content (images, fonts, CSS, config templates), the model can coordinate *use* of the resource without internalizing *content* of the resource. The model acts as a pointer-holder, not a content-holder.

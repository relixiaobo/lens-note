---
id: note_01KNXJHG4VTGWQ9GQJ8EWV489F
type: note
text: >-
  The isotropy approximation here — assuming cluster-wise uniform variance in
  embedding space so that distances collapse to Euclidean — is exactly the same
  logical move as assuming Gaussian noise in signal processing to justify
  least-squares methods. In both cases, a distributional assumption that is
  probably not literally true enables a dramatic simplification of computation
  while preserving practical accuracy. The value isn't that isotropy is
  empirically exact; the value is that it holds *well enough* that the cheaper
  distance metric doesn't degrade results. This suggests a general design
  principle: the right approximating assumption unlocks a whole class of
  computationally tractable methods, and finding that assumption is often the
  core theoretical contribution.
role: observation
source: src_01KNXJETA7A3CT07N4Q0MMRNKE
status: active
created_at: '2026-04-11T06:09:21.542Z'
evidence:
  - text: >-
      Theoretical and empirical evidence to support an approximation of uniform
      cluster-wise isotropy are shown, which allows us to reduce the distances
      to simple Euclidean distances.
    source: src_01KNXJETA7A3CT07N4Q0MMRNKE
    locator: abstract
qualifier: likely
voice: synthesized
scope: big_picture
structure_type: argument
---
The isotropy approximation here — assuming cluster-wise uniform variance in embedding space so that distances collapse to Euclidean — is exactly the same logical move as assuming Gaussian noise in signal processing to justify least-squares methods. In both cases, a distributional assumption that is probably not literally true enables a dramatic simplification of computation while preserving practical accuracy. The value isn't that isotropy is empirically exact; the value is that it holds *well enough* that the cheaper distance metric doesn't degrade results. This suggests a general design principle: the right approximating assumption unlocks a whole class of computationally tractable methods, and finding that assumption is often the core theoretical contribution.

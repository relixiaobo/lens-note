---
id: note_01KP13EEEMZA2P77YTDGVGJ6F8
type: note
text: >-
  Publishing TypeScript CLI tools to npm requires shipping compiled JavaScript,
  not raw .ts files. Every major CLI tool (create-next-app, tsx, vitest) uses
  tsup to bundle into a single JS file with shebang #!/usr/bin/env node.
  Shipping .ts with #!/usr/bin/env tsx fails on global install because tsx ends
  up in node_modules, not in PATH.
status: active
created_at: '2026-04-12T15:02:30.612Z'
role: claim
qualifier: certain
voice: synthesized
scope: big_picture
---
Publishing TypeScript CLI tools to npm requires shipping compiled JavaScript, not raw .ts files. Every major CLI tool (create-next-app, tsx, vitest) uses tsup to bundle into a single JS file with shebang #!/usr/bin/env node. Shipping .ts with #!/usr/bin/env tsx fails on global install because tsx ends up in node_modules, not in PATH.

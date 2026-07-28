# Project Rules for Novel

## Direct Publishing Instruction
- Whenever the user asks to publish (e.g. "publique", "suba", "publique por aqui", "publique no novel.art.br"), automatically execute the complete publish pipeline without asking:
  1. Synchronize all modified files from `Novel_v2` to `Novel_`.
  2. Run `git add .` in `Novel_`.
  3. Create a git commit with a clear summary message.
  4. Run `git push origin main` directly.

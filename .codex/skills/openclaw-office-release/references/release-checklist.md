# OpenClaw Office Release Checklist

## 1. Inspect state

```bash
git status --short --branch
git log --oneline --decorate --graph --all -10
git diff --name-status develop..main
```

## 2. Update `main`

```bash
git checkout main
git merge --ff-only develop
```

If `main` contains release-only code commits, keep them. If it contains document cleanup, leave that cleanup as the last `main`-only commit.

## 3. Bump version

Update `package.json`, then commit:

```bash
git add package.json
git commit -m "chore: release <version>"
```

## 4. Test gates

```bash
pnpm test
pnpm typecheck
pnpm build
```

## 5. Pre-publish package validation

```bash
npm pack --cache /tmp/npm-cache --json
npm install -g ./ww-ai-lab-openclaw-office-<version>.tgz --cache /tmp/npm-cache
openclaw-office --port 5181
```

Preferred verification:

- Open `http://localhost:5181/#/dashboard` in a browser.
- Confirm the app loads against the local Gateway.
- Confirm the bundle no longer contains unexpected dynamic adapter chunk fetch failures.

Fallback HTTP verification:

```bash
curl -sS http://127.0.0.1:5181/ | rg "__OPENCLAW_CONFIG__|assets/index-"
curl -sS http://127.0.0.1:5181/assets/<index-bundle>.js | rg -o "ws-adapter-[A-Za-z0-9_-]+\\.js"
```

The second command should return no matches.

## 6. npm auth and publish

This repo may default to a mirror registry. Always verify against npmjs:

```bash
npm whoami --registry https://registry.npmjs.org --cache /tmp/npm-cache
npm publish --registry https://registry.npmjs.org --access public --cache /tmp/npm-cache
```

## 7. Validate the published package

```bash
npm install -g @ww-ai-lab/openclaw-office@<version> --registry https://registry.npmjs.org --cache /tmp/npm-cache
npm list -g @ww-ai-lab/openclaw-office --depth=0 --registry https://registry.npmjs.org --cache /tmp/npm-cache
openclaw-office --port 5182
```

Checks:

- CLI starts and serves on the requested port.
- Token is auto-detected from `~/.openclaw/openclaw.json` when available.
- Root HTML serves the runtime Gateway config script.

## 8. Clean `main` for GitHub

```bash
git rm -r docs openspec
git commit -m "chore: streamline repository layout"
git push origin main
```

Do not mention the document cleanup in the release notes.

## 9. GitHub release

```bash
gh release create v<version> --repo WW-AI-Lab/openclaw-office --target main --title "v<version>" --notes "<notes>"
```

If the tag or release already exists:

```bash
gh release edit v<version> --repo WW-AI-Lab/openclaw-office --notes "<notes>"
```

## 10. Backport to `develop`

Cherry-pick only the non-document commits from `main`:

```bash
git checkout develop
git cherry-pick <code-commit-1> <code-commit-2>
git push origin develop
```

Do **not** cherry-pick the `docs/` and `openspec/` cleanup commit.

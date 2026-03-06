---
name: openclaw-office-release
description: Release OpenClaw Office to npm and GitHub. Use when the user asks to publish, cut a release, update main and develop together, or run the full OpenClaw Office release workflow with local Gateway verification.
---

# OpenClaw Office Release

Use this skill when releasing this repository to npm and GitHub.

## Branch Policy

- `develop` is the long-lived development branch and keeps `docs/` and `openspec/`.
- `main` is the publish branch and may intentionally omit `docs/` and `openspec/`.
- Do **not** merge `main` back into `develop` wholesale after a release.
- After a release, backport only the non-document commits from `main` into `develop` with `git cherry-pick`.
- Keep the `docs/` and `openspec/` removal as a dedicated final cleanup commit on `main` so it is easy to skip when updating `develop`.

## Required Preconditions

- Worktree is clean before starting a release.
- npm auth must work against `https://registry.npmjs.org`.
- Local OpenClaw Gateway should be available for final verification.
- Prefer releasing from `main` after fast-forwarding or merging in the desired `develop` changes.

## Workflow

1. Inspect branch state and identify the release delta.
   - Check `git status --short --branch`.
   - Check `git log --oneline --decorate --graph --all -10`.
   - If `main` contains cleanup-only commits, note them and do not carry them back to `develop`.

2. Move release-worthy code into `main`.
   - Merge or fast-forward `develop` into `main`.
   - If there are release-only fixes on `main`, keep them as normal code commits.

3. Bump the package version.
   - Update `package.json`.
   - Commit the release version change before publishing.

4. Run release gates.
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`

5. Validate the package before publish.
   - `npm pack --cache /tmp/npm-cache --json`
   - Install the tarball globally.
   - Start `openclaw-office` on a temp port and verify it serves the built app and injects runtime Gateway config.
   - Prefer browser verification. If the browser tool is unavailable, fall back to HTTP checks from the checklist reference.

6. Publish to npm.
   - Always use the official registry:
     `npm publish --registry https://registry.npmjs.org --access public --cache /tmp/npm-cache`
   - This repo may default to `https://registry.npmmirror.com/`; do not publish there.

7. Validate the published package.
   - `npm install -g @ww-ai-lab/openclaw-office@<version> --registry https://registry.npmjs.org --cache /tmp/npm-cache`
   - Start the globally installed CLI on a fresh port.
   - Verify local OpenClaw token auto-detection and app serving.

8. Finalize `main` for GitHub release.
   - Remove `docs/` and `openspec/` on `main` in a dedicated generic commit.
   - Push `main`.
   - Create or update the GitHub release for the version tag.
   - Release notes must list user-visible product changes only; do not mention the document cleanup.

9. Sync release code back to `develop`.
   - Switch to `develop`.
   - Cherry-pick only the non-document commits from `main`.
   - Skip the `docs/` and `openspec/` cleanup commit.
   - Push `develop`.

## Release Notes Guidance

- Focus on features, configuration lifecycle changes, adapter reliability, and user-visible fixes.
- Exclude internal document cleanup and branch-management mechanics.
- If a tag already exists, use `gh release edit` instead of creating a second release.

## Commands Reference

Read [references/release-checklist.md](references/release-checklist.md) for the exact command sequence and verification points.

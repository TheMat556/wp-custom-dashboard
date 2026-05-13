# Release Checklist

## Prerequisites

- [ ] All release-blocker issues resolved (see Known Issues in `AGENTS.md`)
- [ ] Working on `develop` with all feature PRs merged
- [ ] CI passes on `develop` — verify `lint.yml` and `test.yml` workflows are green

## Step 1: Bump version

- [ ] Update the `Version:` header in `wp-custom-dashboard.php` to the new version
- [ ] Commit: `git commit -m "chore: bump version to X.Y.Z"`
- [ ] Push to `develop`

## Step 2: Merge to main

- [ ] Open PR from `develop` → `main`
- [ ] Verify `lint.yml` and `test.yml` CI workflows pass on the PR
- [ ] Merge the PR

## Step 3: Tag the release

```bash
git checkout main
git pull origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

This triggers the `Release` workflow (`.github/workflows/release.yml`).

## Step 4: Verify release

- [ ] GitHub Actions `Release` workflow completes successfully
- [ ] GitHub Release created with zip + SHA256 attached on the Releases page
- [ ] Download zip and deploy to a test environment

### Optional: manual smoke-test via `workflow_dispatch`

For pre-release validation, go to **GitHub → Actions → Release → "Run workflow"** on the `main` branch. This runs all checks and produces a downloadable zip artifact (no GitHub Release is created on manual runs). Note that this artifact carries a `-dev` version suffix and is **not** bit-identical to the tag-based release.

## Step 5: Post-deploy smoke test

Verify the deployed plugin works correctly:

- [ ] Dashboard loads and renders correctly
- [ ] Sidebar navigation works (collapse, expand, mobile drawer)
- [ ] Theme toggle (light / dark)
- [ ] Profile dropdown and logout
- [ ] Breakout pages (`post.php`, `post-new.php`, `site-editor.php`)

## Known issues

### Dev server URL must use `localhost`, not `127.0.0.1`

The license server URL validator (`validate_uri_structure`) rejects IP literals at save time.
Local development setups must use `http://localhost:PORT/` instead of `http://127.0.0.1:PORT/`.
The `*.test` and `*.local` TLDs are also allowed for dev.

### Tag format

Tags must match `vMAJOR.MINOR.PATCH` with an optional `-(alpha|beta|rc)[.N]` prerelease suffix.
Tags like `v1.2.3-foo` are rejected by the tag-format validation step.

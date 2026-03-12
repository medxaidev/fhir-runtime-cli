# Publishing Guide

This guide explains how to publish `fhir-runtime-cli` to npm and GitHub.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm Login**: Run `npm login` to authenticate
3. **GitHub Repository**: Create a repository on GitHub
4. **Git Setup**: Configure git with your credentials

## Pre-publish Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Version is updated in `package.json` and `src/index.ts`
- [ ] CHANGELOG.md is updated
- [ ] README.md is complete
- [ ] LICENSE file exists
- [ ] `.npmignore` is configured correctly

## Publishing to npm

### First Time Setup

1. **Login to npm**:
   ```bash
   npm login
   ```

2. **Verify package name availability**:
   ```bash
   npm search fhir-runtime-cli
   ```

### Publishing Steps

1. **Update version**:
   ```bash
   # For patch release (0.1.0 -> 0.1.1)
   npm version patch
   
   # For minor release (0.1.0 -> 0.2.0)
   npm version minor
   
   # For major release (0.1.0 -> 1.0.0)
   npm version major
   ```

2. **Build and test**:
   ```bash
   npm run prepublishOnly
   ```
   This runs tests and builds the package.

3. **Dry run** (optional but recommended):
   ```bash
   npm publish --dry-run
   ```
   This shows what files will be included without actually publishing.

4. **Publish**:
   ```bash
   npm publish
   ```

5. **Verify**:
   ```bash
   npm view fhir-runtime-cli
   ```

### Publishing Scoped Packages

If using a scoped package (e.g., `@yourorg/fhir-runtime-cli`):

```bash
npm publish --access public
```

## Publishing to GitHub

### Initial Setup

1. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `fhir-runtime-cli`
   - Description: "Command-line tool for FHIR R4 resources"
   - Public or Private
   - Don't initialize with README (we already have one)

2. **Add remote and push**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/fhir-runtime-cli.git
   git branch -M main
   git push -u origin main
   ```

### Creating a Release

1. **Tag the version**:
   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push origin v0.1.0
   ```

2. **Create GitHub Release**:
   - Go to your repository on GitHub
   - Click "Releases" → "Create a new release"
   - Choose the tag you just created
   - Title: `v0.1.0`
   - Description: Copy from CHANGELOG.md
   - Click "Publish release"

## Automated Publishing with GitHub Actions

The repository includes a CI workflow (`.github/workflows/ci.yml`) that runs tests on push.

To add automated npm publishing, create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run prepublishOnly
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setting up NPM_TOKEN

1. Generate npm token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. Add to GitHub secrets:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your npm token
   - Click "Add secret"

## Version Management

### Semantic Versioning

Follow [semver](https://semver.org/):

- **PATCH** (0.1.0 → 0.1.1): Bug fixes, no API changes
- **MINOR** (0.1.0 → 0.2.0): New features, backward compatible
- **MAJOR** (0.1.0 → 1.0.0): Breaking changes

### Version Update Workflow

1. Update `package.json`:
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. Update `src/index.ts`:
   ```typescript
   .version('0.2.0');
   ```

3. Update `CHANGELOG.md`:
   ```markdown
   ## [0.2.0] - 2026-03-15
   
   ### Added
   - New feature X
   
   ### Fixed
   - Bug Y
   ```

4. Commit changes:
   ```bash
   git add .
   git commit -m "chore: bump version to 0.2.0"
   ```

5. Create tag:
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   ```

6. Push:
   ```bash
   git push origin main
   git push origin v0.2.0
   ```

7. Publish to npm:
   ```bash
   npm publish
   ```

## Troubleshooting

### "You do not have permission to publish"

- Verify you're logged in: `npm whoami`
- Check package name isn't taken: `npm search fhir-runtime-cli`
- For scoped packages, use `npm publish --access public`

### "Version already exists"

- Update version number in `package.json`
- You cannot overwrite published versions

### "Files missing in published package"

- Check `.npmignore` configuration
- Run `npm publish --dry-run` to preview
- Ensure `files` field in `package.json` includes necessary directories

### "Tests failing in CI"

- Run tests locally: `npm test`
- Check Node.js version matches CI
- Verify all dependencies are in `package.json`

## Post-publish Tasks

After publishing:

1. **Verify installation**:
   ```bash
   npm install -g fhir-runtime-cli
   fhir --version
   ```

2. **Update documentation**:
   - Update README badges if needed
   - Announce on relevant channels

3. **Monitor issues**:
   - Watch GitHub issues
   - Respond to npm feedback

## Unpublishing (Emergency Only)

If you need to unpublish a version (only within 72 hours):

```bash
npm unpublish fhir-runtime-cli@0.1.0
```

**Warning**: Unpublishing is discouraged. Prefer deprecating:

```bash
npm deprecate fhir-runtime-cli@0.1.0 "This version has critical bugs, please upgrade"
```

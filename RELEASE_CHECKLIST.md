# Release Checklist for v0.1.0

## Pre-release Verification

### Code Quality
- [x] All 123 tests passing (`npm test`)
- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] No linting errors
- [x] Code coverage acceptable

### Version Management
- [x] Version updated to 0.1.0 in `package.json`
- [x] Version updated to 0.1.0 in `src/index.ts`
- [x] CHANGELOG.md updated with v0.1.0 changes
- [x] All version references consistent

### Documentation
- [x] README.md complete with all commands
- [x] Getting Started guide created (`docs/getting-started.md`)
- [x] Command Reference created (`docs/command-reference.md`)
- [x] Examples guide created (`docs/examples.md`)
- [x] Publishing guide created (`docs/publishing.md`)
- [x] LICENSE file exists
- [x] CHANGELOG.md exists

### Package Configuration
- [x] package.json metadata correct:
  - [x] name: `fhir-runtime-cli`
  - [x] version: `0.1.0`
  - [x] description accurate
  - [x] keywords comprehensive
  - [x] repository URL (update YOUR_USERNAME)
  - [x] homepage URL (update YOUR_USERNAME)
  - [x] bugs URL (update YOUR_USERNAME)
  - [x] bin entry points to `./bin/fhir.js`
  - [x] main/module/types exports configured
  - [x] files array includes necessary files
  - [x] engines specifies Node >= 18
- [x] .npmignore configured to exclude dev files
- [x] .gitignore configured

### Build & Distribution
- [ ] Run `npm run build` successfully
- [ ] Verify `dist/` directory contains:
  - [ ] `dist/cjs/` with CommonJS files
  - [ ] `dist/esm/` with ES modules
  - [ ] `dist/index.d.ts` type definitions
- [ ] Run `npm publish --dry-run` and verify output
- [ ] Test installation: `npm link` and verify `fhir --version`

### CI/CD
- [x] `.github/workflows/ci.yml` configured
- [x] `.github/workflows/publish.yml` configured
- [ ] GitHub repository created
- [ ] NPM_TOKEN secret configured in GitHub

### Functional Testing
- [ ] Test all commands manually:
  - [ ] `fhir validate fixtures/patient-valid.json`
  - [ ] `fhir fhirpath "Patient.name" fixtures/patient-valid.json`
  - [ ] `fhir inspect fixtures/patient-valid.json`
  - [ ] `fhir bundle analyze fixtures/bundle-collection.json`
  - [ ] `fhir convert fixtures/patient-valid.json test.yaml`
  - [ ] `fhir profile show http://hl7.org/fhir/StructureDefinition/Patient`
  - [ ] `fhir compose fixtures/patient-template.yaml`
  - [ ] `fhir search validate fixtures/search-param-name.json`

## GitHub Release Steps

1. **Update repository URLs** in package.json:
   ```bash
   # Replace YOUR_USERNAME with actual GitHub username
   sed -i 's/YOUR_USERNAME/your-actual-username/g' package.json
   ```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `fhir-runtime-cli`
   - Public repository
   - Don't initialize with README

3. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "chore: initial release v0.1.0"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fhir-runtime-cli.git
   git push -u origin main
   ```

4. **Create and push tag**:
   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push origin v0.1.0
   ```

5. **Create GitHub Release**:
   - Go to repository → Releases → Create new release
   - Tag: `v0.1.0`
   - Title: `v0.1.0 - Initial Release`
   - Description: Copy from CHANGELOG.md
   - Publish release

## npm Publishing Steps

1. **Login to npm**:
   ```bash
   npm login
   ```

2. **Verify package name**:
   ```bash
   npm search fhir-runtime-cli
   ```

3. **Build package**:
   ```bash
   npm run prepublishOnly
   ```

4. **Dry run**:
   ```bash
   npm publish --dry-run
   ```
   
   Verify output includes:
   - dist/
   - bin/
   - README.md
   - LICENSE
   - CHANGELOG.md
   - package.json

5. **Publish**:
   ```bash
   npm publish
   ```

6. **Verify publication**:
   ```bash
   npm view fhir-runtime-cli
   ```

## Post-release Verification

1. **Test global installation**:
   ```bash
   npm install -g fhir-runtime-cli
   fhir --version
   # Should output: 0.1.0
   ```

2. **Test npx usage**:
   ```bash
   npx fhir-runtime-cli --version
   ```

3. **Verify on npm**:
   - Visit https://www.npmjs.com/package/fhir-runtime-cli
   - Check README displays correctly
   - Verify version is 0.1.0

4. **Verify on GitHub**:
   - Check release is visible
   - Verify CI badge (if added to README)

## Rollback Plan

If issues are discovered after publishing:

1. **Deprecate version** (preferred):
   ```bash
   npm deprecate fhir-runtime-cli@0.1.0 "Critical bug found, please upgrade to 0.1.1"
   ```

2. **Unpublish** (only within 72 hours, not recommended):
   ```bash
   npm unpublish fhir-runtime-cli@0.1.0
   ```

3. **Publish fixed version**:
   ```bash
   npm version patch  # 0.1.0 -> 0.1.1
   npm run prepublishOnly
   npm publish
   ```

## Notes

- **First publish**: This is the initial v0.1.0 release
- **Breaking changes**: Not applicable for initial release
- **Migration guide**: Not needed for initial release
- **Announcement**: Consider announcing on:
  - FHIR community forums
  - Twitter/X
  - LinkedIn
  - Relevant Slack/Discord channels

## Completion

- [ ] All checklist items completed
- [ ] Package published to npm
- [ ] GitHub release created
- [ ] Installation verified
- [ ] Documentation accessible
- [ ] CI/CD working

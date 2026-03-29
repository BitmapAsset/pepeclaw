# Contributing to PepeClaw

We welcome contributions! Here's how to get involved.

## Quick Start

```bash
git clone https://github.com/BitmapAsset/pepeclaw.git
cd pepeclaw
npm install
npm run dev
```

## How to Contribute

### Report Bugs
Open an issue describing the bug, your environment (OS, bash version), and steps to reproduce.

### Suggest Features
Open an issue with the `[feature]` tag. Explain how it compounds with existing systems — the best PepeClaw features make other systems better.

### Submit a Skill Mutation
Found a better approach for an existing skill? Submit a "mutation PR":

1. Fork the repo
2. Modify the skill's scripts
3. Run the tests: `bash tests/test-<skill-name>.sh`
4. Submit a PR with before/after fitness data if available

### Add a New System
1. Create `skills/<system-name>/SKILL.md` with genome header
2. Add scripts in `skills/<system-name>/scripts/`
3. Add reference docs in `skills/<system-name>/references/`
4. Write tests in `tests/test-<system-name>.sh`
5. Update the architecture docs

## Code Standards

- All scripts must be POSIX-compatible bash (not zsh-specific)
- No hardcoded paths — use `$OPENCLAW_WORKSPACE` or auto-detect
- Include error handling with helpful error messages
- Use `set -euo pipefail` in all scripts
- Test on both macOS and Linux

## Skill YAML Frontmatter

Every `SKILL.md` must include a genome header:

```yaml
name: skill-name
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: null
    created: YYYY-MM-DD
    last_mutated: null
    generation: 1
  tags: [relevant, tags]
  dependencies: []
```

## Running Tests

```bash
# Run the vitest test suite (mock data, gateway, data provider, skills validation)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run skill-specific bash tests
for test in tests/test-*.sh; do bash "$test"; done
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

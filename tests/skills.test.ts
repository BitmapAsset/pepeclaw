import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SKILLS_DIR = join(__dirname, '..', 'skills');

const EXPECTED_SKILLS = [
  'skill-genome',
  'predictive-intent',
  'dream-mode',
  'meta-learning',
  'adversarial-red-team',
  'project-war-room',
  'temporal-arbitrage',
];

describe('Skills Directory Validation', () => {
  it('skills directory exists', () => {
    expect(existsSync(SKILLS_DIR)).toBe(true);
  });

  it('all 7 expected skills exist', () => {
    const dirs = readdirSync(SKILLS_DIR);
    for (const skill of EXPECTED_SKILLS) {
      expect(dirs).toContain(skill);
    }
  });

  for (const skill of EXPECTED_SKILLS) {
    describe(`Skill: ${skill}`, () => {
      const skillDir = join(SKILLS_DIR, skill);

      it('has SKILL.md', () => {
        expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true);
      });

      it('SKILL.md has genome header', () => {
        const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
        expect(content).toContain('genome:');
        expect(content).toContain('name:');
        expect(content).toContain('version:');
      });

      it('has scripts directory', () => {
        expect(existsSync(join(skillDir, 'scripts'))).toBe(true);
      });

      it('scripts use bash with error handling', () => {
        const scriptsDir = join(skillDir, 'scripts');
        const scripts = readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
        expect(scripts.length).toBeGreaterThan(0);

        for (const script of scripts) {
          const content = readFileSync(join(scriptsDir, script), 'utf-8');
          expect(content).toMatch(/^#!\/usr\/bin\/env bash/);
          expect(content).toContain('set -euo pipefail');
        }
      });

      it('has no hardcoded personal paths', () => {
        const scriptsDir = join(skillDir, 'scripts');
        const scripts = readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));

        for (const script of scripts) {
          const content = readFileSync(join(scriptsDir, script), 'utf-8');
          expect(content).not.toMatch(/\/Users\/\w+/);
          expect(content).not.toMatch(/\/home\/\w+(?!\/)/); // Allow $HOME patterns
          expect(content).not.toContain('gravity');
        }
      });

      it('has references directory', () => {
        expect(existsSync(join(skillDir, 'references'))).toBe(true);
      });

      it('SKILL.md does not contain personal data', () => {
        const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
        expect(content).not.toMatch(/\/Users\/\w+/);
        expect(content).not.toContain('gravity');
      });
    });
  }
});

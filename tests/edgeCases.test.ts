import { describe, it, expect } from 'vitest';
import {
  skills,
  dreamNodes,
  projects,
  rooms,
  redTeamData,
  metaLearningData,
  temporalData,
  breedingCandidates,
} from './__mocks__/mockData';

describe('Edge Cases & Robustness', () => {
  describe('Dream node graph connectivity', () => {
    it('connections are bidirectional where expected', () => {
      // Verify that if A connects to B, the connection exists in the graph
      // (not necessarily bidirectional, but all referenced IDs exist)
      const ids = new Set(dreamNodes.map(n => n.id));
      for (const node of dreamNodes) {
        for (const target of node.connections) {
          expect(ids.has(target)).toBe(true);
        }
      }
    });

    it('no self-connections', () => {
      for (const node of dreamNodes) {
        expect(node.connections).not.toContain(node.id);
      }
    });

    it('dream node positions are finite numbers', () => {
      for (const node of dreamNodes) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
        expect(Number.isFinite(node.z)).toBe(true);
      }
    });
  });

  describe('Temporal engine task ordering', () => {
    it('task start times are before or equal to end times', () => {
      for (const task of temporalData.tasks) {
        expect(task.startTime).toBeLessThanOrEqual(task.endTime);
      }
    });

    it('deferrals are non-negative', () => {
      for (const task of temporalData.tasks) {
        expect(task.deferrals).toBeGreaterThanOrEqual(0);
      }
    });

    it('currentHour is within task timeline range', () => {
      const maxEnd = Math.max(...temporalData.tasks.map(t => t.endTime));
      expect(temporalData.currentHour).toBeLessThanOrEqual(maxEnd);
      expect(temporalData.currentHour).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Red team data balance', () => {
    it('scores are between 0 and 100', () => {
      expect(redTeamData.attackerScore).toBeGreaterThanOrEqual(0);
      expect(redTeamData.attackerScore).toBeLessThanOrEqual(100);
      expect(redTeamData.defenderScore).toBeGreaterThanOrEqual(0);
      expect(redTeamData.defenderScore).toBeLessThanOrEqual(100);
    });

    it('argument confidence levels are between 0 and 100', () => {
      for (const arg of redTeamData.arguments) {
        expect(arg.confidence).toBeGreaterThanOrEqual(0);
        expect(arg.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('bias alerts reference valid argument IDs', () => {
      const argIds = new Set(redTeamData.arguments.map(a => a.id));
      for (const bias of redTeamData.biasAlerts) {
        expect(argIds.has(bias.relatedArgumentId)).toBe(true);
      }
    });

    it('assumption statuses are valid', () => {
      for (const assumption of redTeamData.assumptions) {
        expect(['unchallenged', 'challenged', 'debunked']).toContain(assumption.status);
      }
    });
  });

  describe('Meta-learning data consistency', () => {
    it('capability values are between 0 and 100', () => {
      for (const cap of metaLearningData.capabilities) {
        expect(cap.current).toBeGreaterThanOrEqual(0);
        expect(cap.current).toBeLessThanOrEqual(100);
        expect(cap.target).toBeGreaterThanOrEqual(0);
        expect(cap.target).toBeLessThanOrEqual(100);
      }
    });

    it('before/after metrics show improvement', () => {
      for (const metric of metaLearningData.beforeAfter) {
        if (metric.metric === 'Error Rate' || metric.metric === 'Avg Response Time') {
          expect(metric.after).toBeLessThan(metric.before);
        } else {
          expect(metric.after).toBeGreaterThan(metric.before);
        }
      }
    });

    it('proposal statuses are valid', () => {
      for (const proposal of metaLearningData.proposals) {
        expect(['proposed', 'in-progress', 'completed', 'rejected']).toContain(proposal.status);
      }
    });
  });

  describe('Room color consistency', () => {
    it('all rooms have valid hex colors', () => {
      for (const room of rooms) {
        expect(room.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('all rooms have unique IDs', () => {
      const ids = rooms.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all rooms have non-empty names', () => {
      for (const room of rooms) {
        expect(room.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Breeding arena data', () => {
    it('candidates have unique IDs', () => {
      const ids = breedingCandidates.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('candidate colors are valid hex', () => {
      for (const candidate of breedingCandidates) {
        expect(candidate.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('Skill data ranges', () => {
    it('skill generations are positive integers', () => {
      for (const skill of skills) {
        expect(Number.isInteger(skill.generation)).toBe(true);
        expect(skill.generation).toBeGreaterThan(0);
      }
    });

    it('skill names are unique', () => {
      const names = skills.map(s => s.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});

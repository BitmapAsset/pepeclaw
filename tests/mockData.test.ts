import { describe, it, expect } from 'vitest';
import {
  skills,
  dreamNodes,
  projects,
  rooms,
  redTeamData,
  metaLearningData,
  temporalData,
  mockThoughts,
  mockActivities,
  breedingCandidates,
  emotionColors,
  activityToEmotion,
} from './__mocks__/mockData';

describe('Mock Data Integrity', () => {
  it('skills array has entries with valid structure', () => {
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(skill.name).toBeTruthy();
      expect(skill.fitness).toBeGreaterThanOrEqual(0);
      expect(skill.fitness).toBeLessThanOrEqual(100);
      expect(skill.generation).toBeGreaterThanOrEqual(0);
      expect(['stable', 'mutating', 'evolved']).toContain(skill.status);
      expect(skill.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('dreamNodes have unique IDs and valid connections', () => {
    const ids = new Set(dreamNodes.map(n => n.id));
    expect(ids.size).toBe(dreamNodes.length);
    for (const node of dreamNodes) {
      for (const connId of node.connections) {
        expect(ids.has(connId)).toBe(true);
      }
    }
  });

  it('projects have valid health scores and statuses', () => {
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(project.health).toBeGreaterThanOrEqual(0);
      expect(project.health).toBeLessThanOrEqual(100);
      expect(['green', 'yellow', 'red']).toContain(project.status);
      expect(project.velocity.length).toBeGreaterThan(0);
    }
  });

  it('rooms cover all 8 room IDs', () => {
    const expectedIds = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity', 'breeding'];
    const roomIds = rooms.map(r => r.id);
    for (const id of expectedIds) {
      expect(roomIds).toContain(id);
    }
  });

  it('redTeamData has balanced arguments from both sides', () => {
    const attackerArgs = redTeamData.arguments.filter(a => a.agent === 'attacker');
    const defenderArgs = redTeamData.arguments.filter(a => a.agent === 'defender');
    expect(attackerArgs.length).toBeGreaterThan(0);
    expect(defenderArgs.length).toBeGreaterThan(0);
  });

  it('metaLearningData has consistent time series lengths', () => {
    const { accuracy, responseTime, taskCompletion } = metaLearningData.performanceMetrics;
    expect(accuracy.length).toBe(responseTime.length);
    expect(responseTime.length).toBe(taskCompletion.length);
  });

  it('temporalData tasks reference valid batch IDs', () => {
    const batchIds = new Set(temporalData.batches.map(b => b.id));
    for (const task of temporalData.tasks) {
      expect(batchIds.has(task.batchId)).toBe(true);
    }
  });

  it('mockThoughts reference valid agent IDs', () => {
    expect(mockThoughts.length).toBeGreaterThan(0);
    for (const thought of mockThoughts) {
      expect(thought.id).toBeTruthy();
      expect(thought.agentId).toBeTruthy();
      expect(thought.text).toBeTruthy();
      expect(['reasoning', 'decision', 'observation', 'question']).toContain(thought.type);
    }
  });

  it('mockActivities have valid room references', () => {
    const validRooms = rooms.map(r => r.id);
    for (const activity of mockActivities) {
      expect(validRooms).toContain(activity.room);
    }
  });

  it('breedingCandidates have skills with valid fitness', () => {
    expect(breedingCandidates.length).toBeGreaterThanOrEqual(2);
    for (const candidate of breedingCandidates) {
      expect(candidate.skills.length).toBeGreaterThan(0);
      for (const skill of candidate.skills) {
        expect(skill.fitness).toBeGreaterThanOrEqual(0);
        expect(skill.fitness).toBeLessThanOrEqual(100);
      }
    }
  });

  it('emotionColors covers all emotion states', () => {
    const emotions = ['focused', 'creative', 'stressed', 'curious', 'satisfied'];
    for (const emotion of emotions) {
      expect(emotionColors[emotion as keyof typeof emotionColors]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('activityToEmotion maps all activities to valid emotions', () => {
    const validEmotions = Object.keys(emotionColors);
    for (const emotion of Object.values(activityToEmotion)) {
      expect(validEmotions).toContain(emotion);
    }
  });
});

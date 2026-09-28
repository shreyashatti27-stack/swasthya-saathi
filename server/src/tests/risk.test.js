import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyBPRisk,
  classifySugarRisk,
  evaluateReadingRisk,
  calculateNextScheduledDate,
  isVisitMissed,
  RISK_LEVELS,
} from '../services/risk.js';

describe('SwasthyaSaathi Clinical Risk Service Unit Tests', () => {

  describe('Blood Pressure Risk Classification', () => {
    test('Severe BP: Systolic >= 180', () => {
      assert.equal(classifyBPRisk(180, 85), RISK_LEVELS.SEVERE);
      assert.equal(classifyBPRisk(195, 100), RISK_LEVELS.SEVERE);
    });

    test('Severe BP: Diastolic >= 110', () => {
      assert.equal(classifyBPRisk(130, 110), RISK_LEVELS.SEVERE);
      assert.equal(classifyBPRisk(150, 115), RISK_LEVELS.SEVERE);
    });

    test('Uncontrolled BP: Systolic >= 140 or Diastolic >= 90', () => {
      assert.equal(classifyBPRisk(140, 80), RISK_LEVELS.UNCONTROLLED);
      assert.equal(classifyBPRisk(135, 90), RISK_LEVELS.UNCONTROLLED);
      assert.equal(classifyBPRisk(160, 95), RISK_LEVELS.UNCONTROLLED);
    });

    test('Controlled BP: Systolic < 140 and Diastolic < 90', () => {
      assert.equal(classifyBPRisk(120, 80), RISK_LEVELS.CONTROLLED);
      assert.equal(classifyBPRisk(138, 88), RISK_LEVELS.CONTROLLED);
      assert.equal(classifyBPRisk(110, 70), RISK_LEVELS.CONTROLLED);
    });
  });

  describe('Blood Sugar Risk Classification', () => {
    test('Severe Fasting Sugar: >= 300', () => {
      assert.equal(classifySugarRisk(300, 'fasting'), RISK_LEVELS.SEVERE);
      assert.equal(classifySugarRisk(350, 'fasting'), RISK_LEVELS.SEVERE);
    });

    test('Severe Random Sugar: >= 400', () => {
      assert.equal(classifySugarRisk(400, 'random'), RISK_LEVELS.SEVERE);
      assert.equal(classifySugarRisk(450, 'random'), RISK_LEVELS.SEVERE);
    });

    test('Uncontrolled Fasting Sugar: >= 126 and < 300', () => {
      assert.equal(classifySugarRisk(126, 'fasting'), RISK_LEVELS.UNCONTROLLED);
      assert.equal(classifySugarRisk(210, 'fasting'), RISK_LEVELS.UNCONTROLLED);
    });

    test('Uncontrolled Random Sugar: >= 200 and < 400', () => {
      assert.equal(classifySugarRisk(200, 'random'), RISK_LEVELS.UNCONTROLLED);
      assert.equal(classifySugarRisk(280, 'random'), RISK_LEVELS.UNCONTROLLED);
    });

    test('Controlled Fasting & Random Sugar', () => {
      assert.equal(classifySugarRisk(95, 'fasting'), RISK_LEVELS.CONTROLLED);
      assert.equal(classifySugarRisk(120, 'fasting'), RISK_LEVELS.CONTROLLED);
      assert.equal(classifySugarRisk(140, 'random'), RISK_LEVELS.CONTROLLED);
      assert.equal(classifySugarRisk(190, 'random'), RISK_LEVELS.CONTROLLED);
    });
  });

  describe('Combined Condition Risk Evaluation & Scheduling', () => {
    test('Both conditions: picks higher severity (Severe BP + Controlled Sugar => Severe & 2 days)', () => {
      const result = evaluateReadingRisk({
        condition: 'both',
        systolic: 185,
        diastolic: 95,
        bloodSugar: 105,
        sugarType: 'fasting',
      });
      assert.equal(result.riskLevel, RISK_LEVELS.SEVERE);
      assert.equal(result.followUpDays, 2);
      assert.equal(result.referralNeeded, true);
    });

    test('Both conditions: Uncontrolled BP + Severe Sugar => Severe & 2 days', () => {
      const result = evaluateReadingRisk({
        condition: 'both',
        systolic: 150,
        diastolic: 92,
        bloodSugar: 420,
        sugarType: 'random',
      });
      assert.equal(result.riskLevel, RISK_LEVELS.SEVERE);
      assert.equal(result.followUpDays, 2);
      assert.equal(result.referralNeeded, true);
    });

    test('Both conditions: Controlled BP + Uncontrolled Sugar => Uncontrolled & 14 days', () => {
      const result = evaluateReadingRisk({
        condition: 'both',
        systolic: 120,
        diastolic: 80,
        bloodSugar: 220,
        sugarType: 'random',
      });
      assert.equal(result.riskLevel, RISK_LEVELS.UNCONTROLLED);
      assert.equal(result.followUpDays, 14);
      assert.equal(result.referralNeeded, false);
    });

    test('Hypertension only: Controlled => 30 days', () => {
      const result = evaluateReadingRisk({
        condition: 'hypertension',
        systolic: 118,
        diastolic: 78,
      });
      assert.equal(result.riskLevel, RISK_LEVELS.CONTROLLED);
      assert.equal(result.followUpDays, 30);
      assert.equal(result.referralNeeded, false);
    });

    test('Diabetes only: Uncontrolled => 14 days', () => {
      const result = evaluateReadingRisk({
        condition: 'diabetes',
        bloodSugar: 160,
        sugarType: 'fasting',
      });
      assert.equal(result.riskLevel, RISK_LEVELS.UNCONTROLLED);
      assert.equal(result.followUpDays, 14);
    });
  });

  describe('Scheduling Dates & Missed Visit Logic', () => {
    test('calculateNextScheduledDate offsets days correctly', () => {
      const base = '2026-09-01T00:00:00.000Z';
      assert.equal(calculateNextScheduledDate(base, 2), '2026-09-03');
      assert.equal(calculateNextScheduledDate(base, 14), '2026-09-15');
      assert.equal(calculateNextScheduledDate(base, 30), '2026-10-01');
    });

    test('isVisitMissed evaluates > 3 days overdue threshold', () => {
      const current = new Date('2026-09-20');
      // 1 day overdue -> not missed
      assert.equal(isVisitMissed('2026-09-19', current), false);
      // 3 days overdue -> not missed yet (boundary)
      assert.equal(isVisitMissed('2026-09-17', current), false);
      // 4 days overdue -> missed
      assert.equal(isVisitMissed('2026-09-16', current), true);
      // 10 days overdue -> missed
      assert.equal(isVisitMissed('2026-09-10', current), true);
      // Future date -> not missed
      assert.equal(isVisitMissed('2026-09-25', current), false);
    });
  });

});

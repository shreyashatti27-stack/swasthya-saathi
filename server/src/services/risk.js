/**
 * SwasthyaSaathi Clinical Risk Classification & Auto-Scheduler Service
 * 
 * Rules:
 * BP:
 * - Severe: systolic >= 180 OR diastolic >= 110 -> Follow-up in 2 days (Immediate PHC referral)
 * - Uncontrolled: systolic >= 140 OR diastolic >= 90 -> Follow-up in 14 days
 * - Controlled: systolic < 140 AND diastolic < 90 -> Follow-up in 30 days
 * 
 * Blood Sugar:
 * - Severe: fasting >= 300 OR random >= 400 -> Follow-up in 2 days (Immediate PHC referral)
 * - Uncontrolled: fasting >= 126 OR random >= 200 -> Follow-up in 14 days
 * - Controlled: otherwise -> Follow-up in 30 days
 * 
 * Combined Conditions ('both'):
 * - Priority: 'severe' > 'uncontrolled' > 'controlled'
 */

export const RISK_LEVELS = {
  SEVERE: 'severe',
  UNCONTROLLED: 'uncontrolled',
  CONTROLLED: 'controlled',
};

export const FOLLOW_UP_DAYS = {
  [RISK_LEVELS.SEVERE]: 2,
  [RISK_LEVELS.UNCONTROLLED]: 14,
  [RISK_LEVELS.CONTROLLED]: 30,
};

const RISK_PRIORITY = {
  [RISK_LEVELS.SEVERE]: 3,
  [RISK_LEVELS.UNCONTROLLED]: 2,
  [RISK_LEVELS.CONTROLLED]: 1,
};

/**
 * Classify blood pressure risk
 * @param {number|null} systolic 
 * @param {number|null} diastolic 
 * @returns {'severe'|'uncontrolled'|'controlled'|null}
 */
export function classifyBPRisk(systolic, diastolic) {
  if (systolic == null && diastolic == null) return null;
  const sys = Number(systolic) || 0;
  const dia = Number(diastolic) || 0;

  if (sys >= 180 || dia >= 110) {
    return RISK_LEVELS.SEVERE;
  }
  if (sys >= 140 || dia >= 90) {
    return RISK_LEVELS.UNCONTROLLED;
  }
  return RISK_LEVELS.CONTROLLED;
}

/**
 * Classify blood sugar risk
 * @param {number|null} bloodSugar 
 * @param {'fasting'|'random'|null} sugarType 
 * @returns {'severe'|'uncontrolled'|'controlled'|null}
 */
export function classifySugarRisk(bloodSugar, sugarType = 'random') {
  if (bloodSugar == null) return null;
  const sugar = Number(bloodSugar);
  const type = (sugarType || 'random').toLowerCase();

  if (type === 'fasting') {
    if (sugar >= 300) return RISK_LEVELS.SEVERE;
    if (sugar >= 126) return RISK_LEVELS.UNCONTROLLED;
    return RISK_LEVELS.CONTROLLED;
  } else {
    // default to random
    if (sugar >= 400) return RISK_LEVELS.SEVERE;
    if (sugar >= 200) return RISK_LEVELS.UNCONTROLLED;
    return RISK_LEVELS.CONTROLLED;
  }
}

/**
 * Compute overall clinical risk and recommendation for a reading given the patient's condition
 * @param {Object} params
 * @param {string} params.condition - 'hypertension' | 'diabetes' | 'both'
 * @param {number|null} params.systolic
 * @param {number|null} params.diastolic
 * @param {number|null} params.bloodSugar
 * @param {'fasting'|'random'|null} params.sugarType
 * @returns {{ riskLevel: 'severe'|'uncontrolled'|'controlled', followUpDays: number, referralNeeded: boolean, message: string }}
 */
export function evaluateReadingRisk({ condition, systolic, diastolic, bloodSugar, sugarType }) {
  const bpRisk = classifyBPRisk(systolic, diastolic);
  const sugarRisk = classifySugarRisk(bloodSugar, sugarType);

  let finalRisk = RISK_LEVELS.CONTROLLED;

  if (condition === 'hypertension') {
    finalRisk = bpRisk || RISK_LEVELS.CONTROLLED;
  } else if (condition === 'diabetes') {
    finalRisk = sugarRisk || RISK_LEVELS.CONTROLLED;
  } else if (condition === 'both') {
    if (bpRisk && sugarRisk) {
      finalRisk = RISK_PRIORITY[bpRisk] >= RISK_PRIORITY[sugarRisk] ? bpRisk : sugarRisk;
    } else if (bpRisk) {
      finalRisk = bpRisk;
    } else if (sugarRisk) {
      finalRisk = sugarRisk;
    }
  } else {
    // If no condition or unknown, evaluate whatever is present
    if (bpRisk && sugarRisk) {
      finalRisk = RISK_PRIORITY[bpRisk] >= RISK_PRIORITY[sugarRisk] ? bpRisk : sugarRisk;
    } else {
      finalRisk = bpRisk || sugarRisk || RISK_LEVELS.CONTROLLED;
    }
  }

  const followUpDays = FOLLOW_UP_DAYS[finalRisk];
  const referralNeeded = finalRisk === RISK_LEVELS.SEVERE;

  let message = '';
  if (finalRisk === RISK_LEVELS.SEVERE) {
    message = 'Critical reading! Immediate PHC Medical Officer referral required. Follow-up scheduled in 2 days.';
  } else if (finalRisk === RISK_LEVELS.UNCONTROLLED) {
    message = 'Reading is Uncontrolled. Lifestyle counseling and follow-up scheduled in 14 days.';
  } else {
    message = 'Reading is Controlled. Next routine follow-up scheduled in 30 days.';
  }

  return {
    riskLevel: finalRisk,
    followUpDays,
    referralNeeded,
    message,
  };
}

/**
 * Calculate scheduled date string (YYYY-MM-DD) from a base date and offset in days
 * @param {Date|string} [baseDate=new Date()]
 * @param {number} days
 * @returns {string} ISO Date string YYYY-MM-DD
 */
export function calculateNextScheduledDate(baseDate = new Date(), days = 30) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Determines if a pending visit is considered 'missed' (>= 3 days past scheduled date without completion)
 * @param {string} scheduledDateStr - 'YYYY-MM-DD'
 * @param {Date|string} [currentDate=new Date()]
 * @returns {boolean}
 */
export function isVisitMissed(scheduledDateStr, currentDate = new Date()) {
  if (!scheduledDateStr) return false;
  const sched = new Date(scheduledDateStr);
  sched.setHours(0, 0, 0, 0);

  const curr = new Date(currentDate);
  curr.setHours(0, 0, 0, 0);

  const diffTime = curr.getTime() - sched.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 3;
}

import { Router } from 'express';
import { z } from 'zod';
import db, { updateMissedVisits } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { evaluateReadingRisk, calculateNextScheduledDate, RISK_LEVELS } from '../services/risk.js';

const router = Router();

const completeVisitSchema = z.object({
  systolic: z.coerce.number().int().min(50).max(300).nullable().optional(),
  diastolic: z.coerce.number().int().min(30).max(200).nullable().optional(),
  blood_sugar: z.coerce.number().min(20).max(800).nullable().optional(),
  sugar_type: z.enum(['fasting', 'random']).nullable().optional(),
  notes: z.string().optional().default('Follow-up visit completed'),
});

// GET /api/visits/today - Visits due today or overdue
router.get('/today', requireAuth, (req, res) => {
  updateMissedVisits();

  const todayStr = new Date().toISOString().split('T')[0];

  let query = `
    SELECT 
      v.id as visit_id,
      v.scheduled_date,
      v.status as visit_status,
      v.reminder_sent,
      p.id as patient_id,
      p.name as patient_name,
      p.age,
      p.gender,
      p.village,
      p.phone,
      p.condition,
      p.preferred_language,
      u.id as asha_id,
      u.name as asha_name,
      r.systolic as latest_systolic,
      r.diastolic as latest_diastolic,
      r.blood_sugar as latest_blood_sugar,
      r.sugar_type as latest_sugar_type,
      r.risk_level as latest_risk_level,
      r.recorded_at as latest_reading_date
    FROM visits v
    JOIN patients p ON v.patient_id = p.id
    JOIN users u ON p.asha_id = u.id
    LEFT JOIN readings r ON r.id = (
      SELECT id FROM readings WHERE patient_id = p.id ORDER BY recorded_at DESC, id DESC LIMIT 1
    )
    WHERE v.status IN ('pending', 'missed')
      AND v.scheduled_date <= ?
  `;

  const params = [todayStr];

  if (req.user.role === 'asha') {
    query += ' AND p.asha_id = ?';
    params.push(req.user.id);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Compute days overdue & sorting priority
  const enrichedVisits = rows.map((v) => {
    const schedDate = new Date(v.scheduled_date);
    schedDate.setHours(0, 0, 0, 0);

    const diffDays = Math.max(0, Math.floor((todayDate.getTime() - schedDate.getTime()) / (1000 * 60 * 60 * 24)));
    const isOverdue = diffDays > 0;

    let riskPriority = 3;
    if (v.latest_risk_level === RISK_LEVELS.SEVERE) riskPriority = 1;
    else if (v.latest_risk_level === RISK_LEVELS.UNCONTROLLED) riskPriority = 2;

    return {
      ...v,
      days_overdue: diffDays,
      is_overdue: isOverdue,
      risk_priority: riskPriority,
    };
  });

  // Sort by:
  // 1. Risk priority (Severe 1 -> Uncontrolled 2 -> Controlled 3)
  // 2. Days overdue descending (highest overdue first)
  // 3. Scheduled date ascending
  enrichedVisits.sort((a, b) => {
    if (a.risk_priority !== b.risk_priority) {
      return a.risk_priority - b.risk_priority;
    }
    if (b.days_overdue !== a.days_overdue) {
      return b.days_overdue - a.days_overdue;
    }
    return a.scheduled_date.localeCompare(b.scheduled_date);
  });

  res.json({
    date: todayStr,
    count: enrichedVisits.length,
    visits: enrichedVisits,
  });
});

// POST /api/visits/:id/complete - Complete a visit with clinical reading
router.post('/:id/complete', requireAuth, (req, res) => {
  const visitId = Number(req.params.id);

  const visitStmt = db.prepare(`
    SELECT v.*, p.condition, p.asha_id 
    FROM visits v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `);
  const visit = visitStmt.get(visitId);

  if (!visit) {
    return res.status(404).json({ error: 'Visit not found' });
  }

  if (req.user.role === 'asha' && visit.asha_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this visit record.' });
  }

  const parseResult = completeVisitSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.errors,
    });
  }

  const data = parseResult.data;

  // Evaluate clinical risk
  const riskEvaluation = evaluateReadingRisk({
    condition: visit.condition,
    systolic: data.systolic,
    diastolic: data.diastolic,
    bloodSugar: data.blood_sugar,
    sugarType: data.sugar_type,
  });

  const nextScheduledDate = calculateNextScheduledDate(new Date(), riskEvaluation.followUpDays);
  const nowIso = new Date().toISOString();

  // Mark current visit done
  const updateVisitStmt = db.prepare(`
    UPDATE visits 
    SET status = 'done', completed_date = ? 
    WHERE id = ?
  `);
  updateVisitStmt.run(nowIso, visitId);

  // Insert clinical reading
  const insertReadingStmt = db.prepare(`
    INSERT INTO readings (patient_id, systolic, diastolic, blood_sugar, sugar_type, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const readingResult = insertReadingStmt.run(
    visit.patient_id,
    data.systolic || null,
    data.diastolic || null,
    data.blood_sugar || null,
    data.sugar_type || null,
    riskEvaluation.riskLevel,
    data.notes || 'Follow-up visit completed'
  );

  // Auto-schedule next pending follow-up visit
  const insertNextVisitStmt = db.prepare(`
    INSERT INTO visits (patient_id, scheduled_date, status)
    VALUES (?, ?, 'pending')
  `);
  const nextVisitResult = insertNextVisitStmt.run(visit.patient_id, nextScheduledDate);

  res.json({
    message: 'Visit completed and next follow-up auto-scheduled successfully',
    completedVisitId: visitId,
    riskEvaluation,
    nextScheduledDate,
    readingId: Number(readingResult.lastInsertRowid),
    nextVisitId: Number(nextVisitResult.lastInsertRowid),
  });
});

export default router;

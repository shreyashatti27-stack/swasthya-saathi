import { Router } from 'express';
import { z } from 'zod';
import db, { updateMissedVisits } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { evaluateReadingRisk, calculateNextScheduledDate } from '../services/risk.js';

const router = Router();

// Zod validation schemas
const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(['male', 'female', 'other']),
  village: z.string().min(2, 'Village is required'),
  phone: z.string().optional().default(''),
  condition: z.enum(['hypertension', 'diabetes', 'both']),
  preferred_language: z.enum(['en', 'hi', 'kn']).default('hi'),
  // Initial reading
  systolic: z.coerce.number().int().min(50).max(300).nullable().optional(),
  diastolic: z.coerce.number().int().min(30).max(200).nullable().optional(),
  blood_sugar: z.coerce.number().min(20).max(800).nullable().optional(),
  sugar_type: z.enum(['fasting', 'random']).nullable().optional(),
  notes: z.string().optional().default('Initial screening'),
});

const createReadingSchema = z.object({
  systolic: z.coerce.number().int().min(50).max(300).nullable().optional(),
  diastolic: z.coerce.number().int().min(30).max(200).nullable().optional(),
  blood_sugar: z.coerce.number().min(20).max(800).nullable().optional(),
  sugar_type: z.enum(['fasting', 'random']).nullable().optional(),
  notes: z.string().optional().default(''),
  completed_visit_id: z.coerce.number().optional(),
});

// GET /api/patients - list patients with latest reading and pending visit
router.get('/', requireAuth, (req, res) => {
  updateMissedVisits();

  const { search, village, risk, condition, asha_id } = req.query;

  let query = `
    SELECT 
      p.*,
      u.name as asha_name,
      r.systolic as latest_systolic,
      r.diastolic as latest_diastolic,
      r.blood_sugar as latest_blood_sugar,
      r.sugar_type as latest_sugar_type,
      r.risk_level as latest_risk_level,
      r.recorded_at as latest_reading_date,
      v.id as next_visit_id,
      v.scheduled_date as next_visit_date,
      v.status as next_visit_status
    FROM patients p
    JOIN users u ON p.asha_id = u.id
    LEFT JOIN readings r ON r.id = (
      SELECT id FROM readings WHERE patient_id = p.id ORDER BY recorded_at DESC, id DESC LIMIT 1
    )
    LEFT JOIN visits v ON v.id = (
      SELECT id FROM visits WHERE patient_id = p.id AND status IN ('pending', 'missed') ORDER BY scheduled_date ASC, id ASC LIMIT 1
    )
    WHERE 1=1
  `;

  const params = [];

  // Role check: ASHA can only see own patients, PHC officer can filter by asha_id or see all
  if (req.user.role === 'asha') {
    query += ' AND p.asha_id = ?';
    params.push(req.user.id);
  } else if (asha_id) {
    query += ' AND p.asha_id = ?';
    params.push(asha_id);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.phone LIKE ? OR p.village LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (village) {
    query += ' AND p.village = ?';
    params.push(village);
  }

  if (condition) {
    query += ' AND p.condition = ?';
    params.push(condition);
  }

  if (risk) {
    query += ' AND r.risk_level = ?';
    params.push(risk);
  }

  query += ' ORDER BY p.created_at DESC';

  const stmt = db.prepare(query);
  const patients = stmt.all(...params);

  res.json({ patients, total: patients.length });
});

// GET /api/patients/:id - single patient details + longitudinal readings + visits
router.get('/:id', requireAuth, (req, res) => {
  updateMissedVisits();
  const patientId = Number(req.params.id);

  const patientStmt = db.prepare(`
    SELECT p.*, u.name as asha_name, u.phone as asha_phone
    FROM patients p
    JOIN users u ON p.asha_id = u.id
    WHERE p.id = ?
  `);
  const patient = patientStmt.get(patientId);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Access control
  if (req.user.role === 'asha' && patient.asha_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this patient record.' });
  }

  // Get longitudinal readings (sorted chronologically for charts)
  const readingsStmt = db.prepare(`
    SELECT * FROM readings WHERE patient_id = ? ORDER BY recorded_at ASC, id ASC
  `);
  const readings = readingsStmt.all(patientId);

  // Get visits timeline (latest first)
  const visitsStmt = db.prepare(`
    SELECT * FROM visits WHERE patient_id = ? ORDER BY scheduled_date DESC, id DESC
  `);
  const visits = visitsStmt.all(patientId);

  // Get reminder history
  const remindersStmt = db.prepare(`
    SELECT * FROM reminders WHERE patient_id = ? ORDER BY sent_at DESC LIMIT 10
  `);
  const reminders = remindersStmt.all(patientId);

  res.json({
    patient,
    readings,
    visits,
    reminders,
  });
});

// POST /api/patients - Register new patient with initial reading & auto-scheduled follow-up
router.post('/', requireAuth, (req, res) => {
  const parseResult = createPatientSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.errors,
    });
  }

  const data = parseResult.data;
  const ashaId = req.user.role === 'asha' ? req.user.id : (req.body.asha_id || req.user.id);

  // Evaluate risk of initial reading
  const riskEvaluation = evaluateReadingRisk({
    condition: data.condition,
    systolic: data.systolic,
    diastolic: data.diastolic,
    bloodSugar: data.blood_sugar,
    sugarType: data.sugar_type,
  });

  const nextScheduledDate = calculateNextScheduledDate(new Date(), riskEvaluation.followUpDays);

  // Insert patient
  const insertPatientStmt = db.prepare(`
    INSERT INTO patients (asha_id, name, age, gender, village, phone, condition, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patientResult = insertPatientStmt.run(
    ashaId,
    data.name.trim(),
    data.age,
    data.gender,
    data.village.trim(),
    data.phone.trim(),
    data.condition,
    data.preferred_language
  );

  const newPatientId = Number(patientResult.lastInsertRowid);

  // Insert initial reading
  const insertReadingStmt = db.prepare(`
    INSERT INTO readings (patient_id, systolic, diastolic, blood_sugar, sugar_type, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const readingResult = insertReadingStmt.run(
    newPatientId,
    data.systolic || null,
    data.diastolic || null,
    data.blood_sugar || null,
    data.sugar_type || null,
    riskEvaluation.riskLevel,
    data.notes || 'Initial screening'
  );

  // Insert initial auto-scheduled follow-up visit
  const insertVisitStmt = db.prepare(`
    INSERT INTO visits (patient_id, scheduled_date, status)
    VALUES (?, ?, 'pending')
  `);

  const visitResult = insertVisitStmt.run(newPatientId, nextScheduledDate);

  res.status(201).json({
    message: 'Patient registered successfully',
    patientId: newPatientId,
    riskEvaluation,
    nextScheduledDate,
    visitId: Number(visitResult.lastInsertRowid),
    readingId: Number(readingResult.lastInsertRowid),
  });
});

// POST /api/patients/:id/readings - Record new reading, evaluate risk, complete visit & schedule next
router.post('/:id/readings', requireAuth, (req, res) => {
  const patientId = Number(req.params.id);

  const patientStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
  const patient = patientStmt.get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (req.user.role === 'asha' && patient.asha_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const parseResult = createReadingSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.errors,
    });
  }

  const data = parseResult.data;

  // Evaluate clinical risk
  const riskEvaluation = evaluateReadingRisk({
    condition: patient.condition,
    systolic: data.systolic,
    diastolic: data.diastolic,
    bloodSugar: data.blood_sugar,
    sugarType: data.sugar_type,
  });

  const nextScheduledDate = calculateNextScheduledDate(new Date(), riskEvaluation.followUpDays);

  // Insert new reading
  const insertReadingStmt = db.prepare(`
    INSERT INTO readings (patient_id, systolic, diastolic, blood_sugar, sugar_type, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const readingResult = insertReadingStmt.run(
    patientId,
    data.systolic || null,
    data.diastolic || null,
    data.blood_sugar || null,
    data.sugar_type || null,
    riskEvaluation.riskLevel,
    data.notes || ''
  );

  const nowIso = new Date().toISOString();

  // If a specific visit was being completed, mark it done
  if (data.completed_visit_id) {
    const completeSpecificStmt = db.prepare(`
      UPDATE visits 
      SET status = 'done', completed_date = ? 
      WHERE id = ? AND patient_id = ?
    `);
    completeSpecificStmt.run(nowIso, data.completed_visit_id, patientId);
  } else {
    // Mark any existing open pending/missed visit as done
    const completeOpenStmt = db.prepare(`
      UPDATE visits 
      SET status = 'done', completed_date = ? 
      WHERE patient_id = ? AND status IN ('pending', 'missed')
    `);
    completeOpenStmt.run(nowIso, patientId);
  }

  // Auto-schedule next pending visit
  const insertVisitStmt = db.prepare(`
    INSERT INTO visits (patient_id, scheduled_date, status)
    VALUES (?, ?, 'pending')
  `);

  const nextVisitResult = insertVisitStmt.run(patientId, nextScheduledDate);

  res.status(201).json({
    message: 'Reading recorded and next visit scheduled successfully',
    riskEvaluation,
    nextScheduledDate,
    readingId: Number(readingResult.lastInsertRowid),
    nextVisitId: Number(nextVisitResult.lastInsertRowid),
  });
});

export default router;

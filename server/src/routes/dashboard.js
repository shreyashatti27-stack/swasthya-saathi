import { Router } from 'express';
import db, { updateMissedVisits } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { RISK_LEVELS } from '../services/risk.js';

const router = Router();

// Dashboard routes require PHC Officer role (or authenticated user)
router.use(requireAuth);

// GET /api/dashboard/summary - High level clinical KPIs
router.get('/summary', (req, res) => {
  updateMissedVisits();

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Total patients
  const totalPatientsRow = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  const totalPatients = totalPatientsRow.count;

  // 2. Latest readings risk breakdown
  const riskCountsStmt = db.prepare(`
    SELECT r.risk_level, COUNT(*) as count
    FROM readings r
    JOIN (
      SELECT patient_id, MAX(recorded_at) as max_date, MAX(id) as max_id
      FROM readings
      GROUP BY patient_id
    ) latest ON r.patient_id = latest.patient_id AND r.id = latest.max_id
    GROUP BY r.risk_level
  `);
  const riskRows = riskCountsStmt.all();
  
  let controlledCount = 0;
  let uncontrolledCount = 0;
  let severeCount = 0;

  for (const row of riskRows) {
    if (row.risk_level === RISK_LEVELS.CONTROLLED) controlledCount = row.count;
    else if (row.risk_level === RISK_LEVELS.UNCONTROLLED) uncontrolledCount = row.count;
    else if (row.risk_level === RISK_LEVELS.SEVERE) severeCount = row.count;
  }

  const evaluatedPatients = controlledCount + uncontrolledCount + severeCount;
  const controlRatePct = evaluatedPatients > 0 ? Math.round((controlledCount / evaluatedPatients) * 100) : 0;

  // 3. Overdue follow-ups
  const overdueRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM visits 
    WHERE status IN ('pending', 'missed') AND scheduled_date < ?
  `).get(todayStr);
  const overdueVisits = overdueRow.count;

  // 4. Due today
  const dueTodayRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM visits 
    WHERE status = 'pending' AND scheduled_date = ?
  `).get(todayStr);
  const dueTodayVisits = dueTodayRow.count;

  // 5. Total visits by status
  const visitStatsStmt = db.prepare(`
    SELECT status, COUNT(*) as count FROM visits GROUP BY status
  `);
  const visitStatsRows = visitStatsStmt.all();
  const visitStats = { pending: 0, done: 0, missed: 0 };
  visitStatsRows.forEach(r => { visitStats[r.status] = r.count; });

  // 6. Condition breakdown
  const conditionStatsStmt = db.prepare(`
    SELECT condition, COUNT(*) as count FROM patients GROUP BY condition
  `);
  const conditionRows = conditionStatsStmt.all();

  res.json({
    kpis: {
      totalPatients,
      controlRatePct,
      controlledCount,
      uncontrolledCount,
      severeCount,
      overdueVisits,
      dueTodayVisits,
      totalVisitsCompleted: visitStats.done,
      totalVisitsPending: visitStats.pending,
      totalVisitsMissed: visitStats.missed,
    },
    riskDistribution: [
      { name: 'Controlled', value: controlledCount, color: '#10B981', key: 'controlled' },
      { name: 'Uncontrolled', value: uncontrolledCount, color: '#F59E0B', key: 'uncontrolled' },
      { name: 'Severe (Referral)', value: severeCount, color: '#EF4444', key: 'severe' },
    ],
    conditionDistribution: conditionRows.map(c => ({
      name: c.condition === 'both' ? 'HTN + Diabetes' : c.condition === 'hypertension' ? 'Hypertension' : 'Diabetes',
      value: c.count,
    })),
  });
});

// GET /api/dashboard/trends - Monthly control rate progression
router.get('/trends', (req, res) => {
  // Aggregate historical readings by month (past 6 months)
  const monthlyStatsStmt = db.prepare(`
    SELECT 
      strftime('%Y-%m', recorded_at) as month,
      COUNT(*) as total_readings,
      SUM(CASE WHEN risk_level = 'controlled' THEN 1 ELSE 0 END) as controlled_count,
      SUM(CASE WHEN risk_level = 'uncontrolled' THEN 1 ELSE 0 END) as uncontrolled_count,
      SUM(CASE WHEN risk_level = 'severe' THEN 1 ELSE 0 END) as severe_count,
      ROUND(AVG(systolic), 1) as avg_systolic,
      ROUND(AVG(diastolic), 1) as avg_diastolic,
      ROUND(AVG(blood_sugar), 1) as avg_sugar
    FROM readings
    GROUP BY strftime('%Y-%m', recorded_at)
    ORDER BY month ASC
  `);

  const rows = monthlyStatsStmt.all();

  const formattedTrends = rows.map(r => {
    const total = r.total_readings;
    const controlRate = total > 0 ? Math.round((r.controlled_count / total) * 100) : 0;
    
    // Format month for display (e.g. '2026-05' -> 'May 2026')
    const [year, month] = (r.month || '').split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    const monthLabel = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      : r.month;

    return {
      month: r.month,
      monthLabel,
      totalReadings: total,
      controlRate,
      controlledCount: r.controlled_count,
      uncontrolledCount: r.uncontrolled_count,
      severeCount: r.severe_count,
      avgSystolic: r.avg_systolic || 0,
      avgDiastolic: r.avg_diastolic || 0,
      avgSugar: r.avg_sugar || 0,
    };
  });

  res.json({ trends: formattedTrends });
});

// GET /api/dashboard/asha-performance - Comparative scorecard across ASHA workers
router.get('/asha-performance', (req, res) => {
  updateMissedVisits();

  const ashasStmt = db.prepare(`
    SELECT id, name, email, phone, phc_name 
    FROM users 
    WHERE role = 'asha'
  `);
  const ashas = ashasStmt.all();

  const performance = ashas.map(asha => {
    // Patients count & villages
    const patientStats = db.prepare(`
      SELECT 
        COUNT(*) as total_patients,
        GROUP_CONCAT(DISTINCT village) as villages
      FROM patients
      WHERE asha_id = ?
    `).get(asha.id);

    // Controlled patients count
    const controlStats = db.prepare(`
      SELECT 
        COUNT(*) as total_evaluated,
        SUM(CASE WHEN r.risk_level = 'controlled' THEN 1 ELSE 0 END) as controlled_count,
        SUM(CASE WHEN r.risk_level = 'severe' THEN 1 ELSE 0 END) as severe_count
      FROM patients p
      JOIN readings r ON r.id = (
        SELECT id FROM readings WHERE patient_id = p.id ORDER BY recorded_at DESC, id DESC LIMIT 1
      )
      WHERE p.asha_id = ?
    `).get(asha.id);

    // Visit adherence stats
    const visitStats = db.prepare(`
      SELECT 
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.asha_id = ?
    `).get(asha.id);

    const totalEvaluated = controlStats.total_evaluated || 0;
    const controlledCount = controlStats.controlled_count || 0;
    const controlRate = totalEvaluated > 0 ? Math.round((controlledCount / totalEvaluated) * 100) : 0;

    const totalScheduledVisits = (visitStats.done_count || 0) + (visitStats.missed_count || 0);
    const visitCompletionRate = totalScheduledVisits > 0 ? Math.round(((visitStats.done_count || 0) / totalScheduledVisits) * 100) : 100;

    return {
      id: asha.id,
      name: asha.name,
      phone: asha.phone,
      villages: patientStats.villages ? patientStats.villages.split(',') : [],
      totalPatients: patientStats.total_patients || 0,
      controlledCount,
      severeCount: controlStats.severe_count || 0,
      controlRate,
      visitsDone: visitStats.done_count || 0,
      visitsPending: visitStats.pending_count || 0,
      visitsMissed: visitStats.missed_count || 0,
      visitCompletionRate,
    };
  });

  res.json({ ashaPerformance: performance });
});

// GET /api/dashboard/severe-overdue - Critical drilldown list for PHC Officer intervention
router.get('/severe-overdue', (req, res) => {
  updateMissedVisits();
  const todayStr = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT 
      p.id as patient_id,
      p.name as patient_name,
      p.age,
      p.gender,
      p.village,
      p.phone,
      p.condition,
      u.name as asha_name,
      u.phone as asha_phone,
      r.systolic,
      r.diastolic,
      r.blood_sugar,
      r.sugar_type,
      r.risk_level,
      r.recorded_at as last_reading_date,
      v.id as visit_id,
      v.scheduled_date,
      v.status as visit_status
    FROM patients p
    JOIN users u ON p.asha_id = u.id
    LEFT JOIN readings r ON r.id = (
      SELECT id FROM readings WHERE patient_id = p.id ORDER BY recorded_at DESC, id DESC LIMIT 1
    )
    LEFT JOIN visits v ON v.id = (
      SELECT id FROM visits WHERE patient_id = p.id AND status IN ('pending', 'missed') ORDER BY scheduled_date ASC, id ASC LIMIT 1
    )
    WHERE r.risk_level = 'severe' OR (v.scheduled_date < ? AND v.status IN ('pending', 'missed'))
    ORDER BY 
      CASE WHEN r.risk_level = 'severe' THEN 1 ELSE 2 END,
      v.scheduled_date ASC
  `);

  const patients = stmt.all(todayStr);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = patients.map(p => {
    let daysOverdue = 0;
    if (p.scheduled_date) {
      const s = new Date(p.scheduled_date);
      s.setHours(0, 0, 0, 0);
      daysOverdue = Math.max(0, Math.floor((today.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return {
      ...p,
      daysOverdue,
      isSevere: p.risk_level === 'severe',
    };
  });

  res.json({ count: enriched.length, patients: enriched });
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

export const REMINDER_TEMPLATES = {
  en: (name, date, ashaName) =>
    `Namaste ${name}, your routine health check-up is scheduled for ${date}. Please meet your ASHA worker (${ashaName}) or visit the nearest Health Centre.`,
  hi: (name, date, ashaName) =>
    `नमस्ते ${name}, आपकी स्वास्थ्य जांच ${date} को निर्धारित है। कृपया अपनी आशा कार्यकर्ता (${ashaName}) से मिलें या स्वास्थ्य केंद्र जाएं।`,
  kn: (name, date, ashaName) =>
    `ನಮಸ್ಕಾರ ${name}, ನಿಮ್ಮ ಆರೋಗ್ಯ ತಪಾಸಣೆಯು ${date} ರಂದು ನಿಗದಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಶಾ ಕಾರ್ಯಕರ್ತೆ (${ashaName}) ಅವರನ್ನು ಭೇಟಿ ಮಾಡಿ.`,
};

/**
 * Interface that can be plugged into MSG91 / Twilio / Karix SMS/IVR Gateway
 */
export async function sendNotificationGateway({ phone, message, channel = 'sms', language = 'en' }) {
  // In production, invoke MSG91 or Twilio API
  console.log(`[GATEWAY SIMULATION] Sending ${channel.toUpperCase()} (${language}) to ${phone}: "${message}"`);
  return {
    success: true,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    deliveredAt: new Date().toISOString(),
  };
}

const sendReminderSchema = z.object({
  patient_id: z.coerce.number(),
  visit_id: z.coerce.number().optional(),
  language: z.enum(['en', 'hi', 'kn']).optional(),
  channel: z.enum(['sms', 'ivr']).default('sms'),
  custom_message: z.string().optional(),
});

// GET /api/reminders - list sent reminders log
router.get('/', requireAuth, (req, res) => {
  let query = `
    SELECT 
      r.*,
      p.name as patient_name,
      p.village,
      p.phone as patient_phone,
      p.condition,
      u.name as asha_name
    FROM reminders r
    JOIN patients p ON r.patient_id = p.id
    JOIN users u ON p.asha_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'asha') {
    query += ' AND p.asha_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY r.sent_at DESC LIMIT 50';

  const stmt = db.prepare(query);
  const reminders = stmt.all(...params);

  res.json({ reminders, total: reminders.length });
});

// POST /api/reminders/send - manually send a reminder to a patient
router.post('/send', requireAuth, async (req, res) => {
  const parseResult = sendReminderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.errors,
    });
  }

  const { patient_id, visit_id, language, channel, custom_message } = parseResult.data;

  const patientStmt = db.prepare(`
    SELECT p.*, u.name as asha_name 
    FROM patients p
    JOIN users u ON p.asha_id = u.id
    WHERE p.id = ?
  `);
  const patient = patientStmt.get(patient_id);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const chosenLang = language || patient.preferred_language || 'hi';
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 1);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const templateFn = REMINDER_TEMPLATES[chosenLang] || REMINDER_TEMPLATES.hi;
  const message = custom_message || templateFn(patient.name, targetDateStr, patient.asha_name);

  // Send via gateway
  await sendNotificationGateway({
    phone: patient.phone || '9876543210',
    message,
    channel,
    language: chosenLang,
  });

  // Record reminder in DB
  const insertStmt = db.prepare(`
    INSERT INTO reminders (patient_id, message, language, channel)
    VALUES (?, ?, ?, ?)
  `);
  const insertResult = insertStmt.run(patient_id, message, chosenLang, channel);

  // If a visit_id was provided, mark reminder_sent = 1
  if (visit_id) {
    const updateVisitStmt = db.prepare('UPDATE visits SET reminder_sent = 1 WHERE id = ?');
    updateVisitStmt.run(visit_id);
  }

  res.status(201).json({
    message: 'Reminder sent successfully',
    reminderId: Number(insertResult.lastInsertRowid),
    preview: {
      patientName: patient.name,
      phone: patient.phone,
      message,
      language: chosenLang,
      channel,
      sentAt: new Date().toISOString(),
    },
  });
});

/**
 * Auto-generate reminders for visits scheduled for tomorrow
 */
export function processAutomatedReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const pendingVisitsStmt = db.prepare(`
    SELECT v.id as visit_id, v.scheduled_date, p.id as patient_id, p.name, p.phone, p.preferred_language, u.name as asha_name
    FROM visits v
    JOIN patients p ON v.patient_id = p.id
    JOIN users u ON p.asha_id = u.id
    WHERE v.status = 'pending' 
      AND v.scheduled_date = ?
      AND v.reminder_sent = 0
  `);

  const visits = pendingVisitsStmt.all(tomorrowStr);
  let sentCount = 0;

  for (const v of visits) {
    const lang = v.preferred_language || 'hi';
    const templateFn = REMINDER_TEMPLATES[lang] || REMINDER_TEMPLATES.hi;
    const message = templateFn(v.name, v.scheduled_date, v.asha_name);

    db.prepare(`
      INSERT INTO reminders (patient_id, message, language, channel)
      VALUES (?, ?, ?, 'sms')
    `).run(v.patient_id, message, lang);

    db.prepare('UPDATE visits SET reminder_sent = 1 WHERE id = ?').run(v.visit_id);
    sentCount++;
  }

  console.log(`[CRON AUTO-REMINDERS] Sent ${sentCount} reminders for visits on ${tomorrowStr}`);
  return sentCount;
}

// POST /api/reminders/auto-trigger (for testing or manual triggering)
router.post('/auto-trigger', requireAuth, (req, res) => {
  const count = processAutomatedReminders();
  res.json({ message: `Automated reminder job processed ${count} reminders.` });
});

export default router;

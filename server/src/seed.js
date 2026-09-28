import bcrypt from 'bcryptjs';
import db, { initDB } from './db.js';
import { evaluateReadingRisk, calculateNextScheduledDate, RISK_LEVELS } from './services/risk.js';
import { REMINDER_TEMPLATES } from './routes/reminders.js';

export function seed() {
  console.log('🌱 Seeding SwasthyaSaathi Database...');
  
  // Re-create tables cleanly
  db.exec(`
    DROP TABLE IF EXISTS reminders;
    DROP TABLE IF EXISTS visits;
    DROP TABLE IF EXISTS readings;
    DROP TABLE IF EXISTS patients;
    DROP TABLE IF EXISTS users;
  `);

  initDB();

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Insert Users: 1 PHC Officer + 3 ASHA Workers
  const insertUserStmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phc_name, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const drId = Number(insertUserStmt.run(
    'Dr. Ramesh Sharma',
    'dr.sharma@swasthya.org',
    passwordHash,
    'phc_officer',
    'Kengeri Primary Health Centre',
    '+91 98450 11223'
  ).lastInsertRowid);

  const asha1Id = Number(insertUserStmt.run(
    'Sunita Devi',
    'asha.sunita@swasthya.org',
    passwordHash,
    'asha',
    'Kengeri Primary Health Centre',
    '+91 98860 33445'
  ).lastInsertRowid);

  const asha2Id = Number(insertUserStmt.run(
    'Lakshmi Gowda',
    'asha.lakshmi@swasthya.org',
    passwordHash,
    'asha',
    'Kengeri Primary Health Centre',
    '+91 94480 55667'
  ).lastInsertRowid);

  const asha3Id = Number(insertUserStmt.run(
    'Meena Bai',
    'asha.meena@swasthya.org',
    passwordHash,
    'asha',
    'Kengeri Primary Health Centre',
    '+91 97310 77889'
  ).lastInsertRowid);

  console.log('✅ Created 1 PHC Officer and 3 ASHA Workers.');

  // 2. Patient Dataset (40 realistic patients)
  const patientTemplates = [
    // Sunita Devi's patients (Kumbalgodu & Doddabele)
    { asha_id: asha1Id, name: 'Anand Kumar Rao', age: 58, gender: 'male', village: 'Kumbalgodu', phone: '+91 98451 22301', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha1Id, name: 'Parvatiamma', age: 64, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22302', condition: 'both', lang: 'kn', initialSeverity: 'severe', progression: 'improved' },
    { asha_id: asha1Id, name: 'Basavaraj Patil', age: 52, gender: 'male', village: 'Doddabele', phone: '+91 98451 22303', condition: 'diabetes', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha1Id, name: 'Shubha Venkatesh', age: 49, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22304', condition: 'hypertension', lang: 'kn', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha1Id, name: 'Manjunath Swamy', age: 67, gender: 'male', village: 'Doddabele', phone: '+91 98451 22305', condition: 'both', lang: 'en', initialSeverity: 'severe', progression: 'severe' }, // Current severe case!
    { asha_id: asha1Id, name: 'Saraswathi Bai', age: 71, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22306', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha1Id, name: 'Gopal Krishna', age: 55, gender: 'male', village: 'Doddabele', phone: '+91 98451 22307', condition: 'diabetes', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha1Id, name: 'Kamala Devi', age: 61, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22308', condition: 'hypertension', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'uncontrolled' }, // Overdue
    { asha_id: asha1Id, name: 'Rameshwar Lal', age: 59, gender: 'male', village: 'Doddabele', phone: '+91 98451 22309', condition: 'both', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha1Id, name: 'Devamma H', age: 68, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22310', condition: 'hypertension', lang: 'kn', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha1Id, name: 'Nagaraju K', age: 53, gender: 'male', village: 'Doddabele', phone: '+91 98451 22311', condition: 'diabetes', lang: 'kn', initialSeverity: 'severe', progression: 'improved' },
    { asha_id: asha1Id, name: 'Shanta Kumari', age: 47, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22312', condition: 'both', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha1Id, name: 'Venkatesh Murthy', age: 63, gender: 'male', village: 'Doddabele', phone: '+91 98451 22313', condition: 'hypertension', lang: 'en', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha1Id, name: 'Padma Lakshmi', age: 56, gender: 'female', village: 'Kumbalgodu', phone: '+91 98451 22314', condition: 'diabetes', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'controlled' },

    // Lakshmi Gowda's patients (Ramohalli & Anchepalya)
    { asha_id: asha2Id, name: 'Siddaiah M', age: 65, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33401', condition: 'both', lang: 'kn', initialSeverity: 'severe', progression: 'severe' }, // Current severe case!
    { asha_id: asha2Id, name: 'Ratnamma', age: 59, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33402', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha2Id, name: 'Hanumanthappa', age: 72, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33403', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'uncontrolled' },
    { asha_id: asha2Id, name: 'Girijamma', age: 50, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33404', condition: 'diabetes', lang: 'hi', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha2Id, name: 'Suresh Kumar B', age: 54, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33405', condition: 'both', lang: 'en', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha2Id, name: 'Channamma S', age: 62, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33406', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha2Id, name: 'Somanna Gowda', age: 70, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33407', condition: 'diabetes', lang: 'kn', initialSeverity: 'severe', progression: 'improved' },
    { asha_id: asha2Id, name: 'Lalithamba', age: 58, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33408', condition: 'both', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha2Id, name: 'Shivanna Pujari', age: 66, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33409', condition: 'hypertension', lang: 'hi', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha2Id, name: 'Bhagyamma', age: 51, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33410', condition: 'diabetes', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha2Id, name: 'Krishnappa Reddy', age: 63, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33411', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha2Id, name: 'Radha Bai', age: 48, gender: 'female', village: 'Anchepalya', phone: '+91 94481 33412', condition: 'both', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'uncontrolled' },
    { asha_id: asha2Id, name: 'Eshwarappa C', age: 75, gender: 'male', village: 'Ramohalli', phone: '+91 94481 33413', condition: 'hypertension', lang: 'kn', initialSeverity: 'severe', progression: 'improved' },

    // Meena Bai's patients (Sulikere & Channasandra)
    { asha_id: asha3Id, name: 'Mohan Ram', age: 60, gender: 'male', village: 'Sulikere', phone: '+91 97311 44501', condition: 'hypertension', lang: 'hi', initialSeverity: 'severe', progression: 'severe' }, // Current severe case!
    { asha_id: asha3Id, name: 'Sakamma', age: 67, gender: 'female', village: 'Channasandra', phone: '+91 97311 44502', condition: 'diabetes', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha3Id, name: 'Raju Nayak', age: 53, gender: 'male', village: 'Sulikere', phone: '+91 97311 44503', condition: 'both', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha3Id, name: 'Jayamma K', age: 61, gender: 'female', village: 'Channasandra', phone: '+91 97311 44504', condition: 'hypertension', lang: 'kn', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha3Id, name: 'Govindappa', age: 69, gender: 'male', village: 'Sulikere', phone: '+91 97311 44505', condition: 'diabetes', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha3Id, name: 'Sunandamma', age: 54, gender: 'female', village: 'Channasandra', phone: '+91 97311 44506', condition: 'both', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'uncontrolled' },
    { asha_id: asha3Id, name: 'Vittal Rao', age: 58, gender: 'male', village: 'Sulikere', phone: '+91 97311 44507', condition: 'hypertension', lang: 'hi', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha3Id, name: 'Geetha Kumari', age: 46, gender: 'female', village: 'Channasandra', phone: '+91 97311 44508', condition: 'diabetes', lang: 'en', initialSeverity: 'controlled', progression: 'controlled' },
    { asha_id: asha3Id, name: 'Narayana Swamy', age: 73, gender: 'male', village: 'Sulikere', phone: '+91 97311 44509', condition: 'both', lang: 'kn', initialSeverity: 'severe', progression: 'improved' },
    { asha_id: asha3Id, name: 'Kempamma', age: 65, gender: 'female', village: 'Channasandra', phone: '+91 97311 44510', condition: 'hypertension', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha3Id, name: 'Praveen Chandran', age: 52, gender: 'male', village: 'Sulikere', phone: '+91 97311 44511', condition: 'diabetes', lang: 'en', initialSeverity: 'uncontrolled', progression: 'controlled' },
    { asha_id: asha3Id, name: 'Malleshi B', age: 64, gender: 'male', village: 'Channasandra', phone: '+91 97311 44512', condition: 'both', lang: 'kn', initialSeverity: 'uncontrolled', progression: 'improved' },
    { asha_id: asha3Id, name: 'Indiramma', age: 57, gender: 'female', village: 'Sulikere', phone: '+91 97311 44513', condition: 'hypertension', lang: 'kn', initialSeverity: 'controlled', progression: 'controlled' },
  ];

  const insertPatientStmt = db.prepare(`
    INSERT INTO patients (asha_id, name, age, gender, village, phone, condition, preferred_language, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReadingStmt = db.prepare(`
    INSERT INTO readings (patient_id, recorded_at, systolic, diastolic, blood_sugar, sugar_type, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVisitStmt = db.prepare(`
    INSERT INTO visits (patient_id, scheduled_date, completed_date, status, reminder_sent)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertReminderStmt = db.prepare(`
    INSERT INTO reminders (patient_id, message, language, sent_at, channel)
    VALUES (?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  patientTemplates.forEach((p, idx) => {
    // Stagger creation dates across the past 4-6 months
    const creationDaysAgo = 120 + (idx % 60);
    const createdAt = new Date(today);
    createdAt.setDate(createdAt.getDate() - creationDaysAgo);
    const createdAtIso = createdAt.toISOString();

    const patientRes = insertPatientStmt.run(
      p.asha_id,
      p.name,
      p.age,
      p.gender,
      p.village,
      p.phone,
      p.condition,
      p.lang,
      createdAtIso
    );
    const patientId = Number(patientRes.lastInsertRowid);

    // Generate 3 to 6 historical readings over time
    const readingCount = 4 + (idx % 3);
    let currentDate = new Date(createdAt);

    for (let rIdx = 0; rIdx < readingCount; rIdx++) {
      const isLatest = rIdx === readingCount - 1;
      
      // Determine values based on progression curve
      let sys = null;
      let dia = null;
      let sugar = null;
      let sugarType = rIdx % 2 === 0 ? 'fasting' : 'random';

      const progressRatio = rIdx / (readingCount - 1); // 0 (start) to 1 (latest)

      if (p.condition === 'hypertension' || p.condition === 'both') {
        if (p.progression === 'severe' && isLatest) {
          sys = 184 + (idx % 8);
          dia = 112 + (idx % 6);
        } else if (p.progression === 'controlled' || (p.progression === 'improved' && progressRatio >= 0.6)) {
          sys = Math.round(155 - (progressRatio * 32)) + (rIdx % 4); // drops towards 123
          dia = Math.round(96 - (progressRatio * 18)) + (rIdx % 3);   // drops towards 78
        } else if (p.progression === 'uncontrolled') {
          sys = 146 + (rIdx % 10);
          dia = 92 + (rIdx % 6);
        } else {
          // initial or early improvement
          sys = Math.round(160 - (progressRatio * 20));
          dia = Math.round(100 - (progressRatio * 12));
        }
      }

      if (p.condition === 'diabetes' || p.condition === 'both') {
        if (p.progression === 'severe' && isLatest) {
          sugar = sugarType === 'fasting' ? 315 : 420;
        } else if (p.progression === 'controlled' || (p.progression === 'improved' && progressRatio >= 0.6)) {
          sugar = sugarType === 'fasting' 
            ? Math.round(170 - (progressRatio * 60)) // drops to ~110
            : Math.round(240 - (progressRatio * 90)); // drops to ~150
        } else if (p.progression === 'uncontrolled') {
          sugar = sugarType === 'fasting' ? 145 + (rIdx % 20) : 230 + (rIdx % 30);
        } else {
          sugar = sugarType === 'fasting' ? Math.round(180 - (progressRatio * 30)) : Math.round(260 - (progressRatio * 40));
        }
      }

      const risk = evaluateReadingRisk({
        condition: p.condition,
        systolic: sys,
        diastolic: dia,
        bloodSugar: sugar,
        sugarType,
      });

      const readingDateIso = currentDate.toISOString();
      const notes = isLatest 
        ? 'Latest field follow-up assessment' 
        : `Routine check-up visit #${rIdx + 1}`;

      insertReadingStmt.run(
        patientId,
        readingDateIso,
        sys,
        dia,
        sugar,
        sugarType,
        risk.riskLevel,
        notes
      );

      // Add a completed visit corresponding to historical readings
      if (!isLatest) {
        const completedDateIso = readingDateIso;
        const scheduledDateStr = readingDateIso.split('T')[0];
        insertVisitStmt.run(patientId, scheduledDateStr, completedDateIso, 'done', 1);

        // Advance date towards today
        currentDate.setDate(currentDate.getDate() + 25 + (rIdx * 3));
      }
    }

    // Now create the current active/pending/overdue/due-today visit for this patient
    let nextScheduledOffset = 0;
    let visitStatus = 'pending';

    if (idx === 0 || idx === 1 || idx === 14) {
      // Due Today!
      nextScheduledOffset = 0;
      visitStatus = 'pending';
    } else if (idx === 4 || idx === 13 || idx === 26) {
      // Severe cases: follow-up due in 1-2 days or overdue by 1 day
      nextScheduledOffset = (idx % 2 === 0) ? -1 : 1;
      visitStatus = 'pending';
    } else if (idx === 7 || idx === 16 || idx === 29) {
      // Overdue by 2-4 days (some pending, some missed)
      nextScheduledOffset = - (2 + (idx % 3));
      visitStatus = nextScheduledOffset <= -3 ? 'missed' : 'pending';
    } else if (idx % 4 === 0) {
      // Overdue by 1-2 days
      nextScheduledOffset = -1;
      visitStatus = 'pending';
    } else {
      // Upcoming future visit (due in 5-25 days)
      nextScheduledOffset = 5 + (idx % 20);
      visitStatus = 'pending';
    }

    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + nextScheduledOffset);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    insertVisitStmt.run(patientId, nextDateStr, null, visitStatus, idx % 2 === 0 ? 1 : 0);

    // Create a few realistic reminder records
    if (idx % 3 === 0) {
      const template = REMINDER_TEMPLATES[p.lang] || REMINDER_TEMPLATES.hi;
      const ashaName = p.asha_id === asha1Id ? 'Sunita Devi' : p.asha_id === asha2Id ? 'Lakshmi Gowda' : 'Meena Bai';
      const msg = template(p.name, nextDateStr, ashaName);
      const reminderDate = new Date(today);
      reminderDate.setDate(reminderDate.getDate() - (idx % 5));
      insertReminderStmt.run(patientId, msg, p.lang, reminderDate.toISOString(), idx % 4 === 0 ? 'ivr' : 'sms');
    }
  });

  console.log(`✅ Seeded 40 patients with rich 4-6 month longitudinal reading histories.`);
  console.log('✅ Generated visits (Due Today, Overdue, Severe Referrals, and Completed).');
  console.log('🎉 Database seeding complete!');
}

// Auto-run if executed directly via `node src/seed.js`
if (process.argv[1]?.endsWith('seed.js')) {
  seed();
}

import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:5000/api';

async function testFullFlow() {
  console.log('🔄 Starting Full-Stack End-to-End Verification...\n');

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  console.log('✅ 1. Health check passed:', health);

  // 2. ASHA Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'asha.sunita@swasthya.org',
      password: 'password123',
    }),
  });
  const ashaAuth = await loginRes.json();
  assert.ok(ashaAuth.token, 'Token must exist');
  assert.equal(ashaAuth.user.role, 'asha');
  console.log('✅ 2. ASHA Login successful for:', ashaAuth.user.name);

  const ashaHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ashaAuth.token}`,
  };

  // 3. Fetch Today's Visits for ASHA
  const visitsRes = await fetch(`${API_BASE}/visits/today`, { headers: ashaHeaders });
  const visitsData = await visitsRes.json();
  assert.ok(Array.isArray(visitsData.visits), 'Visits must be an array');
  console.log(`✅ 3. Today's visits fetched (${visitsData.visits.length} due/overdue visits in queue)`);

  const firstVisit = visitsData.visits[0];
  console.log(`   - Priority visit: ${firstVisit.patient_name} (${firstVisit.latest_risk_level}, Overdue: ${firstVisit.days_overdue} days)`);

  // 4. Complete a visit with clinical reading (e.g. BP 132/84 -> Controlled)
  const completeRes = await fetch(`${API_BASE}/visits/${firstVisit.visit_id}/complete`, {
    method: 'POST',
    headers: ashaHeaders,
    body: JSON.stringify({
      systolic: 132,
      diastolic: 84,
      notes: 'Patient adherence improved, lifestyle counseling given',
    }),
  });
  const completeData = await completeRes.json();
  assert.equal(completeData.riskEvaluation.riskLevel, 'controlled');
  assert.equal(completeData.riskEvaluation.followUpDays, 30);
  console.log('✅ 4. Visit completed & next follow-up auto-scheduled for:', completeData.nextScheduledDate);

  // 5. Register a new patient (High BP: 155/95 -> Uncontrolled -> +14 days)
  const newPatientRes = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: ashaHeaders,
    body: JSON.stringify({
      name: 'Ravi Shankar',
      age: 55,
      gender: 'male',
      village: 'Kumbalgodu',
      phone: '+91 98459 99888',
      condition: 'hypertension',
      preferred_language: 'kn',
      systolic: 155,
      diastolic: 95,
      notes: 'Initial screening at community health camp',
    }),
  });
  const newPatientData = await newPatientRes.json();
  assert.equal(newPatientData.riskEvaluation.riskLevel, 'uncontrolled');
  assert.equal(newPatientData.riskEvaluation.followUpDays, 14);
  console.log(`✅ 5. Registered new patient "${newPatientData.patientId}" -> Risk: ${newPatientData.riskEvaluation.riskLevel}, Next Visit: ${newPatientData.nextScheduledDate}`);

  // 6. Send regional SMS/IVR reminder
  const reminderRes = await fetch(`${API_BASE}/reminders/send`, {
    method: 'POST',
    headers: ashaHeaders,
    body: JSON.stringify({
      patient_id: newPatientData.patientId,
      language: 'kn',
      channel: 'sms',
    }),
  });
  const reminderData = await reminderRes.json();
  assert.ok(reminderData.reminderId);
  console.log('✅ 6. Dispatched regional Kannada reminder:', reminderData.preview.message);

  // 7. PHC Officer Login
  const phcLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.sharma@swasthya.org',
      password: 'password123',
    }),
  });
  const phcAuth = await phcLoginRes.json();
  assert.equal(phcAuth.user.role, 'phc_officer');
  console.log('✅ 7. PHC Officer login successful for:', phcAuth.user.name);

  const phcHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${phcAuth.token}`,
  };

  // 8. PHC Dashboard Summary KPIs
  const sumRes = await fetch(`${API_BASE}/dashboard/summary`, { headers: phcHeaders });
  const summary = await sumRes.json();
  assert.ok(summary.kpis.totalPatients > 0);
  console.log(`✅ 8. PHC Summary: ${summary.kpis.totalPatients} Patients, Control Rate: ${summary.kpis.controlRatePct}%, Overdue: ${summary.kpis.overdueVisits}, Severe: ${summary.kpis.severeCount}`);

  // 9. Monthly Control Rate Trends
  const trendsRes = await fetch(`${API_BASE}/dashboard/trends`, { headers: phcHeaders });
  const trendsData = await trendsRes.json();
  assert.ok(trendsData.trends.length > 0);
  console.log(`✅ 9. Monthly Trends data points (${trendsData.trends.length} months loaded)`);

  // 10. ASHA Performance Scorecard
  const ashaPerfRes = await fetch(`${API_BASE}/dashboard/asha-performance`, { headers: phcHeaders });
  const ashaPerf = await ashaPerfRes.json();
  assert.equal(ashaPerf.ashaPerformance.length, 3);
  console.log(`✅ 10. ASHA Performance Scorecard loaded for ${ashaPerf.ashaPerformance.length} workers:`);
  ashaPerf.ashaPerformance.forEach(a => {
    console.log(`   - ${a.name}: ${a.totalPatients} patients, ${a.controlRate}% controlled, ${a.visitCompletionRate}% adherence`);
  });

  // 11. Severe & Overdue drilldown list
  const severeRes = await fetch(`${API_BASE}/dashboard/severe-overdue`, { headers: phcHeaders });
  const severeData = await severeRes.json();
  assert.ok(Array.isArray(severeData.patients));
  console.log(`✅ 11. Severe & Overdue Triage Table loaded (${severeData.patients.length} actionable records)`);

  console.log('\n🎉 ALL FULL-STACK API & BUSINESS LOGIC FLOWS PASSED FLAWLESSLY!\n');
}

testFullFlow().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

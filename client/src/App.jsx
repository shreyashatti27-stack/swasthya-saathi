import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './i18n/i18nContext';
import { OfflineProvider } from './context/OfflineContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';

// Pages
import Login from './pages/Login';
import TodaysVisits from './pages/asha/TodaysVisits';
import AddPatient from './pages/asha/AddPatient';
import PatientDetail from './pages/asha/PatientDetail';
import MyPatients from './pages/asha/MyPatients';
import RemindersLog from './pages/asha/RemindersLog';
import PHCDashboard from './pages/phc/PHCDashboard';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

function RoleHomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'phc_officer') return <Navigate to="/phc/dashboard" replace />;
  return <Navigate to="/asha/today" replace />;
}

export default function App() {
  return (
    <I18nProvider>
      <OfflineProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<RoleHomeRedirect />} />

                {/* ASHA worker routes */}
                <Route path="/asha/today" element={<TodaysVisits />} />
                <Route path="/asha/add-patient" element={<AddPatient />} />
                <Route path="/asha/patients" element={<MyPatients />} />
                <Route path="/asha/patient/:id" element={<PatientDetail />} />
                <Route path="/asha/reminders" element={<RemindersLog />} />

                {/* PHC Officer routes */}
                <Route path="/phc/dashboard" element={<PHCDashboard />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<RoleHomeRedirect />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </OfflineProvider>
    </I18nProvider>
  );
}

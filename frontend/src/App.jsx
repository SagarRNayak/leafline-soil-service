import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Authenticated Pages
import DashboardPage from './pages/DashboardPage';
import SampleSubmissionPage from './pages/SampleSubmissionPage';
import AnalysisResultsPage from './pages/AnalysisResultsPage';
import NutrientDeficiencyPage from './pages/NutrientDeficiencyPage';
import SoilHistoryPage from './pages/SoilHistoryPage';
import SampleCorrectionPage from './pages/SampleCorrectionPage';
import ResearcherDashboardPage from './pages/ResearcherDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Authenticated Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/submit-sample" element={<SampleSubmissionPage />} />
            <Route path="/analysis-results" element={<AnalysisResultsPage />} />
            <Route path="/deficiencies" element={<NutrientDeficiencyPage />} />
            <Route path="/history" element={<SoilHistoryPage />} />
            <Route path="/sample-correction" element={<SampleCorrectionPage />} />
            <Route path="/researcher" element={<ResearcherDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

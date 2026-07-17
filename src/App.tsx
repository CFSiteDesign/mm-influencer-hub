import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Watermark } from '@/components/Watermark';
import { IframeEscapeHatch } from '@/components/IframeEscapeHatch';

const ApplyTestPage = lazy(() => import('./pages/ApplyTestPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicantDetailPage = lazy(() => import('./pages/ApplicantDetailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CodesPage = lazy(() => import('./pages/CodesPage'));
const CreatorDetailPage = lazy(() => import('./pages/CreatorDetailPage'));
const TakeoverApplyPage = lazy(() => import('./pages/TakeoverApplyPage'));
const BookingRequestPage = lazy(() => import('./pages/BookingRequestPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const MonthlyReportPage = lazy(() => import('./pages/MonthlyReportPage'));

const queryClient = new QueryClient();

function ProtectedRoute({ children, loginPath = '/admin' }: { children: React.ReactNode; loginPath?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to={loginPath} replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
         <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <Routes>
              {/* ── Production flow (original, unchanged) ── */}
              <Route path="/" element={<TakeoverApplyPage />} />
              <Route path="/apply" element={<TakeoverApplyPage />} />
              <Route path="/admin" element={<LoginPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/applicants/:id" element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />
              <Route path="/codes" element={<ProtectedRoute><CodesPage /></ProtectedRoute>} />
              <Route path="/creators/:id" element={<ProtectedRoute><CreatorDetailPage /></ProtectedRoute>} />
              <Route path="/take-over" element={<TakeoverApplyPage />} />

              {/* ── Test flow (new booking system, isolated emails) ── */}
              <Route path="/apply-test" element={<ApplyTestPage />} />
              <Route path="/admin-test" element={<LoginPage redirectTo="/dashboard-test" />} />
              <Route path="/dashboard-test" element={<ProtectedRoute loginPath="/admin-test"><DashboardPage mode="test" /></ProtectedRoute>} />
              <Route path="/applicants-test/:id" element={<ProtectedRoute loginPath="/admin-test"><ApplicantDetailPage mode="test" /></ProtectedRoute>} />
              <Route path="/bookings-test" element={<ProtectedRoute loginPath="/admin-test"><BookingsPage /></ProtectedRoute>} />
              <Route path="/reports-test" element={<ProtectedRoute loginPath="/admin-test"><MonthlyReportPage mode="test" /></ProtectedRoute>} />
              <Route path="/book/:token" element={<BookingRequestPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Watermark />
          <IframeEscapeHatch />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Watermark } from '@/components/Watermark';

const ApplyPage = lazy(() => import('./pages/ApplyPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicantDetailPage = lazy(() => import('./pages/ApplicantDetailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CodesPage = lazy(() => import('./pages/CodesPage'));
const CreatorDetailPage = lazy(() => import('./pages/CreatorDetailPage'));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/admin" replace />;
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
              <Route path="/" element={<ApplyPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              <Route path="/admin" element={<LoginPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/applicants/:id" element={<ProtectedRoute><ApplicantDetailPage /></ProtectedRoute>} />
              <Route path="/codes" element={<ProtectedRoute><CodesPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Watermark />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AlumniChangePassword from "./pages/alumni/AlumniChangePassword";
import AdminSurveyManager from "./pages/admin/AdminSurveyManager";
import AlumniSubmissions from "./pages/alumni/AlumniSubmissions";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminPredictions from "./pages/admin/AdminPredictions";
import AlumniDashboard from "./pages/alumni/AlumniDashboard";
import SystemOverview from "./pages/shared/SystemOverview";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AlumniProfile from "./pages/alumni/AlumniProfile";
import AlumniResults from "./pages/alumni/AlumniResults";
import AlumniSurvey from "./pages/alumni/AlumniSurvey";
import AdminReports from "./pages/admin/AdminReports";
import AdminContent from "./pages/admin/AdminContent";
import ActivationPage from "./pages/ActivationPage";
import { Toaster } from "@/components/ui/toaster";
import AdminUsers from "./pages/admin/AdminUsers";
import HelpGuide from "./pages/shared/HelpGuide";
import SuperAdminAuditLogs from "./pages/superadmin/SuperAdminAuditLogs";
import SuperAdminAdmins from "./pages/superadmin/SuperAdminAdmins";
import SuperAdminSettings from "./pages/superadmin/SuperAdminSettings";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AppLayout from "./pages/AppLayout";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

function AppRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'superadmin' ? '/app/superadmin/audit-logs' : user.role === 'admin' ? '/app/admin/analytics' : '/app/alumni/dashboard'} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/activate" element={<ActivationPage />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppRedirect />} />
                <Route path="admin/analytics" element={<AdminAnalytics />} />
                <Route path="admin/predictions" element={<AdminPredictions />} />
                <Route path="admin/reports" element={<AdminReports />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/survey-manager" element={<AdminSurveyManager />} />
                <Route path="admin/content" element={<AdminContent />} />
                <Route path="superadmin/audit-logs" element={<SuperAdminAuditLogs />} />
                <Route path="superadmin/admins" element={<SuperAdminAdmins />} />
                <Route path="superadmin/settings" element={<SuperAdminSettings />} />
                <Route path="alumni/dashboard" element={<AlumniDashboard />} />
                <Route path="alumni/profile" element={<AlumniProfile />} />
                <Route path="alumni/survey" element={<AlumniSurvey />} />
                <Route path="alumni/submissions" element={<AlumniSubmissions />} />
                <Route path="alumni/results" element={<AlumniResults />} />
                <Route path="alumni/change-password" element={<AlumniChangePassword />} />
                <Route path="overview" element={<SystemOverview />} />
                <Route path="help" element={<HelpGuide />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

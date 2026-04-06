import { SidebarProvider } from '@/components/ui/sidebar';
import { FirstLoginDialog } from '@/components/layout/FirstLoginDialog';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { useEffect } from 'react';

export default function AppLayout() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t px-6 py-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Alumni Tracer v1.0</span>
            <span>support@university.edu</span>
          </footer>
        </div>
      </div>
      {user.role === 'alumni' && user.firstLogin && <FirstLoginDialog />}
    </SidebarProvider>
  );
}
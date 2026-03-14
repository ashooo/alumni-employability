import { useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, BarChart3, Brain, FileText, Users, ClipboardList, Settings, HelpCircle, Home, User, ClipboardCheck, FileCheck, Star, Lock } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const adminNav = [
  { title: 'Analytics Dashboard', url: '/app/admin/analytics', icon: BarChart3 },
  { title: 'Prediction Models', url: '/app/admin/predictions', icon: Brain },
  { title: 'Reports', url: '/app/admin/reports', icon: FileText },
  { title: 'User Management', url: '/app/admin/users', icon: Users },
  { title: 'Survey Manager', url: '/app/admin/survey-manager', icon: ClipboardList },
  { title: 'Content Manager', url: '/app/admin/content', icon: Settings },
];

const alumniNav = [
  { title: 'Dashboard', url: '/app/alumni/dashboard', icon: LayoutDashboard },
  { title: 'My Profile', url: '/app/alumni/profile', icon: User },
  { title: 'Tracer Survey', url: '/app/alumni/survey', icon: ClipboardCheck },
  { title: 'My Submissions', url: '/app/alumni/submissions', icon: FileCheck },
  { title: 'Results & Jobs', url: '/app/alumni/results', icon: Star },
  { title: 'Change Password', url: '/app/alumni/change-password', icon: Lock },
];

const sharedNav = [
  { title: 'System Overview', url: '/app/overview', icon: Home },
  { title: 'Help / Guide', url: '/app/help', icon: HelpCircle },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const roleNav = user?.role === 'admin' ? adminNav : alumniNav;
  const roleLabel = user?.role === 'admin' ? 'Administration' : 'My Portal';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sidebar-primary/20 shrink-0">
            <GraduationCap className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && <span className="font-display font-bold text-sm text-sidebar-foreground">Alumni Tracer</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? '' : roleLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roleNav.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="nav-link-active">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? '' : 'General'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sharedNav.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="nav-link-active">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50">
            © 2026 University
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

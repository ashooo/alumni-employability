import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar} from '@/components/ui/sidebar';
import { GraduationCap, LayoutDashboard, BarChart3, Brain, FileText, Users, ClipboardList, Settings, HelpCircle, Home, User, ClipboardCheck, FileCheck, Star, Lock, ShieldCheck, ScrollText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';

const adminNav = [
  { title: 'Survey Manager', url: '/app/admin/survey-manager', icon: ClipboardList },
  { title: 'Analytics Dashboard', url: '/app/admin/analytics', icon: BarChart3 },
  { title: 'Prediction Models', url: '/app/admin/predictions', icon: Brain },
  { title: 'Content Manager', url: '/app/admin/content', icon: Settings },
  { title: 'User Management', url: '/app/admin/users', icon: Users },
  { title: 'Reports', url: '/app/admin/reports', icon: FileText },
];

const superAdminNav = [
  { title: 'Audit Logs', url: '/app/superadmin/audit-logs', icon: ScrollText },
  { title: 'Admin Management', url: '/app/superadmin/admins', icon: ShieldCheck },
  { title: 'System Settings', url: '/app/superadmin/settings', icon: Settings },
  // Super admin can still access regular admin tools
  ...adminNav,
];

const alumniNav = [
  { title: 'My Submissions', url: '/app/alumni/submissions', icon: FileCheck },
  { title: 'Change Password', url: '/app/alumni/change-password', icon: Lock },
  { title: 'Tracer Survey', url: '/app/alumni/survey', icon: ClipboardCheck },
  { title: 'Dashboard', url: '/app/alumni/dashboard', icon: LayoutDashboard },
  { title: 'Results & Jobs', url: '/app/alumni/results', icon: Star },
  { title: 'My Profile', url: '/app/alumni/profile', icon: User },
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

  const roleNav = user?.role === 'superadmin' ? superAdminNav : user?.role === 'admin' ? adminNav : alumniNav;
  const roleLabel = user?.role === 'superadmin' ? 'Super Administration' : user?.role === 'admin' ? 'Administration' : 'My Portal';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
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
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="group-data-[collapsible=icon]:justify-center"
                  >
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
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="group-data-[collapsible=icon]:justify-center"
                  >
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

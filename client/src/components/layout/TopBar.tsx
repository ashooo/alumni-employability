import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, Bell, LogOut, ChevronDown, GraduationCap, Moon, Sun } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSidebar } from '@/components/ui/sidebar';
import { useTheme } from 'next-themes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface NotificationItem {
  id: number;
  title: string;
  body?: string | null;
  type?: string;
  createdAt?: string;
  read: boolean;
}

export default function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const fetchNotifications = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/notifications/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = async (notificationId: number) => {
    const target = notifications.find(n => n.id === notificationId);
    if (!target || target.read) return;

    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));

    try {
      const token = getToken();
      if (!token) return;

      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.', });
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'User';
  };
  
  const badgeClass = (role?: string) =>
    clsx(
      "text-[10px]",
      role === "superadmin"
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
        : role === "admin"
        ? "bg-primary/10 text-primary"
        : "bg-success/10 text-success"
    );

  const notificationTextClass = (read: boolean) =>
    clsx("text-sm", !read && "font-medium");

  const headerClass = clsx(
    "sticky top-0 z-30 flex h-16 items-center gap-4 border-b",
    "bg-background/95 backdrop-blur px-4 md:px-6"
  );
  
  const isDark = resolvedTheme === 'dark';
  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <header className={headerClass}>
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary lg:hidden" />
        <span className="font-display font-semibold text-sm lg:hidden">
          {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin Panel' : 'Alumni Tracer'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications with role badge */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user && (
            <Badge variant="outline" className={badgeClass(user.role)}>
              {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Alumni'}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] 
                                   font-medium text-destructive-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="cursor-pointer"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <p className={notificationTextClass(notification.read)}>
                      {notification.title}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="hidden lg:flex flex-col items-start text-sm">
                <span className="font-medium">{getDisplayName()}</span>
              </div>

              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="cursor-pointer text-sm text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} 
                              className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
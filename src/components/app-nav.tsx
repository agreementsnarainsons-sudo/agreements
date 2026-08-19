import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, FileText, Hash } from "lucide-react";
import { toast } from "sonner";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/agreements", label: "Agreements", icon: FileText },
  { to: "/serial-counters", label: "Serial #", icon: Hash },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/auth";
  };
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-border/60 backdrop-blur-xl">
      <div className="container-lg flex items-center justify-between h-16 gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.78_0.17_78)] to-[oklch(0.65_0.15_60)] flex items-center justify-center text-navy-deep font-bold shadow-lg group-hover:scale-110 transition-transform">N</div>
          <span className="font-bold gold-text hidden sm:inline">Narainsons</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className="link-nav flex items-center gap-1.5 whitespace-nowrap" data-active={active}>
                <Icon className="w-4 h-4" /> <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Logout</span>
        </Button>
      </div>
    </header>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Narainsons Investments — Loan Management" },
      { name: "description", content: "Loan management & digital agreement platform for Narainsons Investments." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setChecking(false);
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">Loading Narainsons…</p>
      </div>
    );
  }

  return null;
}

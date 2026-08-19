import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, TrendingUp, Users, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Narainsons Investments" }, { name: "description", content: "Loan portfolio overview" }] }),
  component: DashboardPage,
});

function AnimatedCount({ value, delay = 0 }: { value: number; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start - delay) / dur);
      if (p < 0) { raf = requestAnimationFrame(tick); return; }
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  return <span>{n}</span>;
}

function DashboardPage() {
  const nav = useNavigate();
  const fetchCustomers = useServerFn(listCustomers);
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() });

  const stats = {
    total: customers?.length ?? 0,
    emi: customers?.filter(c => c.status?.includes("EMI") || c.status?.includes("Restructuring")).length ?? 0,
    mora: customers?.filter(c => c.status?.includes("Moratorium")).length ?? 0,
    topup: customers?.filter(c => c.status?.includes("TopUp") || c.status?.includes("Top-Up") || c.status?.includes("Top Up")).length ?? 0,
    loan: customers?.filter(c => c.status?.includes("Loan")).length ?? 0,
    closed: customers?.filter(c => c.status?.includes("Closed")).length ?? 0,
  };

  const cards = [
    { label: "Total Customers", value: stats.total, icon: Users, color: "text-accent" },
    { label: "EMI & Restructuring", value: stats.emi, icon: TrendingUp, color: "text-blue-400" },
    { label: "Moratorium", value: stats.mora, icon: BarChart3, color: "text-purple-400" },
    { label: "Top-Up", value: stats.topup, icon: TrendingUp, color: "text-amber-400" },
    { label: "Loan Agreement", value: stats.loan, icon: FileText, color: "text-cyan-400" },
    { label: "Closed / NDC", value: stats.closed, icon: FileText, color: "text-emerald-400" },
  ];

  const actions = [
    { title: "Customer Management", desc: "Add, edit and manage customer records and loan details", to: "/customers" as const },
    { title: "Digital Agreements", desc: "EMI, Moratorium, and NDC agreements with OTP signing", to: "/agreements" as const },
    { title: "Serial Counters", desc: "Manage serial number counters for generated documents", to: "/serial-counters" as const },
  ];

  return (
    <div className="text-foreground">
      <div className="hero-panel">
        <div className="container-lg py-12 relative">
          <h1 className="text-4xl md:text-5xl font-bold text-white anim-slide-up">Narainsons <span className="gold-text">Investments</span></h1>
          <p className="text-blue-100/80 mt-3 anim-slide-up" style={{ animationDelay: "80ms" }}>Loan Management &amp; Digital Agreement Platform</p>
        </div>
      </div>
      <div className="container-lg py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-12">
          {cards.map(({ label, value, icon: Icon, color }, i) => (
            <Card key={label} className="stat-card anim-count-up" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label">{label}</p>
                  <p className="stat-number mt-3"><AnimatedCount value={value} delay={i * 90} /></p>
                </div>
                <div className={`p-2.5 rounded-lg bg-secondary/50 ${color}`}><Icon className="w-6 h-6" /></div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {actions.map((a, i) => (
            <Card key={a.title} onClick={() => nav({ to: a.to })} className="group relative cursor-pointer p-6 border border-border bg-card hover:border-accent/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden anim-slide-up" style={{ animationDelay: `${400 + i * 100}ms` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-lg font-bold text-accent mb-2 relative">{a.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 relative">{a.desc}</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent relative">
                Open <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>

        {customers && customers.length > 0 && (
          <div className="anim-slide-up" style={{ animationDelay: "800ms" }}>
            <h3 className="text-xl font-bold mb-4">Recent Customers</h3>
            <Card className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-mid/70 text-accent">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.slice(0, 5).map((c, idx) => (
                      <tr key={c.id} className="table-row-anim border-b border-border/50 hover:bg-secondary/40 transition" style={{ animationDelay: `${idx * 60}ms` }}>
                        <td className="px-6 py-3 text-sm font-medium">{c.name}</td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">{c.oldAccountNumber}</td>
                        <td className="px-6 py-3"><span className={c.status?.includes("EMI") || c.status?.includes("Restructuring") ? "badge-emi" : c.status?.includes("Moratorium") ? "badge-mora" : "badge-closed"}>{c.status}</span></td>
                        <td className="px-6 py-3 text-sm">₹{c.pendingAmount || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-16 pb-8">
          <Button onClick={() => { window.location.href = "/lovable/backend"; }} className="btn-gold">View Backend</Button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSerialCounters, updateSerialCounter } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/serial-counters")({
  head: () => ({ meta: [{ title: "Serial Counters — Narainsons" }] }),
  component: SerialCountersPage,
});

type CounterType = "NDC" | "RESTRUCTURING" | "MORATORIUM" | "TOPUP";

function SerialCountersPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSerialCounters);
  const updFn = useServerFn(updateSerialCounter);
  const { data: counters, isLoading } = useQuery({ queryKey: ["counters"], queryFn: () => getFn() });

  const [editing, setEditing] = useState<CounterType | null>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (v: { counterType: CounterType; newValue: string }) => updFn({ data: v }),
    onSuccess: () => { toast.success("Counter updated"); setOpen(false); qc.invalidateQueries({ queryKey: ["counters"] }); },
    onError: () => toast.error("Failed to update"),
  });

  const openEdit = (type: CounterType, current: string) => { setEditing(type); setValue(current); setOpen(true); };

  const cards: { type: CounterType; title: string; desc: string; value: string }[] = [
    { type: "NDC", title: "NDC Counter", desc: "No Due Certificate serial number", value: counters?.ndc ?? "-" },
    { type: "RESTRUCTURING", title: "Restructuring Counter", desc: "Loan Restructuring Agreement serial number", value: counters?.restructuring ?? "-" },
    { type: "MORATORIUM", title: "Moratorium Counter", desc: "Loan Moratorium Agreement serial number", value: counters?.moratorium ?? "-" },
    { type: "TOPUP", title: "Top-Up Counter", desc: "Loan Top-Up Agreement serial number", value: counters?.topup ?? "-" },
  ];

  return (
    <div className="text-foreground">
      <div className="hero-panel">
        <div className="container-lg py-10">
          <h1 className="text-3xl font-bold text-white anim-slide-up">Serial Number Counters</h1>
          <p className="text-blue-100/80 mt-2 anim-slide-up" style={{ animationDelay: "80ms" }}>Manage and update serial number counters for generated documents</p>
        </div>
      </div>
      <div className="container-lg py-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((c, i) => (
              <Card key={c.type} className="stat-card anim-count-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-accent">{c.title}</h3>
                  <span className="text-2xl font-bold gold-text">#</span>
                </div>
                <p className="text-muted-foreground text-sm mb-4">{c.desc}</p>
                <div className="bg-navy-deep/60 border border-border/60 rounded-lg p-4 mb-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Value</p>
                  <p className="text-lg font-mono font-bold gold-text break-all">{c.value}</p>
                </div>
                <Button onClick={() => openEdit(c.type, c.value)} className="btn-gold w-full"><Edit2 className="w-4 h-4" /> Edit</Button>
              </Card>
            ))}
          </div>
        )}
        <Card className="glass-panel p-6 mt-8 anim-slide-up">
          <h3 className="text-lg font-semibold text-accent mb-3">About Serial Counters</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Serial counters are unique identifiers for each agreement type.</li>
            <li>Each generated document is assigned the current counter value.</li>
            <li>You can manually edit the counter value at any time.</li>
            <li>Ensure counter values follow your organization's numbering scheme.</li>
          </ul>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel">
          <DialogHeader><DialogTitle className="gold-text text-2xl">Edit Serial Counter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Counter Type</label><p className="mt-1">{editing === "NDC" ? "No Due Certificate" : editing === "RESTRUCTURING" ? "Loan Restructuring" : editing === "MORATORIUM" ? "Loan Moratorium" : "Loan Top-Up"}</p></div>
            <div><label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">New Value</label><Input value={value} onChange={e => setValue(e.target.value)} /></div>
            <div className="flex gap-3">
              <Button onClick={() => { if (!editing || !value) return toast.error("Enter a value"); mut.mutate({ counterType: editing, newValue: value }); }} className="btn-gold flex-1" disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

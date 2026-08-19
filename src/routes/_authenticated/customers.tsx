import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — Narainsons" }] }),
  component: CustomersPage,
});

const empty = {
  name: "", email: "", phone: "", pan: "", address: "",
  oldAccountNumber: "", newAccountNumber: "", status: "EMI",
  appName: "", pendingAmount: "", emiAmount: "", tenure: "",
  nextEmiDate: "", moratiumStartDate: "", moratiumEndDate: "",
};

function CustomersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCustomers);
  const createFn = useServerFn(createCustomer);
  const updateFn = useServerFn(updateCustomer);
  const deleteFn = useServerFn(deleteCustomer);

  const { data: customers, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => listFn() });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(empty);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const saveMutation = useMutation({
    mutationFn: async () => editingId ? updateFn({ data: { id: editingId, ...form } }) : createFn({ data: form }),
    onSuccess: () => { toast.success(editingId ? "Updated" : "Created"); setIsOpen(false); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delMutation = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const openDialog = (c?: NonNullable<typeof customers>[number]) => {
    if (c) {
      setEditingId(c.id);
      setForm({
        name: c.name, email: c.email, phone: c.phone ?? "", pan: c.pan ?? "", address: c.address ?? "",
        oldAccountNumber: c.oldAccountNumber, newAccountNumber: c.newAccountNumber ?? "",
        status: c.status, appName: c.appName ?? "", pendingAmount: c.pendingAmount ?? "",
        emiAmount: c.emiAmount ?? "", tenure: c.tenure ?? "", nextEmiDate: c.nextEmiDate ?? "",
        moratiumStartDate: c.moratiumStartDate ?? "", moratiumEndDate: c.moratiumEndDate ?? "",
      });
    } else { setEditingId(null); setForm(empty); }
    setIsOpen(true);
  };

  const filtered = customers?.filter(c => {
    const s = search.toLowerCase();
    const match = !s || c.name.toLowerCase().includes(s) || c.oldAccountNumber.includes(search) || c.pan?.includes(search);
    return match && (statusFilter === "all" || c.status === statusFilter);
  });

  const fields: { key: keyof typeof empty; label: string; span?: number; placeholder?: string; type?: string }[] = [
    { key: "name", label: "Name *" }, { key: "email", label: "Email *" },
    { key: "phone", label: "Phone" }, { key: "pan", label: "PAN" },
    { key: "oldAccountNumber", label: "Old Account Number *", span: 2 },
    { key: "newAccountNumber", label: "New Account Number" },
    { key: "appName", label: "App Name" },
    { key: "pendingAmount", label: "Pending Amount" }, { key: "emiAmount", label: "EMI Amount" },
    { key: "tenure", label: "Tenure (Months)" }, { key: "nextEmiDate", label: "Next EMI Date (YYYY-MM-DD)" },
    { key: "moratiumStartDate", label: "Moratorium Start" }, { key: "moratiumEndDate", label: "Moratorium End" },
  ];

  return (
    <div className="text-foreground">
      <div className="hero-panel">
        <div className="container-lg py-10">
          <h1 className="text-3xl font-bold text-white anim-slide-up">Customer Management</h1>
          <p className="text-blue-100/80 mt-2 anim-slide-up" style={{ animationDelay: "80ms" }}>Add, edit, and manage customer records</p>
        </div>
      </div>
      <div className="container-lg py-8">
        <div className="flex flex-col md:flex-row gap-3 mb-6 anim-slide-up">
          <Input placeholder="Search by name, account, or PAN..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="EMI">EMI</SelectItem>
              <SelectItem value="Restructuring">Restructuring</SelectItem>
              <SelectItem value="Moratorium">Moratorium</SelectItem>
              <SelectItem value="TopUp">Top-Up</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} className="btn-gold"><Plus className="w-4 h-4" /> Add Customer</Button>
        </div>

        <Card className="glass-panel overflow-hidden anim-slide-up" style={{ animationDelay: "150ms" }}>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
          ) : filtered && filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-mid/70 text-accent">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} className="table-row-anim border-b border-border/50 hover:bg-secondary/40 transition-colors" style={{ animationDelay: `${idx * 40}ms` }}>
                      <td className="px-6 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{c.email}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground font-mono">{c.oldAccountNumber}</td>
                      <td className="px-6 py-3"><span className={c.status?.includes("EMI") || c.status?.includes("Restructuring") ? "badge-emi" : c.status?.includes("Moratorium") ? "badge-mora" : "badge-closed"}>{c.status}</span></td>
                      <td className="px-6 py-3 text-sm">₹{c.pendingAmount || "-"}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openDialog(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this customer?")) delMutation.mutate(c.id); }} className="hover:bg-destructive/20 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No customers found</div>
          )}
        </Card>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-panel max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="gold-text text-2xl">{editingId ? "Edit Customer" : "Add New Customer"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {fields.map(f => (
              <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">{f.label}</label>
                <Input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMI">EMI</SelectItem>
                  <SelectItem value="Restructuring">Restructuring</SelectItem>
                  <SelectItem value="Moratorium">Moratorium</SelectItem>
                  <SelectItem value="TopUp">Top-Up</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Address</label>
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => { if (!form.name || !form.email || !form.oldAccountNumber) return toast.error("Fill required fields"); saveMutation.mutate(); }} disabled={saveMutation.isPending} className="btn-gold flex-1">{saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

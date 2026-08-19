import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listCustomers, sendOtp, verifyOtp, generateNdc, generateRestructuring, generateMoratorium, generateTopUp, generateLoanAgreement } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Mail, PenTool } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agreements")({
  head: () => ({ meta: [{ title: "Agreements — Narainsons" }] }),
  component: AgreementsPage,
});

type AgreementType = "ndc" | "restructuring" | "moratorium" | "topup";

function AgreementsPage() {
  const [tab, setTab] = useState("emi");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [otpValue, setOtpValue] = useState("");

  const listFn = useServerFn(listCustomers);
  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const genNdc = useServerFn(generateNdc);
  const genRe = useServerFn(generateRestructuring);
  const genMora = useServerFn(generateMoratorium);
  const genTop = useServerFn(generateTopUp);
  const genLoan = useServerFn(generateLoanAgreement);

  const { data: customers, isLoading, refetch } = useQuery({ queryKey: ["customers"], queryFn: () => listFn() });

  const sendOtpMutation = useMutation({
    mutationFn: (v: { customerId: number; email: string; agreementType: string }) => sendOtpFn({ data: v }),
    onSuccess: (r, v) => {
      setSelectedId(v.customerId);
      toast.success(`OTP sent to ${v.email}`, {
        description: r.otp ? `Admin copy: ${r.otp}` : undefined,
        duration: 15000,
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send OTP"),
  });

  const openDoc = (html: string) => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const generateFor = (type: AgreementType, customerId: number, otp: string) =>
    type === "ndc" ? genNdc({ data: { customerId } })
    : type === "restructuring" ? genRe({ data: { customerId, otp } })
    : type === "moratorium" ? genMora({ data: { customerId, otp } })
    : genTop({ data: { customerId, otp } });

  const handleVerify = async (type: AgreementType) => {
    if (!selectedId || !otpValue) return toast.error("Enter OTP");
    try {
      await verifyOtpFn({ data: { customerId: selectedId, otp: otpValue } });
      const result = await generateFor(type, selectedId, otpValue);
      openDoc(result.html);
      toast.success("Verified — agreement ready");
      setSelectedId(null); setOtpValue("");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    }
  };

  const handleView = async (type: AgreementType, customerId: number, verifiedOtp: string) => {
    try {
      const result = await generateFor(type, customerId, verifiedOtp);
      openDoc(result.html);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open agreement");
    }
  };

  const filter = (type: string) => (customers ?? []).filter(c =>
    type === "emi" ? c.status === "EMI" || c.status === "Restructuring"
    : type === "mora" ? c.status === "Moratorium"
    : type === "topup" ? c.status === "TopUp" || c.status === "Top-Up" || c.status === "Top Up"
    : c.status === "Closed"
  );

  const agreementFor = (type: string): AgreementType =>
    type === "emi" ? "restructuring"
    : type === "mora" ? "moratorium"
    : type === "topup" ? "topup"
    : "ndc";

  const renderRows = (type: string) => {
    const list = filter(type);
    if (list.length === 0) return <div className="text-center py-12 text-muted-foreground">No customers in this category</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-navy-mid/70 text-accent">
            <tr>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c, idx) => (
              <tr key={c.id} className="table-row-anim border-b border-border/50 hover:bg-secondary/40 transition" style={{ animationDelay: `${idx * 40}ms` }}>
                <td className="px-6 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground font-mono">{c.oldAccountNumber}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{c.email}</td>
                <td className="px-6 py-3 text-sm">₹{c.pendingAmount || "-"}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.otpVerified === 1 && c.verifiedOtp ? (
                      <Button size="sm" className="btn-gold" onClick={() => handleView(agreementFor(type), c.id, c.verifiedOtp!)}>
                        <FileText className="w-3.5 h-3.5 mr-1" /> View Agreement
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" disabled={sendOtpMutation.isPending} onClick={() => sendOtpMutation.mutate({ customerId: c.id, email: c.email, agreementType: agreementFor(type) })}>
                      <Mail className="w-3.5 h-3.5" /> {c.otpVerified === 1 ? "Re-verify" : "Send OTP"}
                    </Button>
                    {selectedId === c.id && (
                      <>
                        <Input value={otpValue} onChange={e => setOtpValue(e.target.value)} placeholder="OTP" maxLength={6} className="w-24 h-8" />
                        <Button size="sm" className="btn-gold" onClick={() => handleVerify(agreementFor(type))}>
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="text-foreground">
      <div className="hero-panel">
        <div className="container-lg py-10">
          <h1 className="text-3xl font-bold text-white anim-slide-up">Digital Agreements</h1>
          <p className="text-blue-100/80 mt-2 anim-slide-up" style={{ animationDelay: "80ms" }}>Manage EMI, Moratorium, Top-Up, Loan, and NDC agreements with OTP-signed workflows</p>
        </div>
      </div>
      <div className="container-lg py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 mb-6 glass-panel p-1 rounded-lg">
            <TabsTrigger value="emi" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md">EMI &amp; Restructuring</TabsTrigger>
            <TabsTrigger value="mora" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md">Moratorium</TabsTrigger>
            <TabsTrigger value="topup" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md">Top-Up</TabsTrigger>
            <TabsTrigger value="loan" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md">Loan Agreement</TabsTrigger>
            <TabsTrigger value="ndc" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md">Closed / NDC</TabsTrigger>
          </TabsList>
          {(["emi", "mora", "topup", "ndc"] as const).map(v => (
            <TabsContent key={v} value={v}>
              <Card className="glass-panel overflow-hidden">
                {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div> : renderRows(v)}
              </Card>
            </TabsContent>
          ))}
          <TabsContent value="loan">
            <LoanAgreementPanel
              customers={customers ?? []}
              isLoading={isLoading}
              onGenerate={async (input) => {
                try {
                  const r = await genLoan({ data: input });
                  openDoc(r.html);
                  toast.success("Loan Agreement generated");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to generate");
                }
              }}
            />
          </TabsContent>
        </Tabs>

        <Card className="glass-panel p-6 mt-8 anim-slide-up">
          <h3 className="text-lg font-semibold text-accent mb-3">How Digital Signing Works</h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><strong>NDC / EMI / Moratorium / Top-Up:</strong> Click "Send OTP" — a 6-digit code is emailed to the customer from agreements.narainsons@gmail.com and shown to admin in a toast.</li>
            <li>Enter the OTP shared back by the customer and click the document icon — the signed agreement opens with auto date &amp; time.</li>
            <li><strong>Loan Agreement:</strong> No OTP required. Fill in loan account number, amount, processing fee, agreement date, and your own signing date &amp; time — everything is editable.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

type LoanCustomer = { id: number; name: string; email: string; oldAccountNumber: string; newAccountNumber: string | null; pan: string | null; address: string | null; pendingAmount: string | null };

function pad(n: number) { return n.toString().padStart(2, "0"); }
function todayIST() {
  const now = new Date();
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(now);
  const g = (t: string) => p.find(x => x.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")}`;
}
function nowISTTime() {
  const now = new Date();
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(now);
  const g = (t: string) => p.find(x => x.type === t)?.value ?? "00";
  return `${g("hour")}:${g("minute")}:${g("second")}`;
}

function LoanAgreementPanel({ customers, isLoading, onGenerate }: {
  customers: LoanCustomer[];
  isLoading: boolean;
  onGenerate: (v: {
    customerId: number; loanAccountNumber: string; amountPayable: string;
    agreementDate: string; processingFee: string; signedDate: string; signedTime: string;
    tenureDays?: string; purpose?: string; interestRate?: string; financeCharge?: string; disbursedAmount?: string;
  }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState<string>("");
  const selected = useMemo(() => customers.find(c => c.id === Number(customerId)), [customers, customerId]);

  const [loanAcc, setLoanAcc] = useState("");
  const [amount, setAmount] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [agreementDate, setAgreementDate] = useState(todayIST());
  const [signedDate, setSignedDate] = useState(todayIST());
  const [signedTime, setSignedTime] = useState(nowISTTime());
  const [tenureDays, setTenureDays] = useState("7");
  const [interestRate, setInterestRate] = useState("4");
  const [financeCharge, setFinanceCharge] = useState("");
  const [disbursed, setDisbursed] = useState("");
  const [purpose, setPurpose] = useState("Personal Expense");
  const [busy, setBusy] = useState(false);

  const applyCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find(x => x.id === Number(id));
    if (c) {
      setLoanAcc(c.newAccountNumber || c.oldAccountNumber || "");
      setAmount(c.pendingAmount || "");
    }
  };

  const submit = async () => {
    if (!selected) return toast.error("Select a customer");
    if (!loanAcc || !amount || !processingFee || !agreementDate || !signedDate || !signedTime) {
      return toast.error("Fill all required fields");
    }
    setBusy(true);
    try {
      await onGenerate({
        customerId: selected.id,
        loanAccountNumber: loanAcc,
        amountPayable: amount,
        processingFee, agreementDate, signedDate, signedTime,
        tenureDays, purpose, interestRate,
        financeCharge: financeCharge || "-",
        disbursedAmount: disbursed || "-",
      });
    } finally { setBusy(false); }
  };

  return (
    <Card className="glass-panel p-6 anim-slide-up">
      <div className="flex items-center gap-2 mb-5">
        <PenTool className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-accent">Loan Agreement — Custom Digital Signing</h3>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Customer</Label>
            <Select value={customerId} onValueChange={applyCustomer}>
              <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.oldAccountNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field label="Loan Account Number *"><Input value={loanAcc} onChange={e => setLoanAcc(e.target.value)} placeholder="L102 012178027731276003049472" /></Field>
          <Field label="Amount Payable (INR) *"><Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="3500.00" /></Field>
          <Field label="Processing Fee (INR) *"><Input value={processingFee} onChange={e => setProcessingFee(e.target.value)} placeholder="500.00" /></Field>
          <Field label="Agreement Date *"><Input value={agreementDate} onChange={e => setAgreementDate(e.target.value)} placeholder="DD/MM/YYYY" /></Field>
          <Field label="Digitally Signed — Date *"><Input value={signedDate} onChange={e => setSignedDate(e.target.value)} placeholder="DD/MM/YYYY" /></Field>
          <Field label="Digitally Signed — Time *"><Input value={signedTime} onChange={e => setSignedTime(e.target.value)} placeholder="HH:MM:SS" /></Field>
          <Field label="Tenure (Days)"><Input value={tenureDays} onChange={e => setTenureDays(e.target.value)} placeholder="7" /></Field>
          <Field label="Interest Rate (% per month)"><Input value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="4" /></Field>
          <Field label="Finance Charge (INR)"><Input value={financeCharge} onChange={e => setFinanceCharge(e.target.value)} placeholder="826" /></Field>
          <Field label="Disbursed Amount (INR)"><Input value={disbursed} onChange={e => setDisbursed(e.target.value)} placeholder="2674" /></Field>
          <Field label="Purpose"><Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Personal Expense" /></Field>

          <div className="md:col-span-2 flex justify-end pt-2">
            <Button className="btn-gold" onClick={submit} disabled={busy || !selected}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate Loan Agreement
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateNdcHtml,
  generateRestructuringHtml,
  generateMoratoriumHtml,
  generateTopUpHtml,
  generateLoanAgreementHtml,
  type CustomerDoc,
} from "./documents";

const CustomerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  oldAccountNumber: z.string().min(1),
  newAccountNumber: z.string().optional().nullable(),
  status: z.string().min(1),
  appName: z.string().optional().nullable(),
  pendingAmount: z.string().optional().nullable(),
  emiAmount: z.string().optional().nullable(),
  tenure: z.string().optional().nullable(),
  nextEmiDate: z.string().optional().nullable(),
  moratiumStartDate: z.string().optional().nullable(),
  moratiumEndDate: z.string().optional().nullable(),
});

type DbRow = Record<string, unknown> & {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  pan: string | null;
  address: string | null;
  old_account_number: string;
  new_account_number: string | null;
  status: string;
  app_name: string | null;
  pending_amount: string | null;
  emi_amount: string | null;
  tenure: string | null;
  next_emi_date: string | null;
  moratium_start_date: string | null;
  moratium_end_date: string | null;
  serial_number: string | null;
  otp_verified: number;
  verified_otp: string | null;
  created_at: string;
  updated_at: string;
};

const mapRow = (r: DbRow) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  pan: r.pan,
  address: r.address,
  oldAccountNumber: r.old_account_number,
  newAccountNumber: r.new_account_number,
  status: r.status,
  appName: r.app_name,
  pendingAmount: r.pending_amount,
  emiAmount: r.emi_amount,
  tenure: r.tenure,
  nextEmiDate: r.next_emi_date,
  moratiumStartDate: r.moratium_start_date,
  moratiumEndDate: r.moratium_end_date,
  serialNumber: r.serial_number,
  otpVerified: r.otp_verified,
  verifiedOtp: r.verified_otp,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toDb = (data: z.infer<typeof CustomerInput>) => ({
  name: data.name,
  email: data.email,
  phone: data.phone ?? null,
  pan: data.pan ?? null,
  address: data.address ?? null,
  old_account_number: data.oldAccountNumber,
  new_account_number: data.newAccountNumber ?? null,
  status: data.status,
  app_name: data.appName ?? null,
  pending_amount: data.pendingAmount ?? null,
  emi_amount: data.emiAmount ?? null,
  tenure: data.tenure ?? null,
  next_emi_date: data.nextEmiDate ?? null,
  moratium_start_date: data.moratiumStartDate ?? null,
  moratium_end_date: data.moratiumEndDate ?? null,
});

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbRow[]).map(mapRow);
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CustomerInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").insert(toDb(data));
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.number() }).and(CustomerInput.partial()).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const dbData: Record<string, string | null> = {};
    const mapping: Record<string, string> = {
      name: "name", email: "email", phone: "phone", pan: "pan", address: "address",
      oldAccountNumber: "old_account_number", newAccountNumber: "new_account_number",
      status: "status", appName: "app_name", pendingAmount: "pending_amount",
      emiAmount: "emi_amount", tenure: "tenure", nextEmiDate: "next_emi_date",
      moratiumStartDate: "moratium_start_date", moratiumEndDate: "moratium_end_date",
    };
    for (const [k, v] of Object.entries(rest)) if (v !== undefined && mapping[k]) dbData[mapping[k]] = (v as string | null);
    const { error } = await (context.supabase.from("customers") as unknown as { update: (d: Record<string, unknown>) => { eq: (c: string, v: number) => Promise<{ error: { message: string } | null }> } }).update(dbData).eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const sendOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    customerId: z.number(),
    email: z.string().email(),
    agreementType: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cust, error: cErr } = await context.supabase
      .from("customers").select("*").eq("id", data.customerId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cust) throw new Error("Customer not found");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await context.supabase.from("otp_records").insert({
      customer_id: data.customerId, otp, agreement_type: data.agreementType,
      email: data.email, expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    let emailStatus: "sent" | "failed" = "sent";
    let emailError: string | null = null;
    try {
      const { sendOtpEmail } = await import("./mailer.server");
      await sendOtpEmail(data.email, otp, data.agreementType, (cust as { name: string }).name);
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
    }
    await context.supabase.from("email_logs").insert({
      customer_id: data.customerId, recipient_email: data.email, email_type: "OTP",
      subject: `OTP for ${data.agreementType}`, status: emailStatus,
    });
    if (emailStatus === "failed") throw new Error(`Failed to send email: ${emailError}`);
    return { success: true, otp };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.number(), otp: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rec } = await context.supabase
      .from("otp_records").select("*").eq("customer_id", data.customerId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rec || rec.otp !== data.otp) throw new Error("Invalid OTP");
    if (rec.expires_at && new Date() > new Date(rec.expires_at)) throw new Error("OTP expired");
    await context.supabase.from("otp_records").update({ verified: 1 }).eq("id", rec.id);
    await context.supabase.from("customers").update({ otp_verified: 1, verified_otp: data.otp }).eq("id", data.customerId);
    return { success: true };
  });

export const getSerialCounters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("serial_counters").select("*");
    if (error) throw new Error(error.message);
    const map = new Map((data ?? []).map((r: { counter_type: string; current_value: string }) => [r.counter_type, r.current_value]));
    return {
      ndc: map.get("NDC") ?? "-",
      restructuring: map.get("RESTRUCTURING") ?? "-",
      moratorium: map.get("MORATORIUM") ?? "-",
      topup: map.get("TOPUP") ?? "-",
    };
  });

export const updateSerialCounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    counterType: z.enum(["NDC", "RESTRUCTURING", "MORATORIUM", "TOPUP"]),
    newValue: z.string().min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("serial_counters")
      .update({ current_value: data.newValue }).eq("counter_type", data.counterType);
    if (error) throw new Error(error.message);
    return { success: true };
  });

async function loadCustomer(context: { supabase: unknown }, id: number): Promise<CustomerDoc> {
  const sb = context.supabase as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: number) => { maybeSingle: () => Promise<{ data: DbRow | null }> } } } };
  const { data } = await sb.from("customers").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Customer not found");
  return mapRow(data);
}

export const generateNdc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    const c = await loadCustomer(context, data.customerId);
    return { html: generateNdcHtml(c), success: true };
  });

export const generateRestructuring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.number(), otp: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const c = await loadCustomer(context, data.customerId);
    return { html: generateRestructuringHtml(c, data.otp), success: true };
  });

export const generateMoratorium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.number(), otp: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const c = await loadCustomer(context, data.customerId);
    return { html: generateMoratoriumHtml(c, data.otp), success: true };
  });

export const generateTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.number(), otp: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const c = await loadCustomer(context, data.customerId);
    return { html: generateTopUpHtml(c, data.otp), success: true };
  });

export const generateLoanAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    customerId: z.number(),
    loanAccountNumber: z.string().min(1).max(100),
    amountPayable: z.string().min(1).max(50),
    agreementDate: z.string().min(1).max(30),
    processingFee: z.string().min(1).max(50),
    signedDate: z.string().min(1).max(30),
    signedTime: z.string().min(1).max(30),
    tenureDays: z.string().optional(),
    purpose: z.string().optional(),
    interestRate: z.string().optional(),
    financeCharge: z.string().optional(),
    disbursedAmount: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const c = await loadCustomer(context, data.customerId);
    return { html: generateLoanAgreementHtml(c, data), success: true };
  });

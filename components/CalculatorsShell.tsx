"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Coins,
  Heart,
  Home,
  Receipt,
  Repeat,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type CalcId = "tax" | "loan" | "currency" | "bmi" | "tip" | "unit";

type ForexRate = { symbol: string; vnd: number };

const fmtVnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const fmtNumber = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function CalculatorsShell() {
  const { language } = useLanguage();
  const [active, setActive] = useState<CalcId>("tax");
  const [rates, setRates] = useState<ForexRate[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled || !json?.rows) return;
        const forex = (json.rows as Array<{ kind: string; symbol: string; vnd: number }>)
          .filter((r) => r.kind === "forex")
          .map((r) => ({ symbol: r.symbol, vnd: r.vnd }));
        setRates(forex);
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const calcs: ReadonlyArray<{ id: CalcId; icon: typeof Calculator; vi: string; en: string; hintVi: string; hintEn: string }> = [
    { id: "tax", icon: Receipt, vi: "Thuế TNCN", en: "Income tax", hintVi: "Gross ↔ Net 2026", hintEn: "Gross ↔ Net 2026" },
    { id: "loan", icon: Home, vi: "EMI vay", en: "Loan EMI", hintVi: "Nhà · xe · cá nhân", hintEn: "Home · car · personal" },
    { id: "currency", icon: Coins, vi: "Đổi tiền", en: "Currency", hintVi: "USD CNY TWD JPY → VND", hintEn: "USD CNY TWD JPY → VND" },
    { id: "bmi", icon: Heart, vi: "BMI", en: "BMI", hintVi: "Cân nặng · chiều cao", hintEn: "Weight · height" },
    { id: "tip", icon: Banknote, vi: "Tiền tip", en: "Tip split", hintVi: "Chia hoá đơn", hintEn: "Split a bill" },
    { id: "unit", icon: Repeat, vi: "Đổi đơn vị", en: "Unit convert", hintVi: "Length · weight · temp", hintEn: "Length · weight · temp" },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0707] text-[#f4e8df]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 14% 14%, rgba(239,68,68,0.22), transparent 32%), radial-gradient(circle at 84% 18%, rgba(214,165,72,0.1), transparent 28%), radial-gradient(circle at 50% 92%, rgba(167,139,250,0.06), transparent 32%), linear-gradient(180deg, #120808 0%, #060303 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239,68,68,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(244,234,220,0.035) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#3a1815] bg-[#100606]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={language === "vi" ? "Quay lại trang chủ" : "Back to home"}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 sm:text-2xl"
        >
          Mr<span className="text-[#ef4444]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
            <Calculator className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ff7b72]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Calculators</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#3a1815] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Máy tính tiện ích" : "Calculators"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "thuế · vay · bmi · đổi tiền" : "tax · loan · bmi · currency"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Máy tính nhanh dùng hàng ngày. Tỉ giá ngoại tệ lấy realtime từ Markets, tự cập nhật khi reload."
              : "Daily quick calculators. Forex rates pull realtime from Markets, updated on reload."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {calcs.map((calc) => {
            const Icon = calc.icon;
            const isActive = active === calc.id;
            return (
              <button
                key={calc.id}
                type="button"
                onClick={() => setActive(calc.id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                  isActive
                    ? "border-[#ef4444]/65 bg-[#2a0b08]/82 text-[#ffd7d3]"
                    : "border-[#3a1815] bg-[#100606]/70 text-[#ff7b72] hover:border-[#ef4444]/40 hover:text-[#ffe9e5]",
                )}
              >
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-md border",
                  isActive ? "border-[#ef4444]/65 bg-[#ef4444]/14" : "border-[#ef4444]/22 bg-[#ef4444]/8",
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.85rem] font-bold text-[#f4eadc]">{language === "vi" ? calc.vi : calc.en}</div>
                  <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">
                    {language === "vi" ? calc.hintVi : calc.hintEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {active === "tax" ? <TaxCalc language={language} /> : null}
          {active === "loan" ? <LoanCalc language={language} /> : null}
          {active === "currency" ? <CurrencyCalc language={language} rates={rates} /> : null}
          {active === "bmi" ? <BmiCalc language={language} /> : null}
          {active === "tip" ? <TipCalc language={language} /> : null}
          {active === "unit" ? <UnitCalc language={language} /> : null}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-[#3a1815] bg-[#100606]/72 p-4">
      <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#ff7b72]">
        <span className="size-1.5 rounded-full bg-[#ef4444]" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, step = 1 }: Readonly<{ label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number }>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-[#3a1815] bg-[#1a0606] px-3 py-2 focus-within:border-[#ef4444]/55">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent font-mono text-[1rem] text-[#f4eadc] outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix ? <span className="font-mono text-[0.7rem] text-[#5e574e]">{suffix}</span> : null}
      </div>
    </label>
  );
}

function ResultRow({ label, value, accent = false }: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
      accent ? "border-[#ef4444]/55 bg-[#ef4444]/12" : "border-[#3a1815] bg-[#1a0606]",
    )}>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{label}</span>
      <span className={cn("font-mono tabular-nums", accent ? "text-[1.1rem] font-bold text-[#ffe9e5]" : "text-[0.95rem] text-[#f4eadc]")}>{value}</span>
    </div>
  );
}

// === VN income tax 2026 — bậc thang theo Luật Thuế TNCN, giảm trừ bản thân 11M, người phụ thuộc 4.4M ===
const taxBrackets = [
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 10_000_000, rate: 0.10 },
  { upTo: 18_000_000, rate: 0.15 },
  { upTo: 32_000_000, rate: 0.20 },
  { upTo: 52_000_000, rate: 0.25 },
  { upTo: 80_000_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
];

const SELF_DEDUCTION = 11_000_000;
const DEPENDANT_DEDUCTION = 4_400_000;
const SOCIAL_INSURANCE_RATE = 0.105; // BHXH 8% + BHYT 1.5% + BHTN 1%

function applyTax(taxable: number): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of taxBrackets) {
    if (taxable <= bracket.upTo) {
      tax += (taxable - prev) * bracket.rate;
      return tax;
    }
    tax += (bracket.upTo - prev) * bracket.rate;
    prev = bracket.upTo;
  }
  return tax;
}

function TaxCalc({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [gross, setGross] = useState(30_000_000);
  const [dependants, setDependants] = useState(0);

  const result = useMemo(() => {
    const insurance = gross * SOCIAL_INSURANCE_RATE;
    const deduction = SELF_DEDUCTION + dependants * DEPENDANT_DEDUCTION;
    const taxable = Math.max(0, gross - insurance - deduction);
    const tax = applyTax(taxable);
    const net = gross - insurance - tax;
    return { insurance, deduction, taxable, tax, net };
  }, [gross, dependants]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Lương gross / tháng" : "Gross monthly"}>
        <div className="space-y-3">
          <NumberField label={language === "vi" ? "Lương gross" : "Gross salary"} value={gross} onChange={setGross} suffix="VND" step={1_000_000} />
          <NumberField label={language === "vi" ? "Người phụ thuộc" : "Dependants"} value={dependants} onChange={(v) => setDependants(Math.max(0, Math.floor(v)))} suffix={language === "vi" ? "người" : "people"} />
          <p className="text-[0.72rem] leading-5 text-[#a79d91]">
            {language === "vi"
              ? "Bảo hiểm bắt buộc 10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%). Giảm trừ bản thân 11M, người phụ thuộc 4.4M/người."
              : "Mandatory insurance 10.5%. Self deduction 11M, dependant 4.4M each."}
          </p>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Kết quả" : "Result"}>
        <div className="space-y-2">
          <ResultRow label={language === "vi" ? "Bảo hiểm 10.5%" : "Insurance 10.5%"} value={fmtVnd.format(result.insurance)} />
          <ResultRow label={language === "vi" ? "Tổng giảm trừ" : "Total deductions"} value={fmtVnd.format(result.deduction)} />
          <ResultRow label={language === "vi" ? "Thu nhập chịu thuế" : "Taxable income"} value={fmtVnd.format(result.taxable)} />
          <ResultRow label={language === "vi" ? "Thuế TNCN" : "Income tax"} value={fmtVnd.format(result.tax)} />
          <ResultRow label={language === "vi" ? "Lương thực nhận" : "Net take home"} value={fmtVnd.format(result.net)} accent />
        </div>
      </Panel>
    </div>
  );
}

function LoanCalc({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [principal, setPrincipal] = useState(2_000_000_000);
  const [annualRate, setAnnualRate] = useState(9.5);
  const [years, setYears] = useState(20);

  const result = useMemo(() => {
    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate <= 0 || months <= 0 || principal <= 0) {
      return { emi: 0, totalInterest: 0, totalPaid: 0 };
    }
    const factor = Math.pow(1 + monthlyRate, months);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    const totalPaid = emi * months;
    return { emi, totalPaid, totalInterest: totalPaid - principal };
  }, [principal, annualRate, years]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Khoản vay" : "Loan"}>
        <div className="space-y-3">
          <NumberField label={language === "vi" ? "Số tiền vay" : "Principal"} value={principal} onChange={setPrincipal} suffix="VND" step={50_000_000} />
          <NumberField label={language === "vi" ? "Lãi suất / năm" : "Annual rate"} value={annualRate} onChange={setAnnualRate} suffix="%" step={0.1} />
          <NumberField label={language === "vi" ? "Thời hạn" : "Term"} value={years} onChange={setYears} suffix={language === "vi" ? "năm" : "years"} step={1} />
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Trả góp đều" : "EMI plan"}>
        <div className="space-y-2">
          <ResultRow label={language === "vi" ? "Trả mỗi tháng" : "Monthly payment"} value={fmtVnd.format(result.emi)} accent />
          <ResultRow label={language === "vi" ? "Tổng trả" : "Total paid"} value={fmtVnd.format(result.totalPaid)} />
          <ResultRow label={language === "vi" ? "Tổng lãi" : "Total interest"} value={fmtVnd.format(result.totalInterest)} />
          <ResultRow label={language === "vi" ? "Số kỳ" : "Periods"} value={`${years * 12}`} />
        </div>
      </Panel>
    </div>
  );
}

function CurrencyCalc({ language, rates }: Readonly<{ language: "vi" | "en"; rates: ForexRate[] }>) {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("VND");

  const all = useMemo(() => {
    const map = new Map<string, number>();
    map.set("VND", 1);
    for (const r of rates) map.set(r.symbol, r.vnd);
    return map;
  }, [rates]);

  const symbols = useMemo(() => Array.from(all.keys()), [all]);
  const fromVnd = all.get(from) ?? 0;
  const toVnd = all.get(to) ?? 0;
  const result = fromVnd > 0 && toVnd > 0 ? (amount * fromVnd) / toVnd : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đổi tiền" : "Convert"}>
        <div className="space-y-3">
          <NumberField label={language === "vi" ? "Số tiền" : "Amount"} value={amount} onChange={setAmount} step={1} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{language === "vi" ? "Từ" : "From"}</span>
              <select
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-md border border-[#3a1815] bg-[#1a0606] px-3 py-2 font-mono text-[0.95rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/55"
              >
                {symbols.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{language === "vi" ? "Sang" : "To"}</span>
              <select
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-md border border-[#3a1815] bg-[#1a0606] px-3 py-2 font-mono text-[0.95rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/55"
              >
                {symbols.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[0.7rem] text-[#a79d91]">
            {language === "vi"
              ? "Tỉ giá lấy realtime từ /api/markets — USD/VND, CNY/VND, TWD/VND, JPY/VND."
              : "Rates pulled realtime from /api/markets — USD, CNY, TWD, JPY against VND."}
          </p>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Kết quả" : "Result"}>
        {symbols.length <= 1 ? (
          <p className="text-[0.78rem] text-[#a79d91]">
            {language === "vi" ? "Đang tải tỉ giá từ Markets..." : "Loading rates from Markets..."}
          </p>
        ) : (
          <div className="space-y-2">
            <ResultRow label={`${amount} ${from}`} value={`${fmtNumber.format(result)} ${to}`} accent />
            {fromVnd > 0 ? <ResultRow label={`1 ${from}`} value={`${fmtVnd.format(fromVnd)}`} /> : null}
            {toVnd > 0 ? <ResultRow label={`1 ${to}`} value={`${fmtVnd.format(toVnd)}`} /> : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

function BmiCalc({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [weight, setWeight] = useState(65);
  const [height, setHeight] = useState(170);

  const result = useMemo(() => {
    if (height <= 0 || weight <= 0) return null;
    const m = height / 100;
    const bmi = weight / (m * m);
    let cat = "";
    let tone: "ok" | "warn" | "bad" = "ok";
    if (bmi < 18.5) { cat = language === "vi" ? "Thiếu cân" : "Underweight"; tone = "warn"; }
    else if (bmi < 25) { cat = language === "vi" ? "Bình thường" : "Normal"; tone = "ok"; }
    else if (bmi < 30) { cat = language === "vi" ? "Thừa cân" : "Overweight"; tone = "warn"; }
    else { cat = language === "vi" ? "Béo phì" : "Obese"; tone = "bad"; }
    return { bmi, cat, tone };
  }, [weight, height, language]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Số đo" : "Measurements"}>
        <div className="space-y-3">
          <NumberField label={language === "vi" ? "Cân nặng" : "Weight"} value={weight} onChange={setWeight} suffix="kg" step={0.5} />
          <NumberField label={language === "vi" ? "Chiều cao" : "Height"} value={height} onChange={setHeight} suffix="cm" step={1} />
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Chỉ số BMI" : "BMI"}>
        {result ? (
          <div className="space-y-2">
            <ResultRow label="BMI" value={fmtNumber.format(result.bmi)} accent />
            <ResultRow label={language === "vi" ? "Phân loại" : "Category"} value={result.cat} />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function TipCalc({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [bill, setBill] = useState(500_000);
  const [tipPct, setTipPct] = useState(10);
  const [people, setPeople] = useState(4);

  const tip = (bill * tipPct) / 100;
  const total = bill + tip;
  const perPerson = people > 0 ? total / people : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Hoá đơn" : "Bill"}>
        <div className="space-y-3">
          <NumberField label={language === "vi" ? "Tổng hoá đơn" : "Bill total"} value={bill} onChange={setBill} suffix="VND" step={10_000} />
          <NumberField label={language === "vi" ? "Tip" : "Tip"} value={tipPct} onChange={setTipPct} suffix="%" step={1} />
          <NumberField label={language === "vi" ? "Số người" : "People"} value={people} onChange={(v) => setPeople(Math.max(1, Math.floor(v)))} step={1} />
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Chia bill" : "Split"}>
        <div className="space-y-2">
          <ResultRow label="Tip" value={fmtVnd.format(tip)} />
          <ResultRow label={language === "vi" ? "Tổng cộng" : "Total"} value={fmtVnd.format(total)} />
          <ResultRow label={language === "vi" ? "Mỗi người" : "Per person"} value={fmtVnd.format(perPerson)} accent />
        </div>
      </Panel>
    </div>
  );
}

const unitGroups = {
  length: { base: "m", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 } },
  weight: { base: "kg", units: { g: 0.001, kg: 1, lb: 0.4535924, oz: 0.0283495 } },
  volume: { base: "L", units: { ml: 0.001, L: 1, gal: 3.78541 } },
} as const;

type UnitGroup = keyof typeof unitGroups;

function UnitCalc({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [group, setGroup] = useState<UnitGroup | "temperature">("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [value, setValue] = useState(1);

  useEffect(() => {
    if (group === "temperature") {
      setFrom("C"); setTo("F"); return;
    }
    const keys = Object.keys(unitGroups[group].units);
    setFrom(keys[0]); setTo(keys[1] ?? keys[0]);
  }, [group]);

  const result = useMemo(() => {
    if (group === "temperature") {
      let celsius = value;
      if (from === "F") celsius = (value - 32) * (5 / 9);
      else if (from === "K") celsius = value - 273.15;
      let out = celsius;
      if (to === "F") out = celsius * (9 / 5) + 32;
      else if (to === "K") out = celsius + 273.15;
      return out;
    }
    const units = unitGroups[group].units as Record<string, number>;
    const factorFrom = units[from];
    const factorTo = units[to];
    if (!factorFrom || !factorTo) return 0;
    return (value * factorFrom) / factorTo;
  }, [group, from, to, value]);

  const groupOptions: ReadonlyArray<{ id: UnitGroup | "temperature"; vi: string; en: string }> = [
    { id: "length", vi: "Độ dài", en: "Length" },
    { id: "weight", vi: "Khối lượng", en: "Weight" },
    { id: "volume", vi: "Thể tích", en: "Volume" },
    { id: "temperature", vi: "Nhiệt độ", en: "Temperature" },
  ];

  const unitOptions = group === "temperature" ? ["C", "F", "K"] : Object.keys(unitGroups[group].units);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đơn vị" : "Units"}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {groupOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGroup(opt.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                  group === opt.id
                    ? "border-[#ef4444]/65 bg-[#ef4444]/14 text-[#ffd7d3]"
                    : "border-white/8 bg-white/[0.03] text-[#a79d91] hover:border-[#ef4444]/30",
                )}
              >
                {language === "vi" ? opt.vi : opt.en}
              </button>
            ))}
          </div>
          <NumberField label={language === "vi" ? "Số lượng" : "Value"} value={value} onChange={setValue} step={0.1} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{language === "vi" ? "Từ" : "From"}</span>
              <select
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-md border border-[#3a1815] bg-[#1a0606] px-3 py-2 font-mono text-[0.95rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/55"
              >
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#ff7b72]">{language === "vi" ? "Sang" : "To"}</span>
              <select
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-md border border-[#3a1815] bg-[#1a0606] px-3 py-2 font-mono text-[0.95rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/55"
              >
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Kết quả" : "Result"}>
        <ResultRow label={`${value} ${from}`} value={`${fmtNumber.format(result)} ${to}`} accent />
      </Panel>
    </div>
  );
}

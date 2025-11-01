// app/admin/printable-income/PrintableIncomeClient.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";

type Period = "all" | "daily" | "weekly" | "monthly";

type PaymentRow = {
  id: string;
  created_at: string;
  amount: number;
  reference: string | null;
  user_id: string | null;
  status: string | null;
  user_email: string; // fallback
  user_name?: string | null; // from profiles
};

export default function PrintableIncomeClient({
  initialRows,
  errorMsg,
}: {
  initialRows: PaymentRow[];
  errorMsg?: string;
}) {
  const [period, setPeriod] = useState<Period>("all");

  // for weekly dropdown (1..5)
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // for monthly dropdown (0 = Jan)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  const [rows, setRows] = useState<PaymentRow[]>(initialRows);
  const [loading, setLoading] = useState(false);

  // fixed timestamp for this render
  const generatedAtIso = useMemo(() => new Date().toISOString(), []);

  // helper: what week of current month is this date?
  function getWeekOfCurrentMonth(d: Date, base: Date) {
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
    const dayOfMonth = d.getDate();
    const offset = dayOfMonth + (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); // make Monday-ish
    return Math.floor((offset - 1) / 7) + 1; // 1..5
  }

  const filteredRows = useMemo(() => {
    const baseNow = new Date();
    if (period === "all") return rows;

    if (period === "daily") {
      return rows.filter((r) => {
        const d = new Date(r.created_at);
        return (
          d.getFullYear() === baseNow.getFullYear() &&
          d.getMonth() === baseNow.getMonth() &&
          d.getDate() === baseNow.getDate()
        );
      });
    }

    if (period === "weekly") {
      return rows.filter((r) => {
        const d = new Date(r.created_at);
        // same month + same year + same week number
        if (
          d.getFullYear() !== baseNow.getFullYear() ||
          d.getMonth() !== baseNow.getMonth()
        ) {
          return false;
        }
        const wk = getWeekOfCurrentMonth(d, baseNow);
        return wk === selectedWeek;
      });
    }

    if (period === "monthly") {
      return rows.filter((r) => {
        const d = new Date(r.created_at);
        return (
          d.getFullYear() === baseNow.getFullYear() &&
          d.getMonth() === selectedMonth
        );
      });
    }

    return rows;
  }, [rows, period, selectedWeek, selectedMonth]);

  const totals = useMemo(() => {
    let amount = 0;
    let credits = 0;
    for (const r of filteredRows) {
      const amt = Number(r.amount || 0);
      amount += amt;
      credits += Math.min(Math.max(0, Math.floor(amt / 20)), 5);
    }
    return { amount, credits, count: filteredRows.length };
  }, [filteredRows]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatPrintDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const periodLabel =
    period === "all"
      ? "All records"
      : period === "daily"
      ? "Daily"
      : period === "weekly"
      ? `Week ${selectedWeek} of ${monthNames[now.getMonth()]}`
      : `${monthNames[selectedMonth]} ${now.getFullYear()}`;

  function handlePrint() {
    window.print();
  }

  function handleReload() {
    setLoading(true);
    setRows(initialRows);
    setTimeout(() => setLoading(false), 150);
  }

  return (
    <div className="p-8 space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report,
          .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            inset: 0;
            margin: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 16mm 14mm 16mm 14mm;
          }
        }
      `}</style>

      <div className="printable-report bg-white p-6 rounded-lg shadow-md border mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="flex items-start justify-between mb-8 gap-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              PawPortal — Ethical Pet Adoption Bridge
            </p>
            <h1 className="text-2xl font-bold mt-1">PawPortal Income Report</h1>
            <p className="text-sm text-gray-500">Approved Payments Summary</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-medium text-gray-700">Report</p>
            <p>{periodLabel}</p>
            <p className="mt-2 text-xs">
              Generated: {formatPrintDate(generatedAtIso)}
            </p>
          </div>
        </div>

        {/* FILTERS (screen only) */}
        <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
          <div className="flex gap-2">
            {(["all", "daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm capitalize ${
                  period === p
                    ? "bg-black text-white shadow"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* extra dropdowns */}
          {period === "weekly" ? (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value={1}>Week 1</option>
              <option value={2}>Week 2</option>
              <option value={3}>Week 3</option>
              <option value={4}>Week 4</option>
              <option value={5}>Week 5</option>
            </select>
          ) : null}

          {period === "monthly" ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>
                  {m} {now.getFullYear()}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4 text-center bg-gray-50/40">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Records
            </p>
            <p className="text-2xl font-semibold mt-1">{totals.count}</p>
          </div>
          <div className="border rounded-lg p-4 text-center bg-gray-50/40">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Amount
            </p>
            <p className="text-2xl font-semibold mt-1">
              ₱
              {totals.amount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="border rounded-lg p-4 text-center bg-gray-50/40">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Credits
            </p>
            <p className="text-2xl font-semibold mt-1">{totals.credits}</p>
          </div>
        </div>

        {errorMsg ? (
          <p className="text-sm text-red-500 text-center mb-4">{errorMsg}</p>
        ) : null}

        {/* TABLE */}
        <div className="overflow-hidden border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left w-40">Date</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left w-44">Reference #</th>
                <th className="px-4 py-2 text-right w-28">Amount (₱)</th>
                <th className="px-4 py-2 text-right w-16">Credits</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center">
                    No approved payments found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const credits = Math.min(
                    Math.max(0, Math.floor((r.amount || 0) / 20)),
                    5
                  );
                  return (
                    <tr key={r.id} className="odd:bg-gray-50/60">
                      <td className="px-4 py-2 border-t align-top">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-2 border-t align-top">
                        {r.user_name && r.user_name.trim() !== ""
                          ? r.user_name
                          : r.user_email || "—"}
                      </td>
                      <td className="px-4 py-2 border-t align-top">
                        {r.reference ? r.reference : "—"}
                      </td>
                      <td className="px-4 py-2 border-t text-right align-top">
                        {r.amount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-2 border-t text-right align-top">
                        {credits}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="font-semibold bg-gray-100">
                <td className="px-4 py-2 border-t" colSpan={3}>
                  TOTAL
                </td>
                <td className="px-4 py-2 border-t text-right">
                  ₱
                  {totals.amount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-2 border-t text-right">
                  {totals.credits}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* FOOTER */}
        <p className="text-xs text-gray-400 mt-6">
          Prepared via PawPortal Admin • {formatPrintDate(generatedAtIso)}
        </p>

        {/* BUTTONS (screen only) */}
        <div className="flex justify-end gap-2 mt-6 no-print">
          <button
            onClick={handleReload}
            className="flex items-center gap-1 px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-black/90"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

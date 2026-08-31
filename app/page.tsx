"use client";

import { useCallback, useMemo, useState } from "react";
import type { FleetState, Finding, Remediation, Severity } from "@/lib/types";

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface ScanResponse {
  state: FleetState;
}

export default function Home() {
  const [state, setState] = useState<FleetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const runScan = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const json = (await res.json()) as ScanResponse;
      setState(json.state);
      setSelectedFinding(json.state.findings[0] ?? null);
    } finally {
      setBusy(false);
    }
  }, []);

  const decide = useCallback(
    async (remediationId: string, decision: "approve" | "deny" | "defer", humanReason?: string) => {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, remediationId, decision, humanReason }),
      });
      const json = (await res.json()) as ScanResponse;
      setState(json.state);
      setDenyReason("");
    },
    [state],
  );

  const summary = useMemo(() => summarize(state), [state]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Header onScan={runScan} busy={busy} hasScan={!!state} />

      {!state && <EmptyState onScan={runScan} busy={busy} />}

      {state && (
        <>
          <FleetOverview state={state} summary={summary} />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 panel p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Findings</h2>
              <FindingList
                findings={state.findings}
                remediations={state.remediations}
                selectedId={selectedFinding?.id ?? null}
                onSelect={setSelectedFinding}
              />
            </div>

            <div className="panel p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Remediation</h2>
              {selectedFinding ? (
                <RemediationPanel
                  finding={selectedFinding}
                  remediation={state.remediations.find((r) => r.findingId === selectedFinding.id) ?? null}
                  denyReason={denyReason}
                  setDenyReason={setDenyReason}
                  onDecide={decide}
                />
              ) : (
                <p className="text-sm text-muted">Select a finding on the left.</p>
              )}
            </div>
          </div>

          <div className="mt-8 panel p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Audit Log (Cloud Logging)</h2>
            <AuditLog entries={state.auditLog} />
          </div>
        </>
      )}

      <footer className="mt-12 text-center text-xs text-muted">
        FleetOps AI · Built for the All Things Agentic Hackathon · Track: The Fortified Enterprise Fleet
      </footer>
    </main>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

function Header({ onScan, busy, hasScan }: { onScan: () => void; busy: boolean; hasScan: boolean }) {
  return (
    <header className="flex flex-col gap-2 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-gblue px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-white">
            Google ADK
          </span>
          <span className="text-xs text-muted">Fortified Enterprise Fleet</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">FleetOps AI</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A 3-agent Google ADK fleet — Scanner, Policy, and Remediation — that autonomously audits your Google
          Cloud org for cost waste, security drift, and compliance violations, then waits for your tap before
          fixing anything.
        </p>
      </div>
      <button
        onClick={onScan}
        disabled={busy}
        className="self-start rounded-lg bg-gblue px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50 md:self-end"
      >
        {busy ? "Scanning…" : hasScan ? "Re-run scan" : "Run new scan"}
      </button>
    </header>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onScan, busy }: { onScan: () => void; busy: boolean }) {
  return (
    <div className="panel mt-10 p-10 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gblue/20 text-2xl">
        🛰️
      </div>
      <h2 className="text-lg font-semibold text-white">No scan yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Click <em>Run new scan</em> to have ScannerAgent inventory the configured Google Cloud scope,
        PolicyAgent evaluate supported assets against SOC2 / HIPAA / GDPR / CIS / cost rules, and
        RemediationAgent draft approval-gated gcloud fixes for you to triage.
      </p>
      <button
        onClick={onScan}
        disabled={busy}
        className="mt-6 rounded-lg bg-gblue px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
      >
        {busy ? "Scanning…" : "Run new scan"}
      </button>
    </div>
  );
}

// ─── Fleet overview ────────────────────────────────────────────────────────────

function FleetOverview({
  state,
  summary,
}: {
  state: FleetState;
  summary: ReturnType<typeof summarize>;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        color="bg-gblue"
        label="ScannerAgent · Taskmaster"
        value={state.agentStatus.scanner}
        detail={`${state.snapshot?.source === "cloud-asset" ? "live Cloud Asset Inventory" : "bundled snapshot"} · ${state.snapshot?.projectIds.length ?? 0} project(s)`}
      />
      <StatCard
        color="bg-gred"
        label="PolicyAgent · Fortified Fleet"
        value={state.agentStatus.policy}
        detail={`${summary.criticalCount} critical / ${summary.highCount} high`}
      />
      <StatCard
        color="bg-ggreen"
        label="RemediationAgent · Collab Partner"
        value={state.agentStatus.remediation}
        detail={`potential save: $${summary.monthlySavings.toLocaleString()}/mo`}
      />
      <StatCard
        color="bg-gyellow"
        label="Audit trail"
        value={`${state.auditLog.length} events`}
        detail="all writes require human approval"
      />
    </section>
  );
}

function StatCard({
  color,
  label,
  value,
  detail,
}: {
  color: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
        <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}

// ─── Findings list ─────────────────────────────────────────────────────────────

function FindingList({
  findings,
  remediations,
  selectedId,
  onSelect,
}: {
  findings: Finding[];
  remediations: Remediation[];
  selectedId: string | null;
  onSelect: (f: Finding) => void;
}) {
  if (findings.length === 0) {
    return <p className="text-sm text-muted">No findings — your org is clean. 🎉</p>;
  }
  const sorted = [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return b.riskScore - a.riskScore;
  });
  const remByFinding = new Map(remediations.map((r) => [r.findingId, r]));
  return (
    <ul className="divide-y divide-white/5">
      {sorted.map((f) => {
        const rem = remByFinding.get(f.id);
        const isSelected = f.id === selectedId;
        return (
          <li key={f.id}>
            <button
              onClick={() => onSelect(f)}
              className={`flex w-full flex-col gap-1 py-3 text-left transition ${
                isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
              } rounded-md px-2`}
            >
              <div className="flex items-center gap-2">
                <SeverityChip severity={f.severity} />
                <span className="font-medium text-white">{f.title}</span>
                {rem && rem.status !== "pending" && <StatusChip status={rem.status} />}
              </div>
              <div className="text-xs text-muted">
                risk {f.riskScore} · {f.citations.map((c) => `${c.domain} ${c.clause}`).join(" · ")}
                {f.monthlyImpactUsd ? ` · $${f.monthlyImpactUsd.toLocaleString()}/mo` : ""}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Remediation panel ─────────────────────────────────────────────────────────

function RemediationPanel({
  finding,
  remediation,
  denyReason,
  setDenyReason,
  onDecide,
}: {
  finding: Finding;
  remediation: Remediation | null;
  denyReason: string;
  setDenyReason: (s: string) => void;
  onDecide: (id: string, decision: "approve" | "deny" | "defer", humanReason?: string) => void;
}) {
  if (!remediation) return <p className="text-sm text-muted">No remediation drafted for this finding.</p>;
  const pending = remediation.status === "pending";
  return (
    <div className="space-y-4">
      <div>
        <SeverityChip severity={finding.severity} />
        <h3 className="mt-2 text-sm font-semibold text-white">{finding.title}</h3>
        <p className="mt-1 text-xs text-muted">{finding.explanation}</p>
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Drafted gcloud</div>
        <pre className="mt-1 overflow-x-auto rounded-md bg-black/50 p-3 font-mono text-xs text-emerald-200">
          {remediation.gcloudCommand}
        </pre>
        <p className="mt-2 text-xs text-muted">{remediation.explanation}</p>
      </div>

      {pending ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onDecide(remediation.id, "approve")}
              className="flex-1 rounded-md bg-ggreen px-3 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              ✓ Approve · Execute
            </button>
            <button
              onClick={() => onDecide(remediation.id, "defer", denyReason || "will revisit next week")}
              className="rounded-md bg-purple-500/70 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500"
            >
              Defer
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Reason for deny/defer (required for audit)"
              className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white placeholder-muted"
            />
            <button
              onClick={() => denyReason && onDecide(remediation.id, "deny", denyReason)}
              disabled={!denyReason}
              className="rounded-md bg-gred/70 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
            >
              Deny
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-white/[0.03] p-3 text-xs">
          <div className="mb-1">
            Status: <StatusChip status={remediation.status} />
          </div>
          {remediation.humanReason && <div className="text-muted">Reason: {remediation.humanReason}</div>}
          {remediation.auditLogId && <div className="text-muted">Audit id: {remediation.auditLogId}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Audit log ─────────────────────────────────────────────────────────────────

function AuditLog({ entries }: { entries: FleetState["auditLog"] }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-md bg-black/40 p-3 font-mono text-xs leading-6 text-slate-200">
      {entries.map((e) => (
        <div key={e.id} className="grid grid-cols-[110px_140px_1fr] gap-3">
          <span className="text-slate-500">{e.at.replace("T", " ").replace(/\..+/, "")}</span>
          <span className={outcomeColor(e.outcome)}>[{e.actor}]</span>
          <span>{e.action}</span>
        </div>
      ))}
    </div>
  );
}

function outcomeColor(o: "success" | "failure" | "info"): string {
  return o === "success" ? "text-emerald-300" : o === "failure" ? "text-red-300" : "text-sky-300";
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: Severity }) {
  return <span className={`chip chip-${severity}`}>{severity.toUpperCase()}</span>;
}

function StatusChip({ status }: { status: Remediation["status"] }) {
  const label = status;
  return <span className={`chip chip-${status}`}>{label}</span>;
}

function summarize(state: FleetState | null): {
  criticalCount: number;
  highCount: number;
  monthlySavings: number;
} {
  if (!state) return { criticalCount: 0, highCount: 0, monthlySavings: 0 };
  return {
    criticalCount: state.findings.filter((f) => f.severity === "critical").length,
    highCount: state.findings.filter((f) => f.severity === "high").length,
    monthlySavings: state.findings.reduce((sum, f) => sum + (f.monthlyImpactUsd ?? 0), 0),
  };
}

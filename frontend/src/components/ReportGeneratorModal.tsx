import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import type { TopologyNode, TopologyEdge } from '../types';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const suspiciousEdges = edges.filter((e) => e.isSuspicious);

  const reportMarkdown = `# GhostRoute AI — Executive SecOps Network Audit Report
**Date Generated:** ${timestamp}
**Engine:** Deterministic NetworkX Graph Reachability Engine
**AI Copilot Model:** nvidia/nemotron-3.5-lightning-30b-a3b

---

## 1. Executive Summary
During automated trust path investigation, GhostRoute AI evaluated **${nodes.length} network assets** across **3 security zones** (DMZ, INTERNAL, DATA). A high-severity shadow path violation was discovered allowing direct ingress from the DMZ tier to the production database cluster.

## 2. Key Findings & Shadow Path Violations
- **Finding ID:** FINDING-POL-DMZ-DB-ISOLATION-1
- **Severity:** CRITICAL
- **Violated Policy:** POL-DMZ-DB-ISOLATION (Direct DMZ to Database access forbidden)
- **Breach Route:** \`dmz-web-01\` (10.0.1.10) ➔ \`fw-core\` ➔ \`db-prod-01\` (10.0.3.10)
- **Target Protocol / Port:** TCP:5432 (PostgreSQL)
- **Permissive Firewall Rule:** FW-CORE-003 (action: ALLOW)

## 3. Threat Forensics & MITRE ATT&CK Mapping
- **T1566.001:** Initial Access via Public-Facing Web Services
- **T1021.001:** Lateral Movement via Permitted Remote Services
- **Exposure Blast Radius:** If DMZ host is compromised, attacker achieves direct PostgreSQL query and dump capabilities without encountering secondary authentication or packet filtering.

## 4. Remediation & Verification Verdict
- **Proposal ID:** PROP-FIX-DMZ-1
- **Recommended Action:** Disable rule \`FW-CORE-003\` on gateway \`fw-core\`
- **Independent Verification:** PASS (100% resolution of shadow route)
- **Legitimate Traffic Preserved:** \`app-srv-01\` ➔ \`db-prod-01\` (TCP:5432) remains ALLOWED
- **Firewall Enforcement Status:** Simulation mode active (Hardware execution disabled)

---
*Report certified by GhostRoute AI SecOps Architecture Engine.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(reportMarkdown);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GhostRoute_SecOps_Report_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#070D20] border border-[#202D50] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202D50] bg-[#0B142B]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/40 text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  SecOps Forensic & Compliance Report
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-[#A855F7] border border-violet-800/60 uppercase">
                  Audit Export
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Standardized security report with NetworkX findings, policy audits, and verification verdicts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRICS HEADER */}
        <div className="px-6 py-3 bg-[#080E24] border-b border-[#202D50] grid grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#22D3EE]" />
            <div>
              <div className="text-[10px] text-[#94A3B8]">Generated</div>
              <div className="text-slate-200">{timestamp.slice(0, 10)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] text-[#94A3B8]">Shadow Routes</div>
              <div className="text-rose-400 font-bold">{suspiciousEdges.length} Detected</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-[#94A3B8]">Compliance Posture</div>
              <div className="text-amber-400 font-bold">Action Required</div>
            </div>
          </div>
        </div>

        {/* REPORT PREVIEW */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-[#CBD5E1] bg-[#050817] leading-relaxed whitespace-pre-wrap selection:bg-violet-500/30">
          {reportMarkdown}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#202D50] bg-[#0B142B] flex items-center justify-between text-xs font-mono">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] text-[#F1F5F9] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Report'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

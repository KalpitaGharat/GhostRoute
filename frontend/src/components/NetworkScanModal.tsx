import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle,
  RefreshCw,
  Server,
  Shield,
  Radio,
  Download,
  Activity,
  Layers
} from 'lucide-react';
import type { TopologyNode } from '../types';

interface NetworkScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TopologyNode[];
}

interface DiscoveredHost {
  id: string;
  name: string;
  ip: string;
  zone: string;
  type: string;
  status: 'ONLINE' | 'FILTERED' | 'WARNING';
  openPorts: number[];
  latencyMs: number;
  services: string[];
}

export const NetworkScanModal: React.FC<NetworkScanModalProps> = ({
  isOpen,
  onClose,
  nodes
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate discovered host records based on the current network nodes
  const [hosts, setHosts] = useState<DiscoveredHost[]>([]);

  const runScan = () => {
    setIsScanning(true);
    setProgress(0);
    setCurrentStep('Broadcasting ARP & ICMP probes across subnets...');

    const timer1 = setTimeout(() => {
      setProgress(35);
      setCurrentStep('Querying perimeter & core firewalls (fw-core, edge-fw)...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setCurrentStep('Probing open TCP ports (22, 80, 443, 5432, 8080)...');
    }, 900);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setCurrentStep('Scan complete. Discovered active interfaces and listening sockets.');
      setIsScanning(false);

      // Build realistic discovered hosts from nodes
      const scanned: DiscoveredHost[] = nodes.map((node) => {
        let ports = [80, 443];
        let services = ['HTTP/HTTPS'];
        if (node.type === 'database') {
          ports = [5432];
          services = ['PostgreSQL'];
        } else if (node.type === 'firewall') {
          ports = [22, 443, 8443];
          services = ['SSH', 'PAN-OS WebUI'];
        } else if (node.type === 'app') {
          ports = [8080, 443];
          services = ['REST API', 'HTTPS'];
        } else if (node.type === 'server') {
          ports = [80, 443, 8000];
          services = ['NGINX', 'Reverse Proxy'];
        }

        return {
          id: node.id,
          name: node.name,
          ip: node.ip,
          zone: node.zone,
          type: node.type,
          status: node.isSuspicious ? 'WARNING' : 'ONLINE',
          openPorts: ports,
          latencyMs: parseFloat((Math.random() * 2.2 + 0.4).toFixed(1)),
          services
        };
      });
      setHosts(scanned);
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
    }
  }, [isOpen, nodes]);

  if (!isOpen) return null;

  const filteredHosts = hosts.filter((h) => {
    if (filterZone !== 'ALL' && h.zone !== filterZone) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.ip.toLowerCase().includes(q) ||
        h.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOpenPorts = hosts.reduce((acc, h) => acc + h.openPorts.length, 0);

  const exportScanJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(hosts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `network_scan_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#070D20] border border-[#202D50] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202D50] bg-[#0B142B]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-[#22D3EE] shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  Network Asset & Port Discovery Scan
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-[#22D3EE] border border-cyan-800/60 uppercase">
                  NetworkX Subnet Sweep
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Real-time active interface probing, IP mapping, and listening socket census
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] text-xs font-mono text-[#F1F5F9] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#22D3EE] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Re-Scan'}</span>
            </button>
            <button
              onClick={exportScanJson}
              disabled={isScanning || hosts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D20] hover:bg-[#101B35] border border-[#202D50] text-xs font-mono text-[#A855F7] transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-[#94A3B8] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCAN PROGRESS BAR */}
        {isScanning && (
          <div className="px-6 py-3 bg-[#09112A] border-b border-[#202D50]">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-[#22D3EE] flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#22D3EE]" />
                {currentStep}
              </span>
              <span className="text-[#94A3B8]">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#22D3EE] to-[#7C3AED] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* SCAN METRICS SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-[#080E24] border-b border-[#202D50] text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0B142B] border border-[#202D50]">
            <Server className="w-4 h-4 text-[#22D3EE]" />
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Discovered Hosts</div>
              <div className="text-sm font-bold text-[#F1F5F9] font-mono">{hosts.length} Online</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0B142B] border border-[#202D50]">
            <Layers className="w-4 h-4 text-[#A855F7]" />
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Subnets Scanned</div>
              <div className="text-sm font-bold text-[#F1F5F9] font-mono">3 Zones (CIDRs)</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0B142B] border border-[#202D50]">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Open Sockets</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">{totalOpenPorts} Ports</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0B142B] border border-[#202D50]">
            <Shield className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-[10px] text-[#94A3B8] uppercase font-mono">Packet Loss</div>
              <div className="text-sm font-bold text-indigo-300 font-mono">0.0% (Clean)</div>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="px-6 py-2.5 border-b border-[#202D50] flex flex-wrap items-center justify-between gap-3 bg-[#070D20]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#94A3B8] mr-1">Zone Filter:</span>
            {['ALL', 'DMZ', 'INTERNAL', 'DATA', 'EDGE'].map((zone) => (
              <button
                key={zone}
                onClick={() => setFilterZone(zone)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filterZone === zone
                    ? 'bg-violet-600/30 text-[#A855F7] border border-violet-500/50'
                    : 'text-[#64748B] hover:text-[#F1F5F9]'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter by host name or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 px-2.5 py-1 rounded-lg bg-[#0B142B] border border-[#202D50] text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {/* SCAN RESULTS TABLE */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {filteredHosts.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#94A3B8] font-mono">
              No hosts match the specified scan filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#202D50]">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-[#0B142B] text-[#94A3B8] font-mono border-b border-[#202D50]">
                    <th className="py-2.5 px-4 font-semibold">Host / Asset</th>
                    <th className="py-2.5 px-4 font-semibold">IP Address</th>
                    <th className="py-2.5 px-4 font-semibold">Security Zone</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Open Ports</th>
                    <th className="py-2.5 px-4 font-semibold">Services</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202D50]/60">
                  {filteredHosts.map((host) => (
                    <tr
                      key={host.id}
                      className="hover:bg-[#0E1733] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-semibold text-[#F1F5F9] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{host.name}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#22D3EE]">{host.ip}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {host.zone}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        {host.status === 'WARNING' ? (
                          <span className="text-amber-400 font-semibold">REACHABLE (SHADOW PATH)</span>
                        ) : (
                          <span className="text-emerald-400">ACTIVE</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <div className="flex flex-wrap gap-1">
                          {host.openPorts.map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 border border-slate-700 text-[#F1F5F9]"
                            >
                              {p}/TCP
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#94A3B8] text-[11px]">
                        {host.services.join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#94A3B8]">
                        {host.latencyMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#202D50] bg-[#0B142B] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Output restricted strictly to network scanner results.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

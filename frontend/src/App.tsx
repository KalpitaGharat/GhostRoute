import React, { useState, useEffect } from 'react';
import { FuturisticBackground } from './components/FuturisticBackground';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { SidebarTab } from './components/Sidebar';
import { PageHeading } from './components/PageHeading';
import { KPICards } from './components/KPICards';
import { NetworkTopologyPanel } from './components/NetworkTopologyPanel';
import { RecentIncidentsPanel } from './components/RecentIncidentsPanel';
import { BottomAnalyticsSection } from './components/BottomAnalyticsSection';
import { AgentWorkflowModal } from './components/AgentWorkflowModal';
import { EdgeDetailModal } from './components/EdgeDetailModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';

// Dedicated Quick Action Modals
import { NetworkScanModal } from './components/NetworkScanModal';
import { PathAnalysisModal } from './components/PathAnalysisModal';
import { RemediationPlanModal } from './components/RemediationPlanModal';
import { ReportGeneratorModal } from './components/ReportGeneratorModal';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { AIExplainModal } from './components/AIExplainModal';

// Dedicated Sidebar Navigation Views
import { NetworkTopologyStudio } from './views/NetworkTopologyStudio';
import { RiskAnalyticsView } from './views/RiskAnalyticsView';
import { ThreatIntelligenceView } from './views/ThreatIntelligenceView';
import { RemediationsView } from './views/RemediationsView';
import { AssetInventoryView } from './views/AssetInventoryView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

import {
  initialTopologyNodes,
  initialTopologyEdges,
  initialIncidents,
  initialRiskyAssets,
  buildTopologyFromBackend,
} from './services/dashboardData';
import type {
  TopologyNode,
  TopologyEdge,
  IncidentItem,
  RiskyAsset
} from './types';
import { getHealth, getSampleNetwork, type NetworkModel } from './services/api';

export const App: React.FC = () => {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');

  // Backend connectivity
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Live network model from backend
  const [_liveNetwork, setLiveNetwork] = useState<NetworkModel | null>(null);

  // Interactive Data state
  const [nodes, setNodes] = useState<TopologyNode[]>(initialTopologyNodes);
  const [edges, setEdges] = useState<TopologyEdge[]>(initialTopologyEdges);
  const [incidents] = useState<IncidentItem[]>(initialIncidents);
  const [riskyAssets] = useState<RiskyAsset[]>(initialRiskyAssets);

  // Ghost-route highlights from the live agent run
  const [liveGhostPath, setLiveGhostPath] = useState<string[]>([]);

  // Selection & Modal state
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TopologyEdge | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Quick Action & Tool Modals
  const [isNetworkScanModalOpen, setIsNetworkScanModalOpen] = useState(false);
  const [isPathAnalysisModalOpen, setIsPathAnalysisModalOpen] = useState(false);
  const [isRemediationPlanModalOpen, setIsRemediationPlanModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [isAIExplainModalOpen, setIsAIExplainModalOpen] = useState(false);

  // ── Backend health check on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getHealth();
        if (!cancelled) setBackendOnline(true);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load network model from backend & seed topology ────────────────────────
  useEffect(() => {
    if (!backendOnline) return;
    (async () => {
      try {
        const net = await getSampleNetwork();
        setLiveNetwork(net);
        // Rebuild topology from real device/connection data
        const { nodes: builtNodes, edges: builtEdges } = buildTopologyFromBackend(net);
        setNodes(builtNodes);
        setEdges(builtEdges);
      } catch {
        // Backend returned the network but topology seed failed; keep mock data
      }
    })();
  }, [backendOnline]);

  // ── Global Keyboard Shortcuts (Ctrl + K) ──────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Remediate a ghost route ────────────────────────────────────────────────
  const handleRemediateGhostRoute = (routeId: string) => {
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id === routeId) {
          return {
            ...edge,
            isSuspicious: false,
            pathLabel: 'REMEDIATED: Severed Route',
            reason: 'Severed by Security Policy Enforcement'
          };
        }
        return edge;
      })
    );
  };


  // ── Ghost route discovered by the live agent ──────────────────────────────
  const handleGhostRouteDiscovered = (path: string[], _findingId: string) => {
    setLiveGhostPath(path);
    // Highlight nodes on the discovered path as suspicious
    setNodes((prev) =>
      prev.map((n) =>
        path.includes(n.id) ? { ...n, isSuspicious: true, status: 'suspicious' } : n
      )
    );
    // Highlight edges on the discovered path as suspicious
    setEdges((prev) =>
      prev.map((e) => {
        const inPath =
          path.some((id, i) => i < path.length - 1 && id === e.source && path[i + 1] === e.target) ||
          path.some((id, i) => i < path.length - 1 && id === e.target && path[i + 1] === e.source);
        return inPath ? { ...e, isSuspicious: true } : e;
      })
    );
  };

  // ── Apply remediation from agent (sever all live ghost-path edges) ─────────
  const handleAgentRemediation = () => {
    if (liveGhostPath.length > 1) {
      setEdges((prev) =>
        prev.map((e) => {
          const inPath =
            liveGhostPath.some(
              (id, i) =>
                i < liveGhostPath.length - 1 &&
                id === e.source &&
                liveGhostPath[i + 1] === e.target
            ) ||
            liveGhostPath.some(
              (id, i) =>
                i < liveGhostPath.length - 1 &&
                id === e.target &&
                liveGhostPath[i + 1] === e.source
            );
          return inPath && e.isSuspicious
            ? { ...e, isSuspicious: false, pathLabel: 'REMEDIATED via Agent Workflow' }
            : e;
        })
      );
      setNodes((prev) =>
        prev.map((n) =>
          liveGhostPath.includes(n.id) && n.isSuspicious
            ? { ...n, isSuspicious: false, status: 'normal' }
            : n
        )
      );
      setLiveGhostPath([]);
    } else {
      handleRemediateGhostRoute('ghost-dmz-db');
    }
  };

  return (
    <div className="min-h-screen bg-[#050817] text-[#F1F5F9] flex flex-col font-sans relative selection:bg-violet-500/30 selection:text-violet-200">
      {/* Visual Background Graphics */}
      <FuturisticBackground />

      {/* TOP NAVIGATION BAR */}
      <Navbar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        unreadCount={3}
        backendOnline={backendOnline}
      />

      {/* MAIN CONTAINER: SIDEBAR + MAIN WORKSPACE */}
      <div className="flex flex-1 relative z-10 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAIAssistant={() => setIsAgentModalOpen(true)}
        />

        {/* MAIN WORKSPACE */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4 max-w-[1720px] mx-auto w-full">
          {/* Backend offline banner */}
          {backendOnline === false && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-[#F59E0B]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
              <span>
                <strong>Backend offline</strong> — displaying mock data. Start the FastAPI server on{' '}
                <code className="text-[#22D3EE]">http://localhost:8000</code> to enable live analysis.
              </span>
            </div>
          )}

          {/* CONDITIONAL MAIN WORKSPACE ACCORDING TO ACTIVE SIDEBAR TAB */}
          {activeTab === 'dashboard' && (
            <>
              {/* PAGE HEADING */}
              <PageHeading
                onRunAnalysis={() => setIsAgentModalOpen(true)}
              />

              {/* KPI CARDS */}
              <KPICards
                onCardClick={(cardId) => {
                  if (cardId === 'ghost-routes') {
                    const ghostEdge = edges.find((e) => e.isSuspicious);
                    if (ghostEdge) setSelectedEdge(ghostEdge);
                  }
                  if (cardId === 'monitored-nodes') {
                    const dbNode = nodes.find((n) => n.id === 'node-prod-db' || n.id === 'db-prod-01');
                    if (dbNode) {
                      setSelectedNode(dbNode);
                      setIsNodeInspectorOpen(true);
                    }
                  }
                }}
              />

              {/* MAIN NETWORK TOPOLOGY & RECENT INCIDENTS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-8 flex flex-col">
                  <NetworkTopologyPanel
                    nodes={nodes}
                    edges={edges}
                    selectedNodeId={selectedNode ? selectedNode.id : null}
                    selectedEdgeId={selectedEdge ? selectedEdge.id : null}
                    onSelectNode={(node) => {
                      setSelectedNode(node);
                      setIsNodeInspectorOpen(true);
                    }}
                    onSelectEdge={(edge) => setSelectedEdge(edge)}
                  />
                </div>

                <div className="lg:col-span-4 flex flex-col">
                  <RecentIncidentsPanel
                    incidents={incidents}
                    onSelectIncident={(inc) => {
                      if (inc.id === 'inc-1') {
                        const gr = edges.find((e) => e.id === 'ghost-dmz-db' || e.isSuspicious);
                        if (gr) setSelectedEdge(gr);
                      }
                    }}
                    onExplainWithAI={() => setIsAIExplainModalOpen(true)}
                    onViewAllIncidents={() => setActiveTab('threats')}
                  />
                </div>
              </div>

              {/* BOTTOM ANALYTICS SECTION */}
              <BottomAnalyticsSection
                riskyAssets={riskyAssets}
                onSelectAsset={(asset) => {
                  const matchedNode = nodes.find(
                    (n) => n.name === asset.name || n.ip === asset.ip || n.id === asset.id
                  );
                  if (matchedNode) {
                    setSelectedNode(matchedNode);
                    setIsNodeInspectorOpen(true);
                  }
                }}
                onQuickAction={(actionId) => {
                  if (actionId === 'scan') {
                    setIsNetworkScanModalOpen(true);
                  } else if (actionId === 'analyze-path') {
                    setIsPathAnalysisModalOpen(true);
                  } else if (actionId === 'remediation') {
                    setIsRemediationPlanModalOpen(true);
                  } else if (actionId === 'report') {
                    setIsReportModalOpen(true);
                  }
                }}
              />
            </>
          )}

          {activeTab === 'topology' && (
            <NetworkTopologyStudio
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onSelectNode={(n) => {
                setSelectedNode(n);
                if (n) setIsNodeInspectorOpen(true);
              }}
              onSelectEdge={setSelectedEdge}
              onOpenInvestigation={() => setIsAgentModalOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <RiskAnalyticsView riskyAssets={riskyAssets} />
          )}

          {activeTab === 'threats' && (
            <ThreatIntelligenceView
              incidents={incidents}
              onOpenInvestigation={() => setIsAgentModalOpen(true)}
            />
          )}

          {activeTab === 'remediations' && (
            <RemediationsView
              onOpenInvestigation={() => setIsAgentModalOpen(true)}
            />
          )}

          {activeTab === 'assets' && (
            <AssetInventoryView
              nodes={nodes}
              onSelectNode={(node) => {
                setSelectedNode(node);
                setIsNodeInspectorOpen(true);
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              nodes={nodes}
              edges={edges}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* MODALS */}

      {/* 1. Live Agent Workflow Modal (replaces old AnalysisModal + AIExplainModal) */}
      <AgentWorkflowModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onGhostRouteDiscovered={handleGhostRouteDiscovered}
        onApplyRemediation={handleAgentRemediation}
      />

      {/* 2. Edge / Ghost Route Detail Modal */}
      <EdgeDetailModal
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
        onRemediateEdge={handleRemediateGhostRoute}
        onOpenInvestigation={() => setIsAgentModalOpen(true)}
      />

      {/* 3. Command Palette (Ctrl + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        nodes={nodes}
        onSelectNode={(node) => {
          setSelectedNode(node);
          setIsNodeInspectorOpen(true);
        }}
      />

      {/* 4. Dedicated Quick Action: Network Scan Modal */}
      <NetworkScanModal
        isOpen={isNetworkScanModalOpen}
        onClose={() => setIsNetworkScanModalOpen(false)}
        nodes={nodes}
      />

      {/* 5. Dedicated Quick Action: Point-to-Point Path Analysis Modal */}
      <PathAnalysisModal
        isOpen={isPathAnalysisModalOpen}
        onClose={() => setIsPathAnalysisModalOpen(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* 6. Dedicated Quick Action: Remediation Plan Modal */}
      <RemediationPlanModal
        isOpen={isRemediationPlanModalOpen}
        onClose={() => setIsRemediationPlanModalOpen(false)}
        onOpenFullWorkflow={() => setIsAgentModalOpen(true)}
      />

      {/* 7. Dedicated Quick Action: Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* 8. Node Inspector Modal */}
      {isNodeInspectorOpen && selectedNode && (
        <NodeInspectorModal
          node={selectedNode}
          edges={edges}
          onClose={() => {
            setIsNodeInspectorOpen(false);
            setSelectedNode(null);
          }}
          onRemediateGhostRoute={() => handleRemediateGhostRoute('ghost-dmz-db')}
        />
      )}

      {/* 9. Dedicated AI Explain with Nemotron Modal */}
      <AIExplainModal
        isOpen={isAIExplainModalOpen}
        onClose={() => setIsAIExplainModalOpen(false)}
        onOpenRemediation={() => {
          setIsAIExplainModalOpen(false);
          setIsRemediationPlanModalOpen(true);
        }}
      />
    </div>
  );
};

export default App;

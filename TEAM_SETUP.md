# GhostRoute AI — Team Setup & Integration Guide

Welcome to **GhostRoute AI: The Network Trust Path Investigator**!

This document provides complete instructions for setting up the backend locally, understanding the existing modules, running automated tests, and integrating your assigned components.

---

## 1. Project Overview & Architecture

GhostRoute AI is a simulation-first network security analysis platform. Rather than testing against physical hardware, it models network topology, firewall rules, and security boundaries in software to detect unintended communication paths ("ghost routes").

The platform enforces a deterministic 6-stage workflow:
$$\text{Detect} \longrightarrow \text{Investigate} \longrightarrow \text{Explain} \longrightarrow \text{Recommend} \longrightarrow \text{Simulate} \longrightarrow \text{Verify}$$

```
                          ┌────────────────────────────────────────┐
                          │          Cytoscape.js Frontend         │
                          │               (Kalpita)                │
                          └──────────────────┬─────────────────────┘
                                             │ HTTP REST
                                             ▼
                          ┌────────────────────────────────────────┐
                          │            FastAPI Backend             │
                          │              (Aayushman)               │
                          └────┬─────────────┬─────────────────┬───┘
                               │             │                 │
                               ▼             ▼                 ▼
                 ┌─────────────────┐  ┌─────────────┐  ┌───────────────────┐
                 │  Graph Adapter  │  │ NVIDIA NIM  │  │   Simulation &    │
                 │  & Deterministic│  │  Nemotron   │  │   Verification    │
                 │  Engine (Neev)  │  │   LLM AI    │  │     Engine        │
                 └─────────────────┘  └─────────────┘  └───────────────────┘
```

### Team Responsibilities
- **Aayushman**: FastAPI backend, schemas, remediation safety validation, in-memory simulation, independent 3-condition verification, NVIDIA Nemotron integration, and agent orchestration.
- **Neev**: High-performance deterministic graph reachability analysis engine (using NetworkX).
- **Kalpita**: Interactive Cytoscape.js web dashboard and visualization interface.

---

## 2. Prerequisites & Local Installation

### Prerequisites
- Python 3.11 or higher (Python 3.11, 3.12, and 3.13 are supported).
- Git.
- (Optional) NVIDIA Build API Key for live AI generation. (If omitted, the backend runs in a transparent, labeled offline demo mode).

### Step-by-Step Setup
1. **Clone or Extract the Project:**
   ```bash
   cd GhostRoute_AI
   ```

2. **Create and Activate a Virtual Environment:**
   * On Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   * On Linux / macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## 3. Environment Variables Configuration

Copy `.env.example` to create your local `.env`:
* Windows (PowerShell):
  ```powershell
  Copy-Item .env.example .env
  ```
* Linux / macOS:
  ```bash
  cp .env.example .env
  ```

### `.env` File Options
```ini
# NVIDIA NIM API Key (from https://build.nvidia.com)
NVIDIA_API_KEY=your_nvidia_api_key_here

# NVIDIA NIM OpenAI-compatible endpoint
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Verified active model (Nemotron reasoning model)
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

# Server host & port
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

> **Important**:
> If you leave `NVIDIA_API_KEY` as a placeholder or empty, **the backend will still run completely**. The AI explanation stage gracefully falls back to an explicitly labeled `DEMO_FALLBACK` mode. You do **not** need an API key to develop, test, or run the application.

---

## 4. Running the Backend & Tests

### Start the FastAPI Server
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive OpenAPI Swagger UI: `http://localhost:8000/docs`
- Raw OpenAPI schema: `http://localhost:8000/openapi.json`

### Run Automated Unit & Integration Tests (Offline)
```bash
pytest -v
```
All 20 test cases run deterministically without internet access or API rate limits.

### Run End-to-End Live Smoke Test
```bash
python tests/smoke_test.py
```
This script exercises all 6 endpoints sequentially using `data/network.json` and prints step-by-step progress.

---

## 5. Existing Modules & Responsibilities

```
backend/
├── main.py              # FastAPI application, CORS configuration, and REST route handlers.
├── schemas.py           # Pydantic v2 schemas for devices, connections, rules, findings, proposals, and verification.
├── validation.py        # Pre-analysis structural and semantic validator for topology, CIDR, and ports.
├── graph_adapter.py     # Deterministic graph reachability engine & NetworkGraphEngine adapter interface for Neev.
├── remediation.py       # Strict allowlist validator for proposals and in-memory deep-copy simulation.
├── verification.py      # Independent 3-condition deterministic verification engine.
└── agent.py             # NVIDIA Nemotron client, prompt injection defense, and agent workflow orchestrator.
data/
└── network.json         # Reference multi-tier enterprise network model with a ghost route vulnerability.
tests/
├── test_api.py          # API route tests.
├── test_agent.py        # Agent workflow and LLM fallback tests.
├── test_verification.py # Simulation safety, immutability, and verification rule tests.
├── test_audit_fixes.py  # Regression tests for port ranges, CIDR subnets, default-deny, and multi-hop forwarding.
└── smoke_test.py        # Standalone end-to-end integration smoke test runner.
```

---

## 6. API Endpoints Specification

### 1. `GET /health`
* **Response**:
  ```json
  {
    "status": "healthy",
    "service": "ghostroute-backend"
  }
  ```

### 2. `POST /analyze`
* **Input**: Network JSON model (`NetworkModel`).
* **Output**: `AnalyzeResponse` containing detected policy violations with discovered paths and supporting firewall rule IDs.
* **Example**:
  ```json
  {
    "model_name": "Enterprise Production Hybrid Cloud",
    "total_violations": 1,
    "findings": [
      {
        "id": "FINDING-POL-DMZ-DB-ISOLATION-1",
        "source": "dmz-web-01",
        "destination": "db-prod-01",
        "protocol": "TCP",
        "port": 5432,
        "discovered_path": ["dmz-web-01", "fw-core", "db-prod-01"],
        "supporting_rule_ids": ["FW-CORE-003"],
        "violated_policy_id": "POL-DMZ-DB-ISOLATION",
        "severity": "CRITICAL",
        "description": "Unintended trust path discovered...",
        "status": "DETECTED"
      }
    ],
    "execution_mode": "DETERMINISTIC_GRAPH"
  }
  ```

### 3. `POST /explain`
* **Input**: `ExplainRequest` with `finding` and optional `network_summary`.
* **Output**: Root cause explanation and structured least-privilege `RemediationProposal`.
* **Status**: `ANALYZED_LLM` (if using real Nemotron) or `DEMO_FALLBACK` (if offline).

### 4. `POST /simulate-fix`
* **Input**: `SimulateFixRequest` with `network` and `proposal`.
* **Behavior**: Deep-copies the model and executes allowlisted operations (`DELETE_RULE`, `DISABLE_RULE`, `UPDATE_RULE`, `ADD_RULE`). The original network is never modified.
* **Output**: `SimulateFixResponse` with `simulated_network` and audit log of changes.

### 5. `POST /verify`
* **Input**: `VerifyRequest` with `simulated_network` and `original_violation`.
* **Verification Conditions Evaluated**:
  1. **Condition 1**: Original violation must be completely resolved.
  2. **Condition 2**: All required legitimate business paths (e.g. app server to DB, admin SSH) must remain reachable.
  3. **Condition 3**: Zero new or regressive violations introduced.
* **Output**: `VerifyResponse` with `verdict: "PASS"` (or `"FAIL"`), `checks`, and details.

### 6. `POST /agent/run`
* **Input**: `AgentWorkflowRequest` (`{"network": {...}}`).
* **Behavior**: Runs the full autonomous loop: **Detect $\rightarrow$ Investigate $\rightarrow$ Explain $\rightarrow$ Recommend $\rightarrow$ Simulate $\rightarrow$ Verify**.
* **Output**: `AgentWorkflowResponse` including all intermediate steps, findings, explanation, simulation, and final verification verdict.

---

## 7. Teammate Integration Guide

### For Neev (Graph Analysis Engine Developer)
The backend decouples graph analysis through `backend/graph_adapter.py`. You do not need to rewrite any route handlers!

To plug in your custom engine:
1. Subclass `NetworkGraphEngine`:
   ```python
   from backend.graph_adapter import NetworkGraphEngine, set_active_graph_engine
   from backend.schemas import NetworkModel, AnalysisFinding

   class NeevGraphEngine(NetworkGraphEngine):
       @property
       def engine_name(self) -> str:
           return "NeevOptimizedNetworkXEngine"

       def analyze_policies(self, network: NetworkModel) -> list[AnalysisFinding]:
           # Your custom graph reachability & policy evaluation algorithm
           ...

       def find_permitted_path(self, network: NetworkModel, source_id: str, dest_id: str, protocol: str = "TCP", port: int = None):
           # Return (path_device_ids, supporting_rule_ids) if reachable, or None
           ...
   ```
2. Register your engine at application startup or in `backend/main.py`:
   ```python
   set_active_graph_engine(NeevGraphEngine())
   ```

### For Kalpita (Cytoscape.js Frontend Developer)
1. **CORS is Pre-configured**: FastAPI allows cross-origin requests from any origin (`*`) on port `8000`.
2. **Topology Visual Mapping**:
   - `data/network.json` maps directly to Cytoscape:
     - `devices`: Nodes (use `id` as node ID, `name` as label, `zone` for color coding).
     - `connections`: Edges (use `source` and `target`).
3. **Ghost Route Rendering**:
   - When `/analyze` or `/agent/run` returns a finding, take `finding.discovered_path` (e.g. `["dmz-web-01", "fw-core", "db-prod-01"]`) and style those edges as glowing red dashed lines on the Cytoscape graph.
4. **Triggering the Workflow**:
   - Simply send a `POST http://localhost:8000/agent/run` with the network JSON to trigger the full 6-step loop.
   - When `verification.verdict == "PASS"`, highlight the disabled/deleted rule and turn the ghost route green/resolved.

---

## 8. Known Scope & Assumptions
- **Firewall Semantics**: Evaluates stateless Layer 3/Layer 4 rules (Source Zone/IP, Destination Zone/IP, Protocol, Port, Priority). Stateful connection tracking and NAT are currently out of scope.
- **Safety First**: The remediation engine strictly prevents shell execution or live network interaction. All changes are strictly in-memory simulations.

# GhostRoute AI — The Network Trust Path Investigator

**GhostRoute AI** is a simulation-first network security analysis platform that identifies unintended communication paths ("ghost routes") in modeled networks, explains root causes using NVIDIA Nemotron AI, proposes least-privilege remediations, simulates fixes in memory, and independently verifies them using deterministic graph analysis.

```
Detect ──► Investigate ──► Explain ──► Recommend ──► Simulate ──► Verify
```

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Cytoscape.js Frontend         │
                      │               (Kalpita)                │
                      └──────────────────┬─────────────────────┘
                                         │ REST API
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

---

## Project Structure

```
ghostroute-ai/
├── backend/
│   ├── __init__.py           # Package version and metadata
│   ├── main.py               # FastAPI application with CORS and REST routes
│   ├── schemas.py            # Pydantic schemas for network, findings, proposals, verifications
│   ├── agent.py              # Agentic orchestration loop & NVIDIA Nemotron NIM integration
│   ├── graph_adapter.py      # Abstract interface and NetworkX reference graph engine
│   ├── remediation.py        # Proposal validation and in-memory deep-copy simulation
│   └── verification.py       # Independent 3-condition deterministic verification engine
├── data/
│   └── network.json          # Multi-zone production network model with ghost route vulnerability
├── tests/
│   ├── test_api.py           # Endpoint integration tests (REST API)
│   ├── test_agent.py         # AI orchestration, LLM mocks, fallback & prompt defense tests
│   └── test_verification.py  # Simulation immutability, safety allowlists & verification rules
├── requirements.txt          # Python dependencies
├── pytest.ini                # Pytest configuration
├── .env.example              # Template environment configuration
├── .gitignore                # Git exclusions
└── README.md                 # System documentation & API specification
```

---

## Quickstart & Installation

### 1. Prerequisites
- Python 3.11+ (Python 3.13 supported)
- Windows / macOS / Linux

### 2. Setup Virtual Environment
```bash
# Clone or navigate to the directory
cd c:\PROJECTS\GhostRoute

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your NVIDIA Nemotron API key:
```ini
# NVIDIA NIM OpenAI-Compatible API Key
NVIDIA_API_KEY=nvapi-your-key-here

# Endpoint base URL
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Configurable model ID
NVIDIA_MODEL=nvidia/nemotron-4-340b-instruct
```

> **Note**: If `NVIDIA_API_KEY` is omitted, the backend starts seamlessly in **Offline Demo Mode** (`DEMO_FALLBACK`). Real deterministic analysis and verification remain 100% active.

### 4. Run the Backend Server
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
Open your browser at `http://localhost:8000/docs` to view interactive OpenAPI Swagger documentation.

### 5. Run the Test Suite
```bash
pytest -v
```

---

## API Endpoints Specification

### 1. `GET /`
**Description**: Root identity and health status.
```bash
curl -X GET http://localhost:8000/
```
**Response**:
```json
{
  "name": "GhostRoute AI",
  "description": "The Network Trust Path Investigator",
  "version": "0.1.0",
  "status": "running"
}
```

---

### 2. `GET /health`
**Description**: Service health probe.
```bash
curl -X GET http://localhost:8000/health
```
**Response**:
```json
{
  "status": "healthy",
  "service": "ghostroute-backend"
}
```

---

### 3. `POST /analyze`
**Description**: Deterministically analyzes topology and firewall rules against security access policies.
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d @data/network.json
```
**Sample Response**:
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
      "description": "Unintended trust path discovered from dmz-web-01 (DMZ) to db-prod-01 (DATA) via path [dmz-web-01 -> fw-core -> db-prod-01] on TCP:5432. Permitted by rules: ['FW-CORE-003'].",
      "status": "DETECTED"
    }
  ],
  "execution_mode": "DETERMINISTIC_GRAPH"
}
```

---

### 4. `POST /explain`
**Description**: Sends verified reachability evidence to NVIDIA Nemotron to generate an architectural explanation and structured least-privilege remediation proposal.
```bash
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -d '{
    "finding": {
      "id": "FINDING-POL-DMZ-DB-ISOLATION-1",
      "source": "dmz-web-01",
      "destination": "db-prod-01",
      "protocol": "TCP",
      "port": 5432,
      "discovered_path": ["dmz-web-01", "fw-core", "db-prod-01"],
      "supporting_rule_ids": ["FW-CORE-003"],
      "violated_policy_id": "POL-DMZ-DB-ISOLATION",
      "severity": "CRITICAL",
      "description": "Unintended path from DMZ to database",
      "status": "DETECTED"
    }
  }'
```
**Sample Response**:
```json
{
  "finding_id": "FINDING-POL-DMZ-DB-ISOLATION-1",
  "explanation": "The deterministic graph engine detected an unintended communication path originating at dmz-web-01 and terminating at sensitive host db-prod-01 due to overly permissive rule FW-CORE-003.",
  "root_cause": "Permissive rule FW-CORE-003 permits unauthorized zone transit without granular source/target filtering.",
  "proposed_remediation": {
    "proposal_id": "PROP-FIX-FINDING-POL-DMZ-DB-ISOLATION-1",
    "target_rule_id": "FW-CORE-003",
    "target_device_id": "fw-core",
    "operation": "DISABLE_RULE",
    "rule_spec": null,
    "rationale": "Disabling rule FW-CORE-003 enforces least privilege by terminating the ghost path without affecting legitimate internal services.",
    "expected_impact": "Terminates unauthorized path on TCP:5432. Legitimate application flows remain governed by independent specific rules."
  },
  "model_used": "nvidia/nemotron-4-340b-instruct",
  "status": "ANALYZED_LLM",
  "error": null
}
```

---

### 5. `POST /simulate-fix`
**Description**: Simulates the proposed firewall modification on a deep copy of the network model. The original network is never touched.
```bash
curl -X POST http://localhost:8000/simulate-fix \
  -H "Content-Type: application/json" \
  -d '{
    "network": { ...networkModel... },
    "proposal": {
      "proposal_id": "PROP-FIX-1",
      "target_rule_id": "FW-CORE-003",
      "target_device_id": "fw-core",
      "operation": "DISABLE_RULE",
      "rationale": "Disable wildcard rule",
      "expected_impact": "Terminates unintended path"
    }
  }'
```
**Sample Response**:
```json
{
  "status": "SIMULATED",
  "changes_applied": [
    "DISABLED rule FW-CORE-003 on device fw-core."
  ],
  "simulated_network": { ...deepCopyNetworkModel... },
  "message": "Proposed remediation successfully simulated on isolated network copy."
}
```

---

### 6. `POST /verify`
**Description**: Reruns deterministic analysis on the simulated copy to verify that:
1. The original violation is resolved.
2. Required legitimate traffic remains operational.
3. No new policy violations were introduced.

```bash
curl -X POST http://localhost:8000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "simulated_network": { ...simulatedModel... }
  }'
```
**Sample Response**:
```json
{
  "verdict": "PASS",
  "original_violation_resolved": true,
  "legitimate_paths_intact": true,
  "new_violations_count": 0,
  "checks": [
    {
      "policy_id": "GLOBAL_CHECK",
      "check_type": "ORIGINAL_VIOLATION_RESOLVED",
      "verdict": "PASS",
      "details": "0 active violations detected."
    },
    {
      "policy_id": "POL-APP-DB-ALLOWED",
      "check_type": "LEGITIMATE_PATH_INTACT",
      "verdict": "PASS",
      "details": "Legitimate required path app-server-01 -> db-prod-01 (TCP:5432) remains operational."
    },
    {
      "policy_id": "POL-ADMIN-SSH-ALLOWED",
      "check_type": "LEGITIMATE_PATH_INTACT",
      "verdict": "PASS",
      "details": "Legitimate required path jumpbox-admin -> db-prod-01 (TCP:22) remains operational."
    },
    {
      "policy_id": "SAFETY_POLICY",
      "check_type": "NO_NEW_VIOLATIONS",
      "verdict": "PASS",
      "details": "No new policy violations introduced by the proposed change."
    }
  ],
  "message": "Verification SUCCESS: Remediation resolved violation without breaking legitimate traffic."
}
```

---

### 7. `POST /agent/run`
**Description**: Full automated agentic orchestration workflow (Detect -> Investigate -> Explain -> Recommend -> Simulate -> Verify).
```bash
curl -X POST http://localhost:8000/agent/run \
  -H "Content-Type: application/json" \
  -d @data/network.json
```
**Sample Response**:
```json
{
  "status": "COMPLETED",
  "total_findings": 1,
  "selected_finding": { ... },
  "explanation": { ... },
  "simulation": { ... },
  "verification": { ... },
  "steps": [
    {"step_name": "1. Deterministic Detection", "status": "SUCCESS", "details": {...}},
    {"step_name": "2. AI Explanation & Recommendation", "status": "SUCCESS", "details": {...}},
    {"step_name": "3. Safe In-Memory Simulation", "status": "SUCCESS", "details": {...}},
    {"step_name": "4. Independent Deterministic Verification", "status": "SUCCESS", "details": {...}}
  ],
  "final_summary": "Investigation finished with verdict: PASS. Verification SUCCESS: Remediation resolved violation without breaking legitimate traffic."
}
```

---

## Integration Guide for Teammates

### For Neev (Graph Analysis Engine Developer)
The backend does **not** hardcode graph analysis internals. All graph logic sits behind `backend/graph_adapter.py`.

To connect your custom graph engine:
1. Inherit from `NetworkGraphEngine`:
```python
from backend.graph_adapter import NetworkGraphEngine, set_active_graph_engine
from backend.schemas import NetworkModel, AnalysisFinding

class NeevGraphEngine(NetworkGraphEngine):
    @property
    def engine_name(self) -> str:
        return "NeevOptimizedNetworkXEngine"

    def analyze_policies(self, network: NetworkModel) -> list[AnalysisFinding]:
        # Your custom high-performance graph reachability algorithm
        ...

    def find_permitted_path(self, network: NetworkModel, source_id: str, dest_id: str, protocol: str = "TCP", port: int = None):
        ...
```
2. Plug it in at startup:
```python
set_active_graph_engine(NeevGraphEngine())
```

### For Kalpita (Frontend / Cytoscape.js Developer)
1. **CORS is enabled** for all origins (`*`) by default on port `8000`.
2. Network nodes and edges from `network.json` map directly to Cytoscape:
   - `devices[i].id` -> node `id`
   - `devices[i].name` -> node `label`
   - `devices[i].zone` -> node style / group color (e.g. DMZ=orange, CORE=blue, DATA=red)
   - `connections[i].source` & `connections[i].target` -> Cytoscape edge
3. The discovered path returned in `finding.discovered_path` (e.g. `["dmz-web-01", "fw-core", "db-prod-01"]`) can be highlighted in glowing red as the **Ghost Route** on the Cytoscape canvas.
4. When `POST /agent/run` or `POST /verify` returns `verdict: "PASS"`, the frontend can highlight the disabled rule and render the green verified state.

# GhostRoute AI — Frontend Integration & Handoff Guide

**Author:** Aayushman (Backend & AI Lead)  
**Recipient:** Kalpita (Frontend & Dashboard Lead)  
**Date:** October 2026  
**Backend Base URL:** `http://localhost:8000` (default local development)  
**Protocol:** REST over HTTP / JSON  
**CORS Status:** Enabled for all origins (`*`), headers, and methods  

---

## 1. Quick Start & Local Setup

### Prerequisites
- Python 3.10, 3.11, 3.12, or 3.13
- Git and a terminal (PowerShell, bash, or zsh)

### Installation Steps
1. **Unzip the package** and navigate into the project root:
   ```bash
   cd GhostRoute
   ```

2. **Create and activate a virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - On macOS / Linux:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Copy `.env.example` to `.env`:
   - On Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - On macOS / Linux:
     ```bash
     cp .env.example .env
     ```
   *(Note: The backend runs in offline demo fallback mode by default. If you have an NVIDIA Nemotron API key, you can add it to `.env` as `NVIDIA_API_KEY=nvapi-...`. Never commit your `.env` file.)*

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The interactive API Swagger docs will be available at `http://localhost:8000/docs`.

6. **Run backend automated tests**:
   ```bash
   pytest -v
   ```

---

## 2. Network & Host Configuration

- **Local Machine:** If your frontend dashboard runs in the browser on the same computer as the backend, use `http://localhost:8000`.
- **Different Machine / LAN:** If the backend runs on a teammate's computer or remote VM:
  1. Start the server with `--host 0.0.0.0`.
  2. Point your frontend fetch calls to `http://<BACKEND_IP>:8000`.
  3. Ensure Windows Firewall or network ACLs permit inbound TCP traffic on port `8000`.

---

## 3. API Endpoints Reference

### 3.1. Health Probe — `GET /health`
Poll this endpoint on dashboard startup or on an interval to show backend connectivity status in your UI.

- **Request:** None
- **Response (`200 OK`):**
  ```json
  {
    "status": "healthy",
    "service": "ghostroute-backend"
  }
  ```

---

### 3.2. Fetch Default Network Model — `GET /network/sample`
Returns the complete multi-zone corporate network model (`data/network.json`). Call this endpoint on page load to populate Cytoscape.js nodes, edges, zones, and access policies.

- **Request:** None
- **Response (`200 OK`):** `NetworkModel` JSON containing:
  - `name`: String (e.g. `"Enterprise Production Hybrid Cloud"`)
  - `devices`: Array of network nodes (`id`, `name`, `type`, `zone`, `ip`, `can_forward`)
  - `connections`: Array of links (`source`, `target`, `bidirectional`)
  - `firewall_rules`: Array of access rules (`id`, `device_id`, `action`, `source_zone`, `destination_zone`, `port`, `enabled`, etc.)
  - `access_policies`: Array of security policies (`id`, `name`, `source`, `destination`, `expected_verdict`, `severity`)

---

### 3.3. Deterministic Reachability Analysis — `POST /analyze`
Analyzes the network against all security policies using the deterministic NetworkX graph engine.

> **CRITICAL PAYLOAD NOTICE:** `POST /analyze` expects the `NetworkModel` object **directly** as the root JSON payload (do NOT wrap it in a `{"network": ...}` envelope).

#### Example Request Body:
```json
{
  "id": "net-enterprise-dmz-01",
  "name": "Enterprise Production Hybrid Cloud",
  "version": "1.0.0",
  "devices": [
    {
      "id": "dmz-web-01",
      "name": "Public Web Server",
      "type": "host",
      "zone": "DMZ",
      "ip": "192.168.1.10",
      "can_forward": false
    },
    {
      "id": "fw-core",
      "name": "Core Enterprise Firewall",
      "type": "firewall",
      "zone": "SECURITY",
      "ip": "10.0.0.1",
      "can_forward": true,
      "default_action": "DENY"
    },
    {
      "id": "db-prod-01",
      "name": "Customer Database Server",
      "type": "database",
      "zone": "DATA",
      "ip": "10.0.3.50",
      "can_forward": false
    }
  ],
  "connections": [
    {"source": "dmz-web-01", "target": "fw-core", "bidirectional": true},
    {"source": "fw-core", "target": "db-prod-01", "bidirectional": true}
  ],
  "firewall_rules": [
    {
      "id": "FW-CORE-003",
      "device_id": "fw-core",
      "action": "ALLOW",
      "source_zone": "*",
      "destination_zone": "DATA",
      "source_ip": "*",
      "destination_ip": "10.0.3.0/24",
      "protocol": "TCP",
      "port": 5432,
      "priority": 300,
      "enabled": true,
      "description": "Legacy permissive rule"
    }
  ],
  "access_policies": [
    {
      "id": "POL-DMZ-DB-ISOLATION",
      "name": "DMZ to Database Isolation",
      "description": "Direct communication from DMZ to DATA zone is strictly prohibited.",
      "source": "dmz-web-01",
      "destination": "db-prod-01",
      "protocol": "TCP",
      "port": 5432,
      "expected_verdict": "DENY",
      "required": false,
      "severity": "CRITICAL"
    }
  ]
}
```

#### Example Response Body (`200 OK`):
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
      "discovered_path": [
        "dmz-web-01",
        "fw-core",
        "db-prod-01"
      ],
      "supporting_rule_ids": [
        "FW-CORE-003"
      ],
      "violated_policy_id": "POL-DMZ-DB-ISOLATION",
      "severity": "CRITICAL",
      "description": "Unintended trust path discovered from dmz-web-01 to db-prod-01 via path [dmz-web-01 -> fw-core -> db-prod-01] on TCP:5432. Permitted by rules: ['FW-CORE-003'].",
      "status": "DETECTED"
    }
  ],
  "execution_mode": "DETERMINISTIC_GRAPH"
}
```

---

### 3.4. AI Root Cause Explanation — `POST /explain`
Sends a verified finding to the NVIDIA Nemotron AI reasoning model to explain the security risk and generate a structured least-privilege remediation proposal.

#### Example Request Body:
```json
{
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
    "description": "Unintended trust path discovered...",
    "status": "DETECTED"
  },
  "network_summary": {"name": "Enterprise Production Hybrid Cloud"}
}
```

#### Example Response Body (`200 OK`):
```json
{
  "finding_id": "FINDING-POL-DMZ-DB-ISOLATION-1",
  "explanation": "Rule FW-CORE-003 permits TCP:5432 transit from the DMZ web host to the database server, bypassing network segmentation.",
  "root_cause": "Wildcard source_zone in rule FW-CORE-003 grants unrestricted access to the sensitive database subnet.",
  "proposed_remediation": {
    "proposal_id": "PROP-FIX-1",
    "target_rule_id": "FW-CORE-003",
    "target_device_id": "fw-core",
    "operation": "DISABLE_RULE",
    "rule_spec": null,
    "rationale": "Disabling rule FW-CORE-003 eliminates the unauthorized DMZ-to-DB path while maintaining least privilege.",
    "expected_impact": "Blocks unauthorized transit on port 5432. Legitimate application traffic remains governed by specific rules."
  },
  "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "status": "ANALYZED_LLM",
  "error": null
}
```

---

### 3.5. Safe In-Memory Simulation — `POST /simulate-fix`
Applies the remediation proposal **strictly to a deep copy** of the network in memory. The original model remains completely unmodified.

#### Example Request Body:
```json
{
  "network": { "...complete NetworkModel object..." },
  "proposal": {
    "proposal_id": "PROP-FIX-1",
    "target_rule_id": "FW-CORE-003",
    "target_device_id": "fw-core",
    "operation": "DISABLE_RULE",
    "rule_spec": null,
    "rationale": "Disabling rule FW-CORE-003 enforces least privilege.",
    "expected_impact": "Blocks unauthorized path."
  }
}
```

#### Example Response Body (`200 OK`):
```json
{
  "status": "SIMULATED",
  "changes_applied": [
    "DISABLED rule FW-CORE-003 on device fw-core."
  ],
  "simulated_network": { "...modified copy of NetworkModel..." },
  "message": "Proposed remediation successfully simulated on isolated network copy."
}
```

---

### 3.6. Independent Deterministic Verification — `POST /verify`
Evaluates the simulated network copy against the 3 deterministic zero trust assertions:

1. **`original_violation_resolved`**: Is the ghost path between `source` and `destination` completely closed?
2. **`legitimate_paths_intact`**: Are required legitimate business paths (e.g. App to DB, Admin SSH) still functional?
3. **`new_violations_count`**: Did the change inadvertently introduce any new policy violations?

#### Example Request Body:
```json
{
  "simulated_network": { "...modified copy of NetworkModel..." },
  "original_violation": { "...finding object..." },
  "policies": null
}
```

#### Example Response Body (`200 OK`):
```json
{
  "verdict": "PASS",
  "original_violation_resolved": true,
  "legitimate_paths_intact": true,
  "new_violations_count": 0,
  "checks": [
    {
      "policy_id": "POL-DMZ-DB-ISOLATION",
      "check_type": "ORIGINAL_VIOLATION_RESOLVED",
      "verdict": "PASS",
      "details": "Original violation resolved: Unintended path between dmz-web-01 and db-prod-01 is closed."
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

### 3.7. Complete Autonomous Agent Workflow — `POST /agent/run`
Executes the entire automated loop in a single request:  
**Detect → Investigate → Explain → Recommend → Simulate → Verify**

> **CRITICAL PAYLOAD NOTICE:** Unlike `POST /analyze`, `POST /agent/run` **requires** wrapping the network model in a `{"network": ...}` JSON object.

#### Example Request Body:
```json
{
  "network": { "...complete NetworkModel object..." }
}
```

#### Example Response Body (`200 OK`):
```json
{
  "status": "COMPLETED",
  "total_findings": 1,
  "selected_finding": {
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
  },
  "explanation": {
    "finding_id": "FINDING-POL-DMZ-DB-ISOLATION-1",
    "explanation": "Rule FW-CORE-003 permits TCP:5432...",
    "root_cause": "Wildcard source_zone in rule FW-CORE-003...",
    "proposed_remediation": {
      "proposal_id": "PROP-FIX-1",
      "target_rule_id": "FW-CORE-003",
      "target_device_id": "fw-core",
      "operation": "DISABLE_RULE",
      "rule_spec": null,
      "rationale": "Disabling FW-CORE-003 enforces least privilege.",
      "expected_impact": "Blocks unauthorized path."
    },
    "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
    "status": "ANALYZED_LLM",
    "error": null
  },
  "simulation": {
    "status": "SIMULATED",
    "changes_applied": ["DISABLED rule FW-CORE-003 on device fw-core."],
    "message": "Proposed remediation successfully simulated on isolated network copy."
  },
  "verification": {
    "verdict": "PASS",
    "original_violation_resolved": true,
    "legitimate_paths_intact": true,
    "new_violations_count": 0,
    "checks": [ "...assertion checks..." ],
    "message": "Verification SUCCESS: Remediation resolved violation without breaking legitimate traffic."
  },
  "steps": [
    {
      "step_name": "1. Deterministic Detection",
      "status": "SUCCESS",
      "details": {"engine": "DeterministicNetworkXReferenceEngine", "total_violations_found": 1}
    },
    {
      "step_name": "2. AI Explanation & Recommendation",
      "status": "SUCCESS",
      "details": {"model_used": "nvidia/nemotron-3.5-lightning-30b-a3b", "status": "ANALYZED_LLM", "operation": "DISABLE_RULE"}
    },
    {
      "step_name": "3. Safe In-Memory Simulation",
      "status": "SUCCESS",
      "details": {"status": "SIMULATED", "changes_applied": ["DISABLED rule FW-CORE-003 on device fw-core."]}
    },
    {
      "step_name": "4. Independent Deterministic Verification",
      "status": "SUCCESS",
      "details": {"verdict": "PASS", "original_resolved": true, "legitimate_paths_intact": true}
    }
  ],
  "final_summary": "Investigation finished with verdict: PASS. Verification SUCCESS: Remediation resolved violation without breaking legitimate traffic."
}
```

---

## 4. Frontend Visual Mapping Guidelines

### 4.1. Cytoscape.js Graph Visualization
Convert `network.devices` and `network.connections` to Cytoscape elements:
```javascript
// Mapping devices to Cytoscape nodes
const cyNodes = network.devices.map(device => ({
  data: {
    id: device.id,
    label: `${device.name}\n(${device.ip || device.zone})`,
    zone: device.zone,
    type: device.type
  },
  classes: `zone-${device.zone.toLowerCase()}`
}));

// Mapping connections to Cytoscape edges
const cyEdges = network.connections.map(conn => ({
  data: {
    id: `${conn.source}-${conn.target}`,
    source: conn.source,
    target: conn.target
  }
}));
```

### 4.2. Highlighting the Ghost Route
When an `AnalysisFinding` is returned:
1. Extract `finding.discovered_path` (e.g. `["dmz-web-01", "fw-core", "db-prod-01"]`).
2. Add a highlighted class to each participating node:
   ```javascript
   finding.discovered_path.forEach(deviceId => {
     cy.getElementById(deviceId).addClass('ghost-route-node');
   });
   ```
3. Highlight edges connecting adjacent hops in the path:
   ```javascript
   for (let i = 0; i < finding.discovered_path.length - 1; i++) {
     const u = finding.discovered_path[i];
     const v = finding.discovered_path[i + 1];
     cy.elements(`edge[source="${u}"][target="${v}"], edge[source="${v}"][target="${u}"]`).addClass('ghost-route-edge');
   }
   ```
4. Style suggestions:
   - Node: Red border (`#ef4444`, 4px), pulsating glow.
   - Edge: Dashed red line (`#ef4444`, 5px) with directional flow animation.

### 4.3. Rendering Severity Badges
Use `finding.severity`:
- `CRITICAL`: Red (`#ef4444`)
- `HIGH`: Orange (`#f97316`)
- `MEDIUM`: Amber (`#f59e0b`)
- `LOW`: Blue (`#3b82f6`)

### 4.4. Rendering Verification Badges
In the verification panel, show 3 status indicators:
- **Condition 1 (Ghost Path Severed):** `verification.original_violation_resolved === true` (`PASS` in green / `FAIL` in red).
- **Condition 2 (Legitimate Traffic Intact):** `verification.legitimate_paths_intact === true` (`PASS` in green / `FAIL` in red).
- **Condition 3 (Zero Regressions):** `verification.new_violations_count === 0` (`PASS` in green / `FAIL` in red).
- **Overall Verdict Badge:** `verification.verdict` (`PASS`, `FAIL`, or `INCONCLUSIVE`).

---

## 5. Error Handling & Fallbacks

### 5.1. Validation Errors (`HTTP 422`)
If a request contains malformed network definitions (e.g. dangling connections, invalid CIDRs, or bad port numbers), the API returns HTTP 422:
```json
{
  "detail": {
    "message": "Network validation failed before graph analysis",
    "errors": [
      "Connection references unknown target device 'nonexistent-host'",
      "Firewall rule 'FW-01' has invalid CIDR '999.999.0.1/35'"
    ]
  }
}
```
**Frontend action:** Render an error banner displaying the list of strings in `detail.errors`.

### 5.2. Offline Demo Fallback Mode
If NVIDIA Nemotron API access is unavailable or `NVIDIA_API_KEY` is omitted:
- `response.explanation.status` will be `"DEMO_FALLBACK"`.
- `response.explanation.model_used` will be `"deterministic-demo-fallback"`.
- The backend continues executing deterministically without throwing an HTTP 500 error.
- **Frontend action:** Display an "Offline Fallback" badge next to the AI explanation so the user knows deterministic demo mode is active.

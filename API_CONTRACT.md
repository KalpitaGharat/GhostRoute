# GhostRoute AI — API Contract & Integration Guide

**Document Version:** 1.0.0  
**Backend Base URL:** `http://localhost:8000`  
**Protocol:** REST over HTTP / JSON  
**CORS:** Enabled (`allow_origins=["*"]`)  

---

## 1. Overview & Architecture

GhostRoute AI operates on a simulation-first zero trust verification loop:
```
[1. DETECT]   ──>   [2. INVESTIGATE & EXPLAIN]   ──>   [3. RECOMMEND]   ──>   [4. SIMULATE]   ──>   [5. VERIFY]
Deterministic       Deterministic Evidence +            Allowlisted            In-Memory             Independent Graph
Graph Reachability  NVIDIA Nemotron Reasoner           Operation Spec         Deep-Copy Only        Verification Engine
```

### Team Separation of Concerns
- **Backend & AI Agent (Aayushman):** FastAPI service, Pydantic data schemas, NVIDIA Nemotron integration, safety validation, in-memory simulation, and deterministic verification.
- **Network Graph Engine (Neev):** Multi-hop forwarding, CIDR subnet matching, port range intersection, and NetworkX reachability algorithms in `backend/graph_adapter.py`.
- **Frontend Dashboard (Kalpita):** Cytoscape.js interactive topology graph, path highlighting, stage-by-stage workflow stepper, and verification condition cards.

---

## 2. API Endpoints Summary

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Service identity and status | _None_ | `{"name": "...", "status": "running"}` |
| `GET` | `/health` | Health check probe | _None_ | `{"status": "healthy", "service": "..."}` |
| `GET` | `/dashboard` | Interactive Cytoscape.js Security Dashboard | _None_ | `HTML / Cytoscape UI` |
| `GET` | `/network/sample` | Default sample network model | _None_ | `NetworkModel` |
| `POST` | `/analyze` | Deterministic graph reachability analysis | `NetworkModel` | `AnalyzeResponse` |
| `POST` | `/explain` | AI explanation & structured proposal | `ExplainRequest` | `ExplainResponse` |
| `POST` | `/simulate-fix` | Apply proposal strictly to a deep-copy | `SimulateFixRequest` | `SimulateFixResponse` |
| `POST` | `/verify` | Independent 3-condition verification | `VerifyRequest` | `VerifyResponse` |
| `POST` | `/agent/run` | Full 6-stage autonomous investigation | `AgentWorkflowRequest` | `AgentWorkflowResponse` |

---

## 3. Endpoints Specification

### 3.1. `GET /` & `GET /health`
Used for dashboard readiness polling and service heartbeat.

#### Example Response (`GET /health`):
```json
{
  "status": "healthy",
  "service": "ghostroute-backend"
}
```

---

### 3.1b. `GET /network/sample`
Returns the complete default enterprise network model (`data/network.json`) for immediate dashboard rendering and analysis without requiring manual file uploads.

#### Response Body (`NetworkModel`):
Returns the complete `NetworkModel` containing:
- `devices`: List of 5 network devices (`dmz-web-01`, `fw-core`, `app-server-01`, `db-prod-01`, `jumpbox-admin`).
- `connections`: List of 6 bidirectional physical links.
- `firewall_rules`: List of 4 rules, including `FW-CORE-003` (the ghost route rule).
- `access_policies`: List of 3 policies (`POL-DMZ-DB-ISOLATION`, `POL-APP-DB-ALLOWED`, `POL-ADMIN-SSH-ALLOWED`).

---

### 3.2. `POST /analyze`
Runs deterministic graph traversal against all defined `access_policies`. Identifies unauthorized communication paths (Ghost Routes) where a policy requires `DENY` but a path is reachable via permissive firewall rules.

#### Request Body (`NetworkModel`):
```json
{
  "id": "enterprise-net-01",
  "name": "Enterprise Multi-Zone Network",
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
      "name": "Customer Database",
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
      "description": "Ghost Route: Overly permissive legacy rule"
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

#### Response Body (`AnalyzeResponse`):
```json
{
  "model_name": "Enterprise Multi-Zone Network",
  "total_violations": 1,
  "findings": [
    {
      "id": "FINDING-POL-DMZ-DB-ISOLATION",
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
      "description": "Security policy POL-DMZ-DB-ISOLATION violated: Path dmz-web-01 -> fw-core -> db-prod-01 is reachable via rules FW-CORE-003, but expected verdict is DENY.",
      "status": "DETECTED"
    }
  ],
  "execution_mode": "DETERMINISTIC_GRAPH"
}
```

---

### 3.3. `POST /explain`
Sends a verified finding to the NVIDIA Nemotron AI reasoning model to explain the security risk and propose a structured, least-privilege remediation.

> **Fallback Guarantee:** If the NVIDIA API key is missing or the external API call fails or times out, the backend automatically provides a deterministic fallback with `status: "DEMO_FALLBACK"` and `model_used: "deterministic-demo-fallback"`.

#### Request Body (`ExplainRequest`):
```json
{
  "finding": {
    "id": "FINDING-POL-DMZ-DB-ISOLATION",
    "source": "dmz-web-01",
    "destination": "db-prod-01",
    "protocol": "TCP",
    "port": 5432,
    "discovered_path": ["dmz-web-01", "fw-core", "db-prod-01"],
    "supporting_rule_ids": ["FW-CORE-003"],
    "violated_policy_id": "POL-DMZ-DB-ISOLATION",
    "severity": "CRITICAL",
    "description": "Unauthorized reachability between DMZ and DB",
    "status": "DETECTED"
  }
}
```

#### Response Body (`ExplainResponse`):
```json
{
  "finding_id": "FINDING-POL-DMZ-DB-ISOLATION",
  "explanation": "Rule FW-CORE-003 uses a wildcard source zone that mistakenly permits inbound traffic from the DMZ directly into the protected DATA tier.",
  "root_cause": "Overly broad wildcard source zone in FW-CORE-003 bypasses network segmentation boundaries.",
  "proposed_remediation": {
    "proposal_id": "PROP-FIX-01",
    "target_rule_id": "FW-CORE-003",
    "target_device_id": "fw-core",
    "operation": "DISABLE_RULE",
    "rule_spec": null,
    "rationale": "Disabling FW-CORE-003 immediately severs the unintended ghost path while preserving legitimate application-to-database rules.",
    "expected_impact": "Blocks DMZ -> DB transit. Legitimate app tier access is preserved by rule FW-CORE-001."
  },
  "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "status": "ANALYZED_LLM",
  "error": null
}
```

---

### 3.4. `POST /simulate-fix`
Simulates the remediation proposal **strictly in memory** on a deep copy of the network model. The original network is guaranteed to remain untouched.

#### Allowlisted Operations (`RemediationOperation`):
- `DISABLE_RULE`: Sets `enabled = False` on `target_rule_id`.
- `DELETE_RULE`: Removes `target_rule_id` from the device.
- `ADD_RULE`: Appends a new `FirewallRule` from `rule_spec`.
- `UPDATE_RULE`: Replaces `target_rule_id` configuration with `rule_spec`.

#### Response Body (`SimulateFixResponse`):
```json
{
  "status": "SIMULATED",
  "changes_applied": [
    "Disabled rule 'FW-CORE-003' on device 'fw-core'."
  ],
  "simulated_network": { "...updated deep copy of network..." },
  "message": "Remediation applied successfully to simulated network copy. Ready for verification."
}
```

---

### 3.5. `POST /verify`
Performs an independent deterministic verification of the simulated network. It checks all three critical zero trust conditions:

1. **`original_violation_resolved`**: Is the unauthorized ghost path completely severed?
2. **`legitimate_paths_intact`**: Are all business-critical policies (`required: true`, `expected: ALLOW`) still reachable?
3. **`new_violations_count`**: Did the change inadvertently introduce any new policy violations?

#### Response Body (`VerifyResponse`):
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
      "details": "Original path dmz-web-01 -> db-prod-01 is successfully blocked."
    },
    {
      "policy_id": "POL-APP-DB-ALLOW",
      "check_type": "LEGITIMATE_PATH_INTACT",
      "verdict": "PASS",
      "details": "Required legitimate path app-srv-01 -> db-prod-01 remains intact."
    },
    {
      "policy_id": "GLOBAL",
      "check_type": "NO_NEW_VIOLATIONS",
      "verdict": "PASS",
      "details": "No new policy violations introduced."
    }
  ],
  "message": "All verification assertions passed: original violation resolved, legitimate paths intact, zero new violations."
}
```

---

### 3.6. `POST /agent/run`
Executes the full, automated end-to-end loop in a single request:
**Detect → Investigate → Explain → Recommend → Simulate → Verify**

#### Request Body (`AgentWorkflowRequest`):
```json
{
  "network": { "...complete NetworkModel object..." }
}
```

#### Response Body (`AgentWorkflowResponse`):
```json
{
  "status": "COMPLETED",
  "total_findings": 1,
  "selected_finding": { "...AnalysisFinding..." },
  "explanation": { "...ExplainResponse..." },
  "simulation": { "...SimulateFixResponse..." },
  "verification": { "...VerifyResponse..." },
  "steps": [
    {
      "step_name": "1. Deterministic Detection",
      "status": "SUCCESS",
      "details": {"engine": "DeterministicNetworkXEngine", "total_violations_found": 1}
    },
    {
      "step_name": "2. AI Explanation & Recommendation",
      "status": "SUCCESS",
      "details": {"model_used": "nvidia/nemotron-3.5-lightning-30b-a3b", "status": "ANALYZED_LLM"}
    },
    {
      "step_name": "3. Safe In-Memory Simulation",
      "status": "SUCCESS",
      "details": {"changes_applied": ["Disabled rule 'FW-CORE-003' on device 'fw-core'."]}
    },
    {
      "step_name": "4. Independent Deterministic Verification",
      "status": "SUCCESS",
      "details": {"verdict": "PASS", "original_resolved": true, "legitimate_paths_intact": true}
    }
  ],
  "final_summary": "Investigation finished with verdict: PASS. All verification assertions passed."
}
```

---

## 4. Error Handling & Validation Contracts

All input payloads are validated by Pydantic and pre-analysis validation rules before any graph algorithm or LLM call is executed.

If a request contains invalid network structures (e.g., non-existent device reference, invalid CIDR subnet, or malformed port), the API responds with **HTTP 422 Unprocessable Entity**:

```json
{
  "detail": {
    "message": "Network validation failed before graph analysis",
    "errors": [
      "Connection references unknown target device 'db-ghost-99'",
      "Firewall rule 'FW-TEST-01' has invalid CIDR '999.0.0.1/35'"
    ]
  }
}
```

---

## 5. Frontend Dashboard Integration Guide (Kalpita)

### Step 1: Initialize Cytoscape.js Elements
Convert `network.devices` and `network.connections` into Cytoscape nodes and edges:
```javascript
const elements = [
  // Nodes
  ...network.devices.map(d => ({
    data: {
      id: d.id,
      label: `${d.name}\n(${d.ip || d.zone})`,
      type: d.type,
      zone: d.zone
    },
    classes: `zone-${d.zone.toLowerCase()} type-${d.type}`
  })),
  // Edges
  ...network.connections.map(c => ({
    data: {
      id: `${c.source}-${c.target}`,
      source: c.source,
      target: c.target
    }
  }))
];
```

### Step 2: Highlight the Ghost Route
When an `AnalysisFinding` is returned from `/analyze` or `/agent/run`:
- Extract `finding.discovered_path` (e.g., `["dmz-web-01", "fw-core", "db-prod-01"]`).
- Style the participating nodes with a glowing red border (`border-color: #ff3366`, `border-width: 3px`).
- Style the traversed edges with a dashed red line and animated flow effect.
- Render a sidebar card showing:
  - **Violated Policy:** `finding.violated_policy_id`
  - **Severity:** Badge with `finding.severity` (e.g. `CRITICAL` in bright red)
  - **Supporting Rule:** `finding.supporting_rule_ids[0]`

### Step 3: Display the 6 Investigation Stages
Track and render progress using `response.steps`:
1. `1. Deterministic Detection`: Show count of violations detected.
2. `2. AI Explanation & Recommendation`: Render `explanation.explanation`, `explanation.root_cause`, and `proposed_remediation`. If `status === "DEMO_FALLBACK"`, display an informative "Offline Fallback" badge.
3. `3. Safe In-Memory Simulation`: Show diff chips for `simulation.changes_applied`.
4. `4. Independent Deterministic Verification`: Display three pass/fail status pills:
   - `[✔] Ghost Path Severed` (`original_violation_resolved === true`)
   - `[✔] Business Continuity Maintained` (`legitimate_paths_intact === true`)
   - `[✔] Zero Regression` (`new_violations_count === 0`)

---

## 6. Graph Engine Extension Guide (Neev)

The graph engine interface is defined in `backend/graph_adapter.py`.
To extend reachability logic:
1. Subclass `DeterministicGraphEngine` or modify methods in `DeterministicNetworkXEngine`.
2. Keep the following deterministic rules intact:
   - **Default-Deny:** If a packet hits a firewall with no matching rules, default action is `RuleAction.DENY`.
   - **Forwarding Constraints:** Intermediate transit hops require `device.is_forwarding_capable() == True`.
   - **Port Range Intersections:** `80-443` matches requests within that inclusive numerical interval.
   - **CIDR Matching:** Subnets are matched using standard Python `ipaddress.ip_network`.
3. All graph algorithms must run purely locally without external network dependencies.

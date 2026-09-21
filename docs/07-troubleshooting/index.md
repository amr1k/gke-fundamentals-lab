# Module 7: Troubleshooting & Observability

Even well-architected Kubernetes platforms encounter network anomalies: misconfigured Gateway routes, unsynchronized NEGs, DNS lookup delays, or restrictive network policies dropping valid packets.

This module provides a diagnostic runbook for GKE networking.

---

## 🎯 Objectives

1. **Gateway API Diagnostics**: Interpret Gateway and HTTPRoute condition statuses (`Programmed`, `Accepted`, `ResolvedRefs`).
2. **NEG & Load Balancer Debugging**: Diagnose why an endpoint is marked unhealthy by Google Cloud load balancer health checks.
3. **Datapath v2 Flow Logs**: Inspect Cilium eBPF packet drop counters and flow logs.
4. **Interactive Network Diagnostic Pod**: Deploy a network toolbox pod equipped with `tcpdump`, `mtr`, `iperf3`, `curl`, and `dig`.

---

## 🛠️ The GKE Network Troubleshooting Flowchart

```mermaid
flowchart TD
    Start["Issue: Workload Unreachable via Gateway / Service"] --> CheckGW{"Is it exposed via Gateway API?"}

    CheckGW -->|Yes| InspectGW["Run: kubectl describe gateway\n& kubectl describe httproute"]
    InspectGW --> CondReady{"Condition Accepted & Programmed == True?"}
    CondReady -->|No| FixGWRoute["Fix missing ReferenceGrant,\nproxy-subnet, or invalid port"]
    CondReady -->|Yes| CheckNEG{"Check NEG Status:\nkubectl get svc -o yaml"}

    CheckNEG --> CheckHealth{"Are endpoints healthy in GCP?\ngcloud compute backend-services get-health"}
    CheckHealth -->|No| FixAppHealth["Check container readinessProbe,\napp port mismatch, or firewall rule"]
    CheckHealth -->|Yes| CheckNetPol{"Inspect NetworkPolicies:\nIs proxy-subnet (10.40.0.0/24) allowed?"}

    CheckGW -->|"No (Internal ClusterIP or DNS)"| CheckDNS["Test DNS: nslookup svc.ns\n& check /etc/resolv.conf"]
    CheckDNS --> CheckeBPF["Inspect anetd logs:\nkubectl logs -n kube-system -l k8s-app=cilium"]
```

---

## 📂 Module Steps

1. [**Diagnostic Guide & Production Runbook**](01-diagnostics-guide.md)


# Module 5: Advanced Traffic Management & Deployment Strategies

Deploying application updates to production without downtime or customer impact is one of the highest priorities of enterprise Platform Engineering.

In legacy environments, canary deployments required complex service meshes (Istio/Linkerd) or bespoke ingress controller annotations. With the **Kubernetes Gateway API**, sophisticated traffic management is natively supported by the data plane.

---

## 🎯 Objectives

In this module, you will master four production deployment strategies:

1. [**Canary Deployments**](01-canary-deployments.md): Split traffic proportionally using weights (e.g. 90% to stable `v1`, 10% to canary `v2`), progressively ramping up traffic.
2. [**A/B Testing & Header Routing**](02-ab-testing.md): Route requests based on HTTP headers (e.g., `X-Beta-Feature: true`), cookies, or query parameters.
3. [**Blue/Green Deployments**](03-blue-green.md): Run two identical production environments side-by-side, test the new Green release via dedicated private header/path, and perform an instant, atomic cutover with zero downtime and instant rollback capability.
4. [**Traffic Mirroring (Shadowing)**](04-traffic-mirroring.md): Duplicate live production requests and send an asynchronous copy to a "dark" version of the service to test performance and stability under real traffic without risk.

---

## 🧭 Strategy Comparison Matrix

| Strategy | How it Works | Primary Use Case | Risk Level | Rollback Speed |
| :--- | :--- | :--- | :--- | :--- |
| **Canary** | Percentage-based traffic weighting (`weight: 90/10`) | Validating error rates, memory leaks, and CPU load on small subset of users | Low | Fast (adjust weight) |
| **A/B Testing** | Conditional routing via HTTP headers/cookies | Testing experimental features with specific internal testers or beta users | Very Low | Instant (header removal) |
| **Blue/Green** | 100% atomic switch between two isolated environments | Major database/API schema changes requiring zero downtime | Low | Instant (flip backendRef) |
| **Traffic Mirroring** | Duplicate request sent out-of-band | Verifying latency, scale, and compatibility of experimental code | Zero (read-only) | Immediate |

---

## 📂 Module Steps

1. [**Step 1: Canary Deployments**](01-canary-deployments.md)
2. [**Step 2: A/B Testing & Header Routing**](02-ab-testing.md)
3. [**Step 3: Blue/Green Deployments**](03-blue-green.md)
4. [**Step 4: Traffic Mirroring (Shadowing)**](04-traffic-mirroring.md)


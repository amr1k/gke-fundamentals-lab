# Step 1: ClusterIP & Headless Services

In Kubernetes, **Services** provide a stable abstraction over a set of dynamically created and destroyed Pods.

---

## 1. ClusterIP Architecture

A `ClusterIP` service allocates a stable virtual IP (VIP) from the `gke-services` secondary range (`10.30.0.0/20`).

Important characteristics:
- The ClusterIP VIP does **not** exist on any physical network interface or ARP table.
- When client pods connect to the ClusterIP, **Datapath v2 (eBPF)** intercepts the packet at the socket or traffic control layer and immediately translates the destination IP to one of the backing Pod IP addresses.

---

## 2. Headless Service Architecture (`clusterIP: None`)

A **Headless Service** explicitly sets `spec.clusterIP: None`.
- No virtual IP is allocated.
- Datapath v2 does not load balance connections.
- Instead, the Kubernetes DNS server directly creates `A` records that resolve to the individual Pod IPs backing the service.
- When paired with a **StatefulSet**, each Pod receives a deterministic, predictable DNS hostname:
  ```
  <pod-name>.<service-name>.<namespace>.svc.cluster.local
  ```
  Example: `stateful-db-0.database-headless.services-lab.svc.cluster.local`.

---

## 3. Hands-on Deployment

> [!TIP]
> Ensure you are in the root of the cloned repository (`cd gke-fundamentals-lab`) so that `manifests/` resolves properly. If you haven't cloned the repository yet, run:
> ```bash
> git clone https://github.com/amr1k/gke-fundamentals-lab.git
> cd gke-fundamentals-lab
> ```

Apply the manifests located in `manifests/03-services/clusterip-and-headless.yaml`:

```bash
kubectl apply -f manifests/03-services/clusterip-and-headless.yaml
```

Wait for the deployments and statefulset to become ready:

```bash
kubectl rollout status deployment/web-api -n services-lab
kubectl rollout status statefulset/stateful-db -n services-lab
```

---

## 4. Testing ClusterIP

Inspect the allocated ClusterIP:

```bash
kubectl get svc web-api-clusterip -n services-lab
```

**Expected Output:**
```
NAME                 TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
web-api-clusterip    ClusterIP   10.30.5.42    <none>        80/TCP    2m
```

Test access from the `dnsutils` pod (from Module 2):

```bash
kubectl exec -n fundamentals-lab -it dnsutils -- curl -s http://web-api-clusterip.services-lab.svc.cluster.local
```

You will receive an HTTP 200 response with request headers and backend Pod information.

---

## 5. Testing Headless Service & Direct StatefulSet Discovery

Inspect the headless service:

```bash
kubectl get svc database-headless -n services-lab
```

Notice that `CLUSTER-IP` is listed as `None`.

### 5.1 Query Headless Service DNS
Query the headless service from `dnsutils`:

```bash
kubectl exec -n fundamentals-lab -it dnsutils -- nslookup database-headless.services-lab.svc.cluster.local
```

**Expected Output:**
```
Server:    10.30.0.10
Address 1: 10.30.0.10 kube-dns.kube-system.svc.cluster.local

Name:      database-headless.services-lab.svc.cluster.local
Address 1: 10.20.1.6 stateful-db-0.database-headless.services-lab.svc.cluster.local
Address 2: 10.20.0.8 stateful-db-1.database-headless.services-lab.svc.cluster.local
Address 3: 10.20.2.7 stateful-db-2.database-headless.services-lab.svc.cluster.local
```

Instead of a single virtual IP, DNS returns the individual Pod IPs of all replicas!

### 5.2 Deterministic Pod Addressing
Test addressing an individual StatefulSet instance:

```bash
kubectl exec -n fundamentals-lab -it dnsutils -- nslookup stateful-db-0.database-headless.services-lab.svc.cluster.local
```

**Expected Output:**
```
Name:      stateful-db-0.database-headless.services-lab.svc.cluster.local
Address 1: 10.20.1.6
```

This capability is essential for distributed stateful systems such as PostgreSQL clusters (primary/standby replication), Apache Kafka brokers, and Elasticsearch nodes.

---

## ⏭️ Next Step
Proceed to [**Step 2: Internal TCP/UDP Load Balancing**](02-internal-lb.md) to expose services to other clients in your VPC at Layer 4.


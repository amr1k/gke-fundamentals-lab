# Module 1: Enterprise Cluster Setup

In this module, you will design and provision the enterprise networking foundation and spin up a production-grade private Google Kubernetes Engine (GKE) cluster.

---

## 🎯 Objectives

1. Create a custom Google Cloud Virtual Private Cloud (VPC) network.
2. Configure primary subnet CIDRs and secondary IP alias ranges for GKE Pods and Services.
3. Configure a **Proxy-Only Subnet** required by Google Cloud Internal Application Load Balancers (Envoy proxies for Gateway API).
4. Deploy a **Cloud Router** and **Cloud NAT** to allow private worker nodes and pods to securely access the public internet (for image pulls and external APIs) without possessing public IP addresses.
5. Provision a **Private GKE Cluster** with Datapath v2 (eBPF/Cilium), Gateway API, Workload Identity, Shielded GKE Nodes, and Private Master Endpoint.
6. Configure access to the cluster using Master Authorized Networks or an IAP-tunneled bastion host.
7. Understand and deploy multi-project **Enterprise Shared VPC** architecture, service agents, and automated firewall provisioning.

---

## 📐 Architecture Blueprint

```mermaid
flowchart TD
    subgraph VPC["VPC: gke-enterprise-vpc"]
        direction TB
        subgraph SubnetNodes["Subnet: gke-nodes-subnet (10.10.0.0/20)"]
            Node1["Worker Node 1\n(Private IP 10.10.0.2)"]
            Node2["Worker Node 2\n(Private IP 10.10.0.3)"]
        end

        subgraph SecondaryRanges["Secondary IP Ranges (VPC-Native)"]
            PodRange["Pod Range: gke-pods\n10.20.0.0/16 (65,536 IPs)"]
            SvcRange["Service Range: gke-services\n10.30.0.0/20 (4,096 IPs)"]
        end

        subgraph ProxySubnet["Proxy-Only Subnet: gke-proxy-subnet\n10.40.0.0/24 (Envoy)"]
            Proxy["GCP Internal Envoy Proxies"]
        end

        CloudRouter["Cloud Router (gke-router)"]
        CloudNAT["Cloud NAT (gke-nat)"]
        CloudRouter --- CloudNAT
        SubnetNodes -.->|Egress Only| CloudNAT
        CloudNAT -->|Egress to Internet| WWW((Public Internet))
    end

    subgraph ControlPlane["GKE Managed Control Plane (172.16.0.0/28)"]
        KubeMaster["Kubernetes API Server\n(Private Endpoint)"]
    end

    AuthorizedClient["Authorized Client / Bastion"] -->|kubectl access| KubeMaster
```

---

## 📂 Module Steps

Follow the steps in order:

1. [**Step 1: VPC, Subnets & Cloud NAT**](01-vpc-and-nat.md) - Configure custom network topology, IPAM ranges, and egress NAT.
2. [**Step 2: Provisioning Private GKE Cluster**](02-private-cluster.md) - Execute the comprehensive `gcloud` command to spin up the cluster with Datapath v2 and Gateway API.
3. [**Step 3: Cluster Access & Bastion Configuration**](03-access-and-bastion.md) - Configure Master Authorized Networks, IAP tunneling, and establish `kubectl` connectivity.
4. [**Step 4: Enterprise Shared VPC Deep Dive**](04-shared-vpc.md) - Host vs Service Project architecture, IAM service agents, least-privilege subnet sharing, and behind-the-scenes automation.


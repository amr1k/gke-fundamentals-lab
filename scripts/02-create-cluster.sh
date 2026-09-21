#!/usr/bin/env bash
# ==============================================================================
# Script: 02-create-cluster.sh
# Purpose: Provision Enterprise Private GKE Cluster with Datapath v2 & Gateway API
# ==============================================================================
set -euo pipefail

export PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
export REGION="${REGION:-us-central1}"
export ZONE="${ZONE:-us-central1-a}"
export CLUSTER_NAME="${CLUSTER_NAME:-gke-enterprise-lab}"
export VPC_NAME="${VPC_NAME:-gke-enterprise-vpc}"
export SUBNET_NAME="${SUBNET_NAME:-gke-nodes-subnet}"
export MASTER_CIDR="${MASTER_CIDR:-172.16.0.0/28}"
export MACHINE_TYPE="${MACHINE_TYPE:-e2-standard-4}"
export NUM_NODES="${NUM_NODES:-3}"

echo "============================================================"
echo " Provisioning Enterprise Private GKE Cluster"
echo " Cluster Name: ${CLUSTER_NAME}"
echo " Zone:         ${ZONE}"
echo " Datapath:     Datapath v2 (eBPF/Cilium)"
echo " Gateway API:  Standard"
echo "============================================================"

# Detect current IP for Master Authorized Networks
CLIENT_IP=$(curl -s https://ifconfig.me/ip || echo "")
if [[ -n "${CLIENT_IP}" ]]; then
    AUTH_NETWORKS="${CLIENT_IP}/32"
    echo "Detected client IP: ${CLIENT_IP} (adding to authorized networks)"
else
    AUTH_NETWORKS="0.0.0.0/0"
    echo "Warning: Could not detect client IP. You may need to manually update authorized networks."
fi

# Create Private Cluster
if ! gcloud container clusters describe "${CLUSTER_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Initiating cluster creation (this may take 5-7 minutes)..."
    gcloud container clusters create "${CLUSTER_NAME}" \
        --project="${PROJECT_ID}" \
        --zone="${ZONE}" \
        --machine-type="${MACHINE_TYPE}" \
        --num-nodes="${NUM_NODES}" \
        --network="${VPC_NAME}" \
        --subnetwork="${SUBNET_NAME}" \
        --cluster-secondary-range-name="gke-pods" \
        --services-secondary-range-name="gke-services" \
        --enable-ip-alias \
        --enable-private-nodes \
        --master-ipv4-cidr="${MASTER_CIDR}" \
        --enable-master-authorized-networks \
        --master-authorized-networks="${AUTH_NETWORKS}" \
        --enable-dataplane-v2 \
        --gateway-api=standard \
        --workload-pool="${PROJECT_ID}.svc.id.goog" \
        --enable-shielded-nodes \
        --enable-autorepair \
        --enable-autoupgrade \
        --release-channel=regular \
        --logging=SYSTEM,WORKLOAD \
        --monitoring=SYSTEM
else
    echo "Cluster ${CLUSTER_NAME} already exists. Skipping creation."
fi

# Fetch credentials
echo "Retrieving kubectl credentials..."
gcloud container clusters get-credentials "${CLUSTER_NAME}" \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}"

echo "============================================================"
echo " Cluster is READY!"
echo " Nodes:"
kubectl get nodes -o wide
echo "============================================================"
echo " GatewayClasses:"
kubectl get gatewayclasses
echo "============================================================"


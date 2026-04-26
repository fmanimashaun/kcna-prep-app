# KCNA Last-Mile Study Notes

Dense, exam-focused. Read once the night before, again the morning of. **TRAP** callouts mark the places people lose points.

> **Exam shape:** 60 multiple-choice questions, 90 minutes, pass mark **75%**.
> **Domain weights:** Kubernetes Fundamentals **46%** · Container Orchestration **22%** · Cloud Native Architecture **16%** · Observability **8%** · App Delivery **8%**.
> **Strategy:** spend the most time on Fundamentals. Read every option — KCNA trades on subtle distinctions (DaemonSet vs Deployment, ClusterIP vs NodePort, HPA vs VPA vs CA, Flannel vs Calico for policy, kube-proxy vs CNI traffic).
>
> **Method:** never memorize a term in isolation. If the question is "what is a Gauge?" you should be able to also state Counter / Histogram / Summary in the same breath — the wrong answers are usually one of the siblings.

---

## 1. Kubernetes Architecture & Fundamentals (46%)

### Control plane components

| Component | What it does | Notes that get tested |
|---|---|---|
| **kube-apiserver** | Front door for all reads/writes; only thing that talks to etcd. | Stateless, horizontally scalable. If it's down, nothing schedules. |
| **etcd** | Distributed key-value store; the **single source of truth** for cluster state. | Raft consensus. **Back up etcd, not the YAML.** |
| **kube-scheduler** | Picks a node for each Pending Pod (filter then score). | Doesn't *place* the Pod — it sets `spec.nodeName`. The kubelet does the rest. |
| **kube-controller-manager** | Runs the built-in controllers (Deployment, ReplicaSet, Node, Job, EndpointSlice…). | Each controller is a reconcile loop comparing desired ↔ actual. |
| **cloud-controller-manager** | Cloud-specific controllers (Node lifecycle, Service LB, Route). | Splits cloud-vendor code out of core. |

### Worker node components

| Component | What it does |
|---|---|
| **kubelet** | Reads PodSpecs from the API, talks to the container runtime via CRI, reports node + Pod status back. |
| **kube-proxy** | Programs the network so traffic to a **Service IP** reaches a backing Pod. Does **not** carry application Pod-to-Pod traffic — that goes through the CNI. |
| **Container runtime** | Runs the containers. Default is **containerd**. dockershim was **removed in 1.24** — Docker is no longer a supported runtime. |

### Every Kubernetes object — the required top-level fields

Every K8s object you write in YAML or JSON has the **same outer shape**. Four top-level fields:

| Field | Required? | What it is |
|---|---|---|
| **`apiVersion`** | ✅ | Which version of the API to use (`v1`, `apps/v1`, `networking.k8s.io/v1`). |
| **`kind`** | ✅ | What type of object (`Pod`, `Deployment`, `Service`, …). |
| **`metadata`** | ✅ | Name, **namespace** (lives *inside* metadata!), labels, annotations, owner refs, UID. |
| **`spec`** | ✅ for most objects | The **desired state** you want. ConfigMap/Secret use `data` instead. |
| `status` | ❌ (managed by the controller) | The current observed state. You don't write it; controllers update it. |

**TRAPS:**
- *"Which fields are required in every K8s YAML?"* → **`apiVersion`, `kind`, `metadata`**. (And `spec` for most objects, but the canonical three-field answer is the trio above.)
- **`namespace` is a sub-field of `metadata`**, not a top-level field. Watch options that put `namespace` next to `apiVersion` / `kind` — they're wrong shape.
- **`data` is only on ConfigMap and Secret** — not a generic top-level field. Watch options that pair `data` with `kind` / `metadata`.
- Don't confuse `apiVersion` with `kind`. apiVersion is the API group/version (`apps/v1`), kind is the resource type (`Deployment`).

```yaml
apiVersion: apps/v1     # ← required
kind: Deployment        # ← required
metadata:               # ← required
  name: web
  namespace: prod       # ← sub-field of metadata, not top-level!
  labels: { app: web }
spec:                   # ← required for most objects
  replicas: 3
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec: { containers: [{ name: web, image: nginx:1.27 }] }
```

### Request flow through the API server

Every API request travels through these stages **in order**. If any stage rejects, the request fails before persistence.

1. **Authentication** — *Who are you?* (TLS client certs, bearer tokens, OIDC, ServiceAccount tokens.)
2. **Authorization** — *What can you do?* (RBAC is the standard. ABAC, Node, Webhook also exist.)
3. **Admission control**
   - **Mutating** admission webhooks run first — they can *modify* the request (add labels, inject sidecars).
   - **Validating** admission webhooks run after — they can only accept or reject.
   - **Pod Security Admission (PSA)** is a built-in *validating* admission controller.
4. **Persistence** — only now does the object get written to **etcd**.

**TRAP:** mutating runs before validating. Mnemonic: **"Mutate first, validate second"** — fix the form before checking it.

### Scheduler: filter then score

| Phase | What it does | Examples |
|---|---|---|
| **Filtering (predicates)** | Eliminates nodes that *can't* host the Pod. | Insufficient CPU/RAM, taints without matching tolerations, NodeSelector mismatch, port conflict. |
| **Scoring (priorities)** | Ranks the surviving nodes; highest score wins; ties broken arbitrarily. | Pod/node affinity, image locality, resource balance, topology spread. |

Other scheduling controls you should recognize:

- **Taints** (on the node) repel Pods unless the Pod has a matching **toleration**.
- **NodeSelector** is a hard match on labels. **NodeAffinity** is the richer expression form.
- **PodAffinity** schedules near other Pods; **PodAntiAffinity** schedules far away.
- **TopologySpreadConstraints** distribute across zones/nodes.
- **PriorityClass** + **preemption**: a higher-priority pending Pod can evict a lower-priority running one.

### Pod lifecycle

**Phases (`status.phase`):** `Pending` → `Running` → `Succeeded` / `Failed` / `Unknown`.

**Conditions (`status.conditions`):**
- `PodScheduled` — node assigned.
- `Initialized` — all init containers finished.
- `ContainersReady` — all main containers passed readiness.
- `Ready` — Pod can serve traffic (used by Services).

**Init vs sidecar containers:**
- **Init containers** run **sequentially before** the main containers and must complete. Use for setup (db migrations, fetching config).
- **Sidecar containers** are now **first-class** (GA in 1.29) — they're init containers with `restartPolicy: Always` that stay up alongside the main container. Use for log shippers, mesh proxies.

**Lifecycle hooks:** `postStart` runs right after a container starts; `preStop` runs before SIGTERM (use it to drain connections). `terminationGracePeriodSeconds` (default 30s) is the SIGTERM-to-SIGKILL window.

### Workload controllers — all of them, side by side

| Resource | Use it when… | Watch out for |
|---|---|---|
| **Pod** | Almost never directly. Always wrap it. | Pods don't self-heal — that's the controller's job. |
| **ReplicaSet** | Almost never directly. Use Deployment. | Maintains a stable set of replicas. |
| **Deployment** | Stateless apps (web, API). | Owns ReplicaSets. Rolling update by default. |
| **StatefulSet** | Stable network IDs + persistent identity (DBs, Kafka, ZooKeeper). | Pods get ordinal names: `web-0`, `web-1`. Per-Pod PVC via `volumeClaimTemplates`. |
| **DaemonSet** | One Pod per node (log shipper, CNI, kube-proxy). | Bypasses the scheduler — runs on every matching node. |
| **Job** | Run-to-completion task. | Can run in parallel via `parallelism`/`completions`. |
| **CronJob** | Scheduled Job (cron expression). | Beware overlapping runs — set `concurrencyPolicy`. |

**TRAP:** *"Which workload guarantees one Pod per node?"* → **DaemonSet**, not Deployment with anti-affinity.

### Pod resource management & QoS classes — all 3 in one breath

Every container can declare:

| Field | What it means |
|---|---|
| **`requests`** | Reserved capacity. Used by the scheduler to pick a node. |
| **`limits`** | Hard ceiling. CPU is throttled past the limit; memory **OOM-kills** past it. |

Kubernetes assigns each Pod a **QoS class** based on those values:

| QoS class | Conditions | Eviction order under node pressure |
|---|---|---|
| **Guaranteed** | `requests == limits` for **every** container, **both** CPU and memory. | Last to be evicted. |
| **Burstable** | At least one container has a request set, but it's not Guaranteed. | Evicted before Guaranteed. |
| **BestEffort** | No requests or limits anywhere. | **First** to be evicted / OOM-killed. |

**Namespace-level controls:**

- **`LimitRange`** — sets default requests/limits and min/max per container in a namespace. Applied at admission.
- **`ResourceQuota`** — caps total namespace usage (e.g., max 100 Pods, 50 CPU, 100Gi memory, 5 PVCs).

**TRAP:** if a Pod has limits but no requests, Kubernetes copies the limit into the request. Result: it's **Guaranteed**, but its scheduling demand may be higher than you expected.

### Autoscaling — all 5 axes side by side

| Scaler | Scales | Trigger | When to use |
|---|---|---|---|
| **HPA (HorizontalPodAutoscaler)** | Pod **count** (replicas). | Metrics: CPU, memory, custom (Prometheus, external). Needs **metrics-server** for CPU/memory. | Burst traffic on stateless services. |
| **VPA (VerticalPodAutoscaler)** | Pod **resource requests** (CPU/RAM). | Observed usage over time. Modes: `Off` / `Initial` / `Recreate` / `Auto`. | Right-size workloads where you don't know ideal requests. |
| **CA (Cluster Autoscaler)** | **Node count** in a node group. | Pending Pods that can't be scheduled → scale up. Underutilized nodes → scale down (delay ~10 min). | Dynamic cluster size on cloud. |
| **KEDA** | Pod count (wraps HPA) including **scale-to-zero**. | Event-source metrics: Kafka lag, RabbitMQ depth, SQS, cron, Prometheus, etc. | Event-driven and bursty workloads (queue workers, ETL). |
| **Karpenter** | Nodes (alternative to CA). | Just-in-time node provisioning chosen from instance types. | AWS-heavy clusters wanting faster scale-up and bin packing. |

**TRAP:** **don't run HPA and VPA on the same metric.** They'll fight. Pattern: VPA in `Off`/`Initial` mode for memory while HPA scales on CPU.

### Storage: Volumes, PVs, PVCs, StorageClass — and the provisioner reality

- **Volume** — a directory accessible to a Pod's containers. Lifetime tied to the Pod (except for some types).
- **PersistentVolume (PV)** — cluster-level storage resource. Provisioned statically by an admin or **dynamically** by a StorageClass.
- **PersistentVolumeClaim (PVC)** — a user's *request* for storage. Binds 1:1 to a PV.
- **StorageClass** — defines a *class* of storage with a **provisioner** name, parameters, and reclaim policy.

**The piece tutorials skip:** the StorageClass references a *provisioner* by name (e.g., `ebs.csi.aws.com`, `driver.longhorn.io`, `rancher.io/local-path`). The provisioner is the actual *code* that allocates volumes — and **it has to be installed in the cluster, usually via an operator or Helm chart, before any PVC can be fulfilled.**

| Provisioner / driver | Installed via | Typical cluster |
|---|---|---|
| **AWS EBS / EFS / FSx CSI Driver** | Helm chart or operator | EKS |
| **GCP PD CSI Driver** | Helm chart | GKE |
| **Azure Disk / Files CSI Driver** | Helm chart | AKS |
| **Longhorn** | Operator | On-prem / homelab |
| **Rook (Ceph)** | Operator | On-prem block / object / file |
| **OpenEBS** | Operator | On-prem container-native |
| **local-path-provisioner** | Single manifest | k3s / dev |

**TRAP:** *"Why is my PVC stuck in `Pending`?"* — the most common answer in the wild and on the exam: **no provisioner installed for the requested StorageClass.** Either install the operator/driver, or set a different storage class.

**Access modes:**
- `ReadWriteOnce` (RWO) — one node R/W.
- `ReadOnlyMany` (ROX) — many nodes RO.
- `ReadWriteMany` (RWX) — many nodes R/W (NFS, CephFS).
- `ReadWriteOncePod` (RWOP) — exactly one **Pod** R/W (since 1.22, GA 1.29). Tighter than RWO.

**Reclaim policies:** `Retain` (keep data, manual cleanup), `Delete` (default for dynamic — deletes the underlying volume), ~~`Recycle`~~ (deprecated).

### PodDisruptionBudget (PDB)

Protects HA workloads during **voluntary** disruptions (kubectl drain, deployment update, autoscaler scale-down).

```yaml
spec:
  minAvailable: 2          # OR maxUnavailable: 1
  selector: { matchLabels: { app: web } }
```

**TRAP:** PDBs do **not** protect against involuntary disruptions (node crash, kernel panic). For that you need replicas across failure domains.

### Operators and CRDs

- **CRD (CustomResourceDefinition)** — declares a new API type (e.g., `kind: PostgreSQL`). After creation, `kubectl get postgresql` works like any built-in.
- **Operator** — controller code + CRD that encodes operational knowledge (backup, failover, upgrade) for a specific app.
- **Operator pattern** = "controller for a domain-specific resource".
- Tooling: **Operator SDK**, **kubebuilder**, **OperatorHub** (catalog of community operators).
- Famous operators: cert-manager (certs), Prometheus Operator, Strimzi (Kafka), Postgres operators, **most CSI storage drivers** (see above).

---

## 2. Networking & Services (Kubernetes 46% + Orchestration 22%)

### The 4 requirements of the cluster network model

1. Pods can communicate with all other Pods **without NAT**.
2. Nodes can communicate with all Pods without NAT.
3. The Pod sees itself with the same IP that others see it with.
4. Containers inside a Pod share a network namespace (same `localhost`).

The **CNI plugin** (Cilium, Calico, Flannel, Weave, AWS VPC CNI) implements these.

### kube-proxy vs application traffic — two different planes

A common confusion: **kube-proxy doesn't carry application packets**. It programs the rules that translate a Service IP into a backend Pod IP, then steps out of the way.

| | **kube-proxy** | **Application / Pod-to-Pod traffic** |
|---|---|---|
| What flows | Nothing (it's a control program, not a packet router). | The actual TCP/UDP/HTTP packets between Pods. |
| What it does | Programs **iptables / IPVS / nftables / eBPF** rules that DNAT a `ClusterIP:port` → a backing `PodIP:port`. | Goes Pod → kernel → **CNI** plugin → other Pod's kernel. CNI handles the L2/L3 path (overlay or BGP). |
| Layer | Service abstraction (L4 NAT). | Pod network (L3 routing). |
| Disappears when | **Cilium replaces kube-proxy** — eBPF programs the same DNAT directly in the kernel, no `iptables` rules. | Never; the CNI is always present. |

**TRAP:** *"Which component is responsible for routing application traffic between Pods?"* → the **CNI plugin**, not kube-proxy.

### kube-proxy modes

| Mode | Status | Notes |
|---|---|---|
| **iptables** | Default. | Stable, scales OK; rule lookup is O(n) — gets slow at thousands of Services. |
| **IPVS** | Mature. | Hash-based, much faster at scale; supports more LB algorithms (rr, lc, dh, sh). |
| **nftables** | GA in **1.31**. | Modernized iptables successor. |
| ~~userspace~~ | Removed. | Don't reference it on the exam. |

### Service types — each builds on the previous

| Type | What it gives you | Port range | Common use |
|---|---|---|---|
| **ClusterIP** (default) | Stable virtual IP **inside** the cluster. | — | Internal service-to-service. |
| **NodePort** | ClusterIP + a port on every node. | **30000–32767** | Dev / on-prem without LB. |
| **LoadBalancer** | NodePort + an external cloud LB. | — | Production external access (cloud). |
| **ExternalName** | DNS **CNAME** to an external host. No proxy, no IP. | — | Aliasing an external service. |
| **Headless** (`clusterIP: None`) | DNS returns the **Pod IPs** directly, no virtual IP. | — | StatefulSet pod-to-pod, custom load-balancing. |

**TRAP:** a LoadBalancer Service automatically also gets a NodePort and a ClusterIP. They stack.

### EndpointSlices have replaced Endpoints

- The classic `Endpoints` object listed *all* backing Pods in one resource — which broke at >1000 endpoints.
- **EndpointSlices** shard them (default ≤100 per slice). Default since **1.21**, original `Endpoints` API deprecated in 1.33.
- kube-proxy and Ingress controllers consume EndpointSlices.

### Ingress vs Gateway API

| | **Ingress** | **Gateway API** |
|---|---|---|
| Status | Stable since 1.19. Still supported. | GA in **1.29**. Where the ecosystem is heading. |
| Roles | One resource type — overloaded. | **Role-oriented:** `GatewayClass` (infra provider), `Gateway` (cluster-op), `HTTPRoute` (app-dev). |
| Protocols | HTTP(S) primarily. | HTTP, HTTPS, TLS, TCP, UDP, gRPC. |
| Extensibility | Annotations (vendor-specific, not portable). | Typed config, portable. |

### DNS in the cluster

- CoreDNS runs as a Deployment in `kube-system` (replaced kube-dns in 1.13).
- A Service `web` in namespace `prod` resolves as: **`web.prod.svc.cluster.local`**.
- For a Pod: `<pod-ip-with-dashes>.<namespace>.pod.cluster.local`.
- `ndots: 5` in `/etc/resolv.conf` means short names are searched against multiple suffixes — affects DNS performance.

### Service discovery — both mechanisms in one breath

The exam asks "how do Pods find each other?" — there are **two** built-in answers and one external one.

| Mechanism | How it works | When it's used |
|---|---|---|
| **DNS (CoreDNS)** — the standard | Pods are configured with the cluster DNS at `/etc/resolv.conf`. Resolving `<svc>.<ns>.svc.cluster.local` returns the Service's ClusterIP. | Always, for almost every modern cluster. |
| **Environment variables** — the fallback | At Pod start, kubelet injects vars for **every Service that already exists**: `<SVC>_SERVICE_HOST`, `<SVC>_SERVICE_PORT`. | Available even without DNS, but **stale** — Services created *after* the Pod aren't added. Legacy / fallback pattern. |
| **Service mesh** (Istio, Linkerd, Consul) | Sidecar (or ambient) proxy intercepts traffic, consults a control plane for routes, applies mTLS / traffic policy. | Richer discovery: weighted routing, circuit breaking, identity-based auth. Adds operational complexity. |

**The DNS records CoreDNS produces:**

| Service kind | What you get back |
|---|---|
| Normal **ClusterIP** Service | A/AAAA record → the Service's **ClusterIP** (one virtual IP, kube-proxy load-balances). |
| **Headless** Service (`clusterIP: None`) | A/AAAA records → **all backing Pod IPs** directly. Used by StatefulSets so each Pod is addressable as `<pod>.<svc>.<ns>.svc.cluster.local`. |
| **ExternalName** Service | A **CNAME** to the external host. No proxying. |
| Named ports | **SRV** record at `_<port>._<proto>.<svc>.<ns>.svc.cluster.local`. |

**Discovery patterns (terminology you may see):**

- **Server-side discovery** — what Kubernetes does by default. Client hits a stable endpoint (the Service's ClusterIP); the platform's data plane (kube-proxy) load-balances to a backend. Client knows nothing about backends.
- **Client-side discovery** — client queries a registry (Eureka, Consul) to get a backend list and picks one itself. More common outside K8s.

**TRAPS:**
- DNS is the standard. **Env-var-based discovery is a fallback** — it can't see Services created after the Pod started.
- A **headless** Service returns Pod IPs in DNS, *not* a virtual IP. Use it when each Pod must be addressed directly (databases, peer-aware clusters).
- **CoreDNS** is the cluster DNS server (since 1.13). Don't pick "kube-dns" on the exam unless the question is about pre-1.13 history.

### NetworkPolicy and the CNI matrix

- **Pod-level firewall.** Selects Pods by label, controls ingress/egress.
- **Default is allow-all** — until *any* NetworkPolicy selects a Pod, all traffic is allowed.
- Once a Pod is selected by a policy, **everything not explicitly allowed is denied**.
- Common pattern: a `default-deny-all` policy, then allow only what's needed.

**Critical CNI matrix — the exam's favorite gotcha:**

| CNI plugin | Pod networking | NetworkPolicy enforcement |
|---|---|---|
| **Flannel** | ✅ | ❌ — needs a policy controller alongside (Calico). |
| **Calico** | ✅ | ✅ |
| **Cilium** | ✅ | ✅ (eBPF, can also do L7 / mesh-level policy). |
| **Weave Net** | ✅ | ✅ |
| **AWS VPC CNI** | ✅ | ✅ (with the Network Policy add-on, since v1.14+). |
| **Canal** | ✅ (Flannel) | ✅ (Calico component) — historical "Flannel + Calico" combo. |

**TRAP:** *"Which CNI does NOT enforce NetworkPolicy on its own?"* → **Flannel.** This is one of the most-asked CNI questions.

### IPv6 / Dual-stack

- Dual-stack (IPv4 + IPv6) is GA since 1.23. Pods get one address from each family.
- `Service.spec.ipFamilyPolicy`: `SingleStack` / `PreferDualStack` / `RequireDualStack`.

---

## 3. Container Orchestration & Open Standards (22%)

### The "Big Six" open standards

| Standard | What it standardizes | Why it matters |
|---|---|---|
| **OCI Image-spec** | On-disk/registry image format (manifest, config, layers). | Any OCI image runs on any OCI runtime. |
| **OCI Runtime-spec** | How a runtime configures and executes a container (config.json, namespaces, cgroups). | Decouples kubelet from any specific runtime. |
| **OCI Distribution-spec** | HTTP API for pushing/pulling images to/from a registry. | Any client works with any registry. |
| **CRI** (Container Runtime Interface) | gRPC API between kubelet and the container runtime. | Vendor-neutral runtime swap. |
| **CNI** (Container Network Interface) | Plugin spec for setting up the Pod network. | Calico, Cilium, Flannel all conform. |
| **CSI** (Container Storage Interface) | Plugin spec for storage drivers. | Same plugin works across Kubernetes, Mesos, Nomad. |

### CRI (Container Runtime Interface)

- A **gRPC API** between the kubelet and the container runtime. Vendor-neutral.
- **dockershim was removed in 1.24.** Docker is no longer a directly-supported runtime; you use containerd, CRI-O, or another CRI-compliant runtime.
- The runtime *can* still read images Docker built (they're OCI images).

### Runtime hierarchy — know the binary names, not just the project names

The exam loves to test the binary you'd actually see in `ps`. Memorize each row's exact spelling:

| Layer | Binary names | What it does |
|---|---|---|
| **High-level runtime** | **`containerd`**, **`crio`** (CRI-O) | Image pulls, network, lifecycle management; talks to kubelet over CRI; delegates to a low-level runtime. |
| **Low-level runtime** | **`runc`** (reference impl), **`crun`** (C-based, faster) | Actually creates the container — namespaces, cgroups, syscall isolation. |
| **Sandboxed runtimes** | **`runsc`** (gVisor — user-space kernel), **`kata`** (Kata Containers — lightweight VM per container) | Stronger isolation at higher overhead. Used for multi-tenant, untrusted, or compliance-driven workloads. |

**TRAPS in this hierarchy:**

- `containerd` is *not* a low-level runtime — it's the layer **above** `runc`.
- **`runsc` is gVisor's binary**, not a typo of `runc`. They're different things at different layers.
- **`cgroups` is a Linux kernel feature**, not a runtime. It's what runtimes *use* to limit resources, not a runtime itself.
- **`docker` is not a CRI runtime** since 1.24. The image format remains OCI-compatible, but the daemon isn't talked to directly by kubelet.
- *"Which group is sandboxed?"* → **`runsc`, `kata`**. (gVisor + Kata Containers.) Not `runc`/`crun` (low-level), not `containerd`/`crio` (high-level), and certainly not `cgroups`.

### ImagePullPolicy & private registries

- **`Always`** — always pull. Default when `:latest` or no tag.
- **`IfNotPresent`** — pull only if not in node cache. Default when an explicit tag is set.
- **`Never`** — never pull (use only what's already on the node).
- **`imagePullSecrets`** — list of Secrets of type `kubernetes.io/dockerconfigjson` for private registry auth.

### Lightweight Kubernetes & edge / IoT

Vanilla Kubernetes is heavy. These distributions trim it for the edge, IoT, dev, or single-node use:

| Distribution | Vendor | What's special |
|---|---|---|
| **K3s** | Rancher / SUSE | Single ~50MB binary, embedded SQLite or etcd, default CNI is **Flannel** (so NP needs Calico/Cilium). Used in **IoT, edge, CI**. |
| **K0s** | Mirantis | Single binary, no host deps. Edge-friendly. |
| **MicroK8s** | Canonical | Snap-installed, opinionated, easy add-ons. Common in dev / Ubuntu shops. |
| **kind** | SIG | Kubernetes-in-Docker. Local dev / CI clusters. |
| **Minikube** | SIG | Single-node K8s in a VM/container for local dev. |
| **KubeEdge** | CNCF Incubating | Extends K8s control plane to **edge devices** with offline operation. Designed for IoT scenarios (factories, retail, vehicles). |
| **OpenYurt** | CNCF Sandbox | Turns a vanilla K8s cluster into a multi-region edge platform. |

**Edge / IoT use cases that show up on the exam:**
- 5G base stations and Multi-access Edge Computing (MEC).
- Retail stores, factories, autonomous vehicles, smart cities.
- Constraints: limited compute, intermittent connectivity, must survive disconnect, fleet-managed remotely.

**TRAP:** *"Which Kubernetes distribution targets IoT / edge?"* — **K3s** and **KubeEdge** are the two best answers.

---

## 4. Security: 4Cs, PSA, RBAC, Supply Chain, Runtime

### The 4Cs of cloud-native security (outside-in)

| Layer | Examples |
|---|---|
| **Cloud / Infra** | Account hardening, VPC isolation, IAM, KMS, audit logs. |
| **Cluster** | API server auth, RBAC, network policy, encryption at rest, control-plane patching. |
| **Container** | Minimal base images, non-root user, read-only filesystem, vulnerability scanning. |
| **Code** | Dependency hygiene, secrets handling, input validation, TLS, SAST. |

### Pod Security Admission (PSA) and Pod Security Standards (PSS)

PSA replaced the deprecated PodSecurityPolicy (PSP, removed in 1.25). It applies **at the namespace level** via labels:

```yaml
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.28
```

**Three profiles (rules) — all 3 in one breath:**

| Profile | What it allows |
|---|---|
| **Privileged** | Anything. For system / CNI / monitoring DaemonSets. |
| **Baseline** | Blocks known privilege escalations with minimal friction (no hostPath, no hostNetwork, no privileged containers). |
| **Restricted** | Heavily hardened. Non-root, read-only root FS, drop ALL capabilities, seccomp `RuntimeDefault`, no hostPort. |

**Three modes (action):**

| Mode | Effect |
|---|---|
| **enforce** | Reject violating Pods. |
| **audit** | Allow, but log to the audit log. |
| **warn** | Allow, but return a user-facing warning to `kubectl`. |

**TRAP:** modes can be combined per namespace (enforce one profile, audit a stricter one). Version-pin the profile so an upgrade can't silently change behavior.

### RBAC quick reference

| Resource | Scope | Pairs with |
|---|---|---|
| **Role** | Namespaced | RoleBinding |
| **ClusterRole** | Cluster-wide | ClusterRoleBinding (or RoleBinding to apply only in one namespace) |

**Subjects:** User, Group, **ServiceAccount**.

**Rule shape:** `verbs` (`get`, `list`, `watch`, `create`, `update`, `patch`, `delete`) on `resources` in `apiGroups`.

**TRAP:** a `ClusterRole` bound via a `RoleBinding` only grants permissions inside that namespace. Bound via a `ClusterRoleBinding`, it grants cluster-wide.

### ServiceAccounts

- Every namespace has a `default` ServiceAccount.
- Pods auto-mount a token at `/var/run/secrets/kubernetes.io/serviceaccount/`.
- Since **1.24**, tokens are **projected, time-bound, audience-scoped** — not stored in long-lived Secret objects.
- Set `automountServiceAccountToken: false` on Pods/SAs that don't need API access.

### Secrets — what they are, and aren't

- Stored in etcd as **base64**, *not encrypted* by default.
- Enable **encryption at rest** via the API server's `--encryption-provider-config` to actually encrypt.
- For real secret management at scale: **External Secrets Operator**, **HashiCorp Vault**, **Sealed Secrets**, cloud KMS.

### Image supply chain (build-time security)

| Concern | Tool / standard |
|---|---|
| **Sign images** so you can verify provenance. | **cosign** + **sigstore** (Rekor transparency log, Fulcio CA). |
| **Software Bill of Materials (SBOM)** so you know what's inside. | **CycloneDX**, **SPDX** formats; `syft`, `cosign attest`. |
| **Vulnerability scan** images before deploying. | **Trivy** (most common), Grype, Clair, Snyk, Anchore. |
| **Slim base images** to reduce attack surface. | **Distroless**, **scratch**, Alpine; multi-stage Docker builds. |
| **Verify images at admission**. | **Kyverno**, **Gatekeeper (OPA)**, Connaisseur, Sigstore Policy Controller. |

**Build-time hygiene:** pin tags to digests (`@sha256:…`), don't run as root in the image, set explicit `USER`, drop secrets out of layers.

### Runtime security (in-cluster security)

| Mechanism | What it does |
|---|---|
| **Falco** | Detects runtime anomalies via syscalls (eBPF or kernel module). Alerts on shell-spawn-in-container, sensitive-file-read, privilege escalation. |
| **seccomp** | Filters syscalls a container can issue. Profiles: `RuntimeDefault` (recommended), `Localhost` (custom file), `Unconfined`. |
| **AppArmor** | Mandatory access control on Linux paths/capabilities (Debian/Ubuntu). |
| **SELinux** | Mandatory access control with type enforcement (RHEL/Fedora). |
| **Linux capabilities** | Fine-grained slices of root: `NET_BIND_SERVICE`, `NET_ADMIN`, `SYS_ADMIN`, etc. **Drop ALL, add only what's needed.** |
| **Read-only root FS** | `securityContext.readOnlyRootFilesystem: true`. Use `emptyDir` for writable scratch. |
| **runAsNonRoot** | Enforce a non-root user in `securityContext`. |

### Admission policy engines

| Engine | Style |
|---|---|
| **Kyverno** | Kubernetes-native YAML policies. No new language to learn. |
| **OPA / Gatekeeper** | **Rego** policy language; powerful but steeper learning curve. |

**OPA (Open Policy Agent) — the four facts that get tested:**

- **Written in Rego**, *not* Python or YAML. Rego is a declarative query language designed for policy.
- **In Kubernetes**, OPA is wrapped by **Gatekeeper** — a validating admission controller that runs OPA policies against API requests (deny a Pod that runs as root, require a label, etc.).
- **General-purpose** — OPA is **not** Kubernetes-only. It enforces policy in Terraform plans, CI/CD pipelines, microservice authorization (often via the Envoy ext-authz filter), database query checks, anywhere policy-as-code makes sense.
- **Locally testable** — `opa test`, `opa eval`, and `conftest` run policies against fixtures **before** they're published to a cluster. You don't need to deploy to validate.

**TRAP:** "OPA policies must be written in Python" / "OPA only works inside Kubernetes" / "Policies can only be tested when published" — all wrong. Correct shape: *"Kubernetes can use it to validate requests and apply policies."*

---

## 5. Cloud Native Architecture & Delivery (16%)

### 12-Factor App

Memorize the names; questions usually quote a scenario and ask which factor it violates.

| # | Factor | One-liner |
|---|---|---|
| 1 | **Codebase** | One repo per app, many deploys. |
| 2 | **Dependencies** | Explicitly declared and isolated (`package.json`, `requirements.txt`, lockfiles). |
| 3 | **Config** | Stored in **environment variables**, not in code. |
| 4 | **Backing services** | Treated as attached, swappable resources (URLs/credentials). |
| 5 | **Build, release, run** | Strict separation of stages. |
| 6 | **Processes** | **Stateless**; share-nothing; persist state externally. |
| 7 | **Port binding** | The app self-contains its server and exposes a port. |
| 8 | **Concurrency** | Scale **out** (more processes), not just up. |
| 9 | **Disposability** | Fast startup, **graceful shutdown** (handle SIGTERM). |
| 10 | **Dev/prod parity** | Keep environments as similar as possible. |
| 11 | **Logs** | Treat as event streams to stdout/stderr. **Don't** write to local files. |
| 12 | **Admin processes** | One-off tasks (migrations) run in the same env as the app. |

### Microservices vs monolith vs SOA

- **Monolith** — one deployable. Simple to start, hard to scale teams.
- **SOA** — services share an enterprise service bus, often heavy contracts.
- **Microservices** — small, independently deployable, owns its own data store. Network is the boundary.

### Deployment strategies — all 5 in one breath

| Strategy | What happens | Resource cost | Risk |
|---|---|---|---|
| **Recreate** | Kill all old, start all new. | Low | **Downtime.** |
| **RollingUpdate** (Deployment default) | Replace incrementally; tunable via `maxSurge`, `maxUnavailable`. | Slightly extra during rollout | Mid — both versions serve briefly. |
| **Blue-Green** | Two parallel environments; flip traffic at once. | **2× resources** during the switch. | Low — instant rollback by flipping back. |
| **Canary** | Send a small % of traffic to v2, ramp up. | Slight extra. | Lowest — fail closes the canary, not prod. Tools: **Argo Rollouts**, **Flagger**. |
| **A/B test** | Route by user attribute (header, cookie). | Slight extra. | Not strictly a deploy strategy — a feature-rollout strategy. |

### GitOps

- **Git is the source of truth.** Cluster state is reconciled to match the repo.
- **Pull-based:** an in-cluster agent (ArgoCD, Flux) watches the repo and applies changes. Beats push-based CD because no external system needs cluster credentials.
- Auditable, rollback-by-revert, declarative.
- Two big tools: **Argo CD** (UI-heavy, app-centric), **Flux** (modular, Kustomize/Helm-native).

### CI vs CD vs CD

- **Continuous Integration** — every change is built and tested automatically.
- **Continuous Delivery** — every passing build is *deployable*; release is a manual click.
- **Continuous Deployment** — every passing build is *deployed* automatically.

**Cloud-native CI tools:** **Tekton** (CRD-based pipelines on Kubernetes), **Argo Workflows** (DAG workflows), Jenkins (still common), GitHub Actions, GitLab CI.

### Helm vs Kustomize

| | **Helm** | **Kustomize** |
|---|---|---|
| Approach | Templating engine + package manager. | Overlay engine — patches a base. No templating, plain YAML. |
| Files | `Chart.yaml`, `values.yaml`, `templates/*.yaml`, `charts/` (deps). | `kustomization.yaml`, `base/`, `overlays/`. |
| Versioning | Chart versions, releases, rollback via Helm history. | Git revs; integrates with Argo / Flux. |
| Strength | Distribution, dependency management, third-party charts. | Simplicity, no templating syntax, kubectl-native (`kubectl apply -k`). |
| Hooks | `pre-install`, `post-upgrade`, etc. | None — pure overlays. |
| Helm 2 → 3 | **Tiller removed in Helm 3.** Client-only. |  |

### Service mesh — the two components, every name they go by

A service mesh has **exactly two component groups**. Know both names for each — the exam swaps them:

| Component | Other names you'll see | What it does | Examples |
|---|---|---|---|
| **Service proxy** (a.k.a. **data plane**, **sidecar**) | "service proxy", "data plane", "sidecar proxy", "ambient proxy" | Sits next to (or alongside) every Pod and **intercepts all traffic** in and out. Carries the actual packets. | **Envoy** (dominant), Linkerd-proxy, Cilium eBPF data plane. |
| **Control plane** | (just "control plane") | **Configures** the proxies — pushes routing rules, certs for mTLS, policies. Doesn't carry application traffic itself. | **istiod** (Istio), Linkerd control plane, Consul servers. |

- Mesh provides: **mTLS** between services, retries/timeouts, traffic splitting, **circuit breaking**, observability metrics, identity-based policy.
- Big names: **Istio**, **Linkerd**, **Consul Connect**, **Cilium service mesh** (sidecar-less, eBPF).
- "Sidecar-less" / "ambient" meshes (Ambient Istio, Cilium) move the data plane out of per-Pod sidecars to per-node or eBPF-based proxies — same two components, different deployment shape.

**TRAPS:**
- *"What components are common in a service mesh?"* → **service proxy + control plane**. Not "data plane and runtime plane" (no such thing as a runtime plane). Not "tracing and log storage" (those are observability *outputs*, not mesh *components*). Not "circuit breaking and Pod scheduling" (Pod scheduling is the kube-scheduler's job).
- A mesh **adds** mTLS, retries, traffic shaping. It does **not** replace the CNI — Pod-to-Pod packets still flow through the CNI; the proxy just intercepts them at the Pod boundary.

### Serverless on Kubernetes

| Tool | What it does |
|---|---|
| **Knative Serving** | HTTP services with **scale-to-zero**, traffic splitting, revisions. Uses an autoscaler (KPA) by default. |
| **Knative Eventing** | Pub/sub for **CloudEvents** — channels, brokers, triggers, sources/sinks. |
| **KEDA** | Event-driven autoscaler that wraps HPA. Adds scale-to-zero from external sources (Kafka, SQS, RabbitMQ, Prometheus, cron). |
| **OpenFaaS** | FaaS framework on Kubernetes. |

**FaaS vs PaaS vs CaaS:**
- **CaaS** (Containers-as-a-Service) — you bring containers, they orchestrate (vanilla Kubernetes).
- **PaaS** — you bring code, they handle build + deploy + scaling (Heroku-style).
- **FaaS** — you bring a function, they handle invocation + scaling (Lambda, Knative).

**When serverless ≠ a fit:** steady high throughput, long-running stateful workloads, latency-sensitive paths where cold starts matter.

### Roles & personas (who does what)

| Persona | Owns | Cares about |
|---|---|---|
| **Cluster admin / Platform engineer** | Cluster lifecycle, upgrades, RBAC, networking, ingress, observability, golden paths. | Reliability, multi-tenant fairness, cost. |
| **Application developer** | App code, container image, manifests/Helm chart for their service. | Time-to-deploy, debuggability. |
| **DevOps engineer** | CI/CD pipelines, IaC, automation between dev and prod. | Repeatability, deployment safety. |
| **SRE** | SLOs, error budgets, incident response, runbooks. | Reliability vs velocity trade-off. |
| **Security engineer** | RBAC reviews, image scanning policy, runtime security, audit. | Least privilege, supply-chain integrity. |
| **Network admin** | CNI, ingress, DNS, service mesh. | Latency, segmentation. |
| **Storage admin** | StorageClass design, PV provisioning, backup, DR. | Durability, throughput. |

### Community, governance, and **deprecation policy**

- **CNCF** is hosted by the Linux Foundation.
- **Technical Oversight Committee (TOC)** — accepts/promotes projects. **Governing Board** — handles funding/business.
- **Maturity gates:** Sandbox → Incubating → Graduated.
  - **Sandbox:** experimental, welcomed in.
  - **Incubating:** real production users (≥3 independent), healthy contributors, clear governance.
  - **Graduated:** mature governance, security audit, broad adoption (Kubernetes, Prometheus, Helm, Envoy, Argo, Flux, etcd, containerd, OpenTelemetry, Cilium, Istio, Linkerd, CoreDNS, Fluentd…).
- **Kubernetes governance:**
  - **SIGs** (Special Interest Groups) own areas: api-machinery, network, scheduling, node, storage, etc.
  - **WGs** (Working Groups) — cross-SIG, time-boxed.
  - **KEPs** (Kubernetes Enhancement Proposals) — design docs that drive any non-trivial change.
- **Release cadence:** ~3 minor versions per year. Each minor supported for ~14 months. **No formal LTS** in upstream — managed services (EKS, GKE, AKS) extend support.
- **Conformance:** the **CNCF Certified Kubernetes** program — distros pass a test suite to use the name.

**Kubernetes deprecation policy — all 3 stability levels in one breath:**

| Stability | Min. support after deprecation announcement |
|---|---|
| **Stable (GA)** | **At least 12 months or 3 minor releases** (whichever is longer). |
| **Beta** | At least 9 months or 3 minor releases. |
| **Alpha** | None — alpha APIs can change or disappear in any release. |

So a stable API element you depend on today is guaranteed at least **a full year** of life after the project announces it's going away. That window is the time you have to migrate.

**TRAP:** *"How long is a stable API supported after deprecation?"* → **12 months** (or 3 releases, whichever is longer).

---

## 6. Cloud Native Observability (8%)

### The three signals + the unifier

| Signal | What it answers | Common tools |
|---|---|---|
| **Metrics** | "How is the system performing? Is something broken right now?" | **Prometheus**, Grafana for visualization. |
| **Logs** | "What happened? Why did it fail?" | **Fluent Bit** / Fluentd, **Loki** (label-based, cheap), Elasticsearch (heavy, full-text). |
| **Traces** | "Where in the request path is the bottleneck?" | **Jaeger**, **Zipkin**, **Tempo**. |
| **(Unifier)** | One set of SDKs and a wire protocol for all three. | **OpenTelemetry (OTel)** — replaces OpenTracing + OpenCensus. |

**Exemplars** link metrics to traces (a histogram bucket can carry a trace ID — jump from "p99 latency spiked" straight to the slow request).

### Prometheus essentials

- **Pull-based** — Prometheus scrapes targets at intervals (default 15s–1m). Apps expose `/metrics`.
- **Exporters** translate non-Prometheus metrics into Prometheus format (node-exporter, kube-state-metrics, blackbox-exporter).
- **Long-term storage:** Thanos, Cortex, Mimir.
- `metrics-server` is **not** Prometheus — it's a tiny in-memory metrics service used by HPA and `kubectl top`.
- **OpenMetrics** is the formalized Prometheus exposition format — same shape, vendor-neutral standard.

### Prometheus metric types — all 4 in one breath

This is the question shape: *"Which type represents a single numerical value that goes up AND down?"* → **Gauge** (D). The wrong answers are always one of the siblings, so know all four together.

| Type | Behavior | Examples | Query pattern |
|---|---|---|---|
| **Counter** | Monotonically **increasing only** (resets only on restart). | `http_requests_total`, `errors_total`. | `rate(...)` over a time window. |
| **Gauge** | Goes **up and down** — a single instantaneous value. | `memory_in_use_bytes`, `pods_pending`, `temperature_celsius`. | Just read the value, or `avg_over_time(...)`. |
| **Histogram** | Bucketed observations; calculates quantiles **at query time** on the server. | `request_duration_seconds_bucket`. | `histogram_quantile(0.99, rate(..._bucket[5m]))`. Aggregates across instances. |
| **Summary** | Calculates quantiles **on the client**. | `request_duration_seconds_summary`. | Read pre-computed quantile labels. Doesn't aggregate well. |

**TRAP:** Histogram > Summary for distributed systems, because Summary's quantiles can't be averaged across instances.

### Health probes — all 3 in one breath

| Probe | Failure action | Use it for |
|---|---|---|
| **liveness** | **Restart** the container. | "Is the app alive, or stuck in a deadlock?" |
| **readiness** | Remove Pod from Service endpoints (no traffic). | "Is the app ready to serve right now?" Slow warm-up, dependency-down. |
| **startup** | Suspend liveness/readiness checks until it passes. | Slow-starting apps that would otherwise be killed by liveness. |

**TRAP:** if your liveness probe hits `/` and the dependency DB is down, you'll *restart* a perfectly healthy app forever. Use **readiness** for "depends on something else" checks.

### SLI / SLO / SLA + error budget

| Term | What it is |
|---|---|
| **SLI** (Service Level Indicator) | An *actual measurement*. Example: "fraction of requests faster than 200ms over the last hour." |
| **SLO** (Service Level Objective) | An internal *target* for an SLI. Example: "99.9% of requests under 200ms." |
| **SLA** (Service Level Agreement) | An *external contract* with consequences (refunds, breach). Usually a looser SLO. |
| **Error budget** | `1 - SLO`. The amount of unreliability you're allowed. Burning the budget → freeze risky changes. |

### RED, USE, and the Four Golden Signals

| Method | Use it for | Three (or four) things to watch |
|---|---|---|
| **RED** | Request-driven services. | **Rate** (requests/sec), **Errors** (failed requests), **Duration** (latency). |
| **USE** | Resources / queues. | **Utilization** (% busy), **Saturation** (queue depth), **Errors**. |
| **Four Golden Signals** (Google SRE) | Any user-facing service. | **Latency**, **Traffic**, **Errors**, **Saturation**. |

### Cardinality and sampling

- **High cardinality** — a metric label that takes many values (user ID, request ID, full URL). Each unique combination is a separate time series. **Don't put unbounded values in labels** — Prometheus memory blows up.
- **Sampling** for traces: you can't trace every request at scale. **Head-based** sampling decides at the start; **tail-based** decides after seeing the trace (catch slow ones). OTel Collector supports both.
- **Structured logging** (JSON) is queryable; plain-text logs are not.

---

## 7. FinOps (in App Delivery 8%)

### Phases

| Phase | What it looks like |
|---|---|
| **Inform** | Visibility, tagging, cost allocation, dashboards. "How much are we spending and on what?" |
| **Optimize** | Rightsizing, reserved instances / savings plans, autoscaling, removing idle resources. "How do we spend less without breaking anything?" |
| **Operate** | Automation, governance, cultural ownership. "How do we keep it that way without manual effort?" |

### Maturity levels

| Level | Behavior |
|---|---|
| **Crawl** | Manual, reactive, ad-hoc. A single person checks the bill at month-end. |
| **Walk** | Formalized processes, KPIs, regular reviews. |
| **Run** | Automated and embedded in the dev workflow; cost is a first-class citizen alongside latency and reliability. |

### Showback vs Chargeback

- **Showback** — present each team their costs. *Information only*.
- **Chargeback** — actually bill the team. Forces accountability.

### Kubernetes-specific cost levers

| Lever | Why it matters |
|---|---|
| **Right-sizing** | Set realistic requests, not maxima. Idle requested capacity = wasted money. VPA helps. |
| **Bin packing** | Higher density per node = fewer nodes. Influenced by requests, not limits. |
| **Spot / Preemptible nodes** | 60–90% cheaper. Use tolerations + PDBs to handle preemption. |
| **Cluster Autoscaler / Karpenter** | Don't pay for nodes you're not using. |
| **Idle workloads** | Scale-to-zero (KEDA, Knative) for off-peak services. |
| **Monitor with OpenCost / Kubecost** | Allocate node spend to namespaces / labels / Pods. |

---

## 8. CNCF Landscape — quick map

| Function | Project(s) |
|---|---|
| **Container runtime** | containerd, CRI-O |
| **Orchestration** | Kubernetes |
| **Lightweight / edge** | K3s, K0s, MicroK8s, KubeEdge, OpenYurt |
| **Packaging** | Helm, Kustomize |
| **CNI** | Cilium, Calico, Flannel (no NP), Weave |
| **Service mesh** | Istio, Linkerd, Consul |
| **Service proxy / API gateway** | Envoy, NGINX, Contour, Emissary |
| **Storage drivers** | Rook (Ceph), Longhorn, OpenEBS, MinIO, cloud CSI drivers |
| **GitOps / CD** | Argo CD, Flux |
| **CI / Workflows** | Tekton, Argo Workflows |
| **Metrics** | Prometheus, Thanos, Cortex, Mimir |
| **Logging** | Fluent Bit, Fluentd, Loki |
| **Tracing** | Jaeger, Zipkin, Tempo, OpenTelemetry |
| **Policy / Admission** | OPA / Gatekeeper, Kyverno |
| **Runtime security** | Falco |
| **Image security** | cosign, sigstore, Trivy |
| **Cost** | OpenCost |
| **Serverless** | Knative, KEDA, OpenFaaS |
| **Service discovery** | CoreDNS, etcd |
| **Container registry** | Harbor (CNCF graduated) |

---

## 9. Common exam traps (X vs Y)

| | They look alike, but… |
|---|---|
| **DaemonSet vs Deployment** | DaemonSet runs **one Pod per node** (bypasses the scheduler). Deployment runs **N replicas anywhere**. |
| **StatefulSet vs Deployment** | StatefulSet gives **stable network identity + per-Pod storage**. Use for DBs / clustered apps. |
| **HPA vs VPA vs CA** | HPA = scale Pod **count** horizontally on metrics. VPA = adjust Pod **resource requests** vertically. CA = scale **node count** when Pods can't be scheduled. **Don't run HPA + VPA on the same metric.** |
| **HPA vs KEDA** | HPA scales on resource metrics + custom. KEDA wraps HPA and adds **scale-to-zero from external event sources**. |
| **CA vs Karpenter** | CA scales pre-defined node groups. Karpenter picks the best instance type just-in-time. |
| **ClusterIP vs NodePort vs LoadBalancer** | Each is a strict superset. LoadBalancer ⊇ NodePort ⊇ ClusterIP. |
| **kube-proxy vs CNI** | kube-proxy **programs** Service-to-Pod NAT rules. The **CNI** carries the actual Pod-to-Pod packets. Two different planes. |
| **Flannel vs Calico (NetworkPolicy!)** | Flannel does Pod networking but **does not enforce NetworkPolicy on its own.** Calico, Cilium, Weave do. |
| **Ingress vs Gateway API** | Ingress = older, single-resource, HTTP-focused. Gateway API = role-split (Gateway/HTTPRoute), multi-protocol, GA in 1.29. |
| **kube-proxy modes** | iptables (default), IPVS (faster at scale), nftables (1.31). userspace was removed long ago. |
| **ConfigMap vs Secret** | Both store key-value config. Secret is base64-encoded, **not encrypted by default** — same trust level as ConfigMap unless you enable encryption-at-rest. |
| **Volume vs PV vs PVC** | Volume = Pod-level. PV = cluster-level resource. PVC = a user's claim against a PV. |
| **PVC stuck in Pending** | Almost always: the StorageClass references a provisioner that **isn't installed.** Install the CSI driver / storage operator. |
| **ReadWriteOnce vs ReadWriteOncePod** | RWO = one node R/W. RWOP = one **Pod** R/W. |
| **Labels vs Annotations** | **Labels** are queryable selectors (`app=web`). **Annotations** are arbitrary metadata, not selectable. |
| **Init container vs sidecar** | Init runs to completion *before* the main container. Sidecar (1.29+ as `restartPolicy: Always`) runs *alongside* it. |
| **Liveness vs readiness vs startup** | Liveness restarts. Readiness gates traffic. Startup defers liveness until the app finishes booting. |
| **QoS classes** | Guaranteed (req=lim everywhere) → Burstable → BestEffort. **BestEffort is OOM-killed first.** |
| **Counter vs Gauge vs Histogram vs Summary** | Counter only goes up. Gauge moves both ways. Histogram aggregates server-side (good for distributed). Summary computes quantiles client-side (doesn't aggregate). |
| **SLI vs SLO vs SLA** | SLI = measurement. SLO = internal target. SLA = external contract. |
| **RED vs USE** | RED for request-driven services (Rate/Errors/Duration). USE for resources (Utilization/Saturation/Errors). |
| **Helm vs Kustomize** | Helm = templates + chart packaging. Kustomize = overlays on plain YAML. |
| **GitOps push vs pull** | GitOps is **pull**-based — agent in-cluster watches Git. Push is plain CD with creds outside the cluster. |
| **CD vs CD** | Continuous *Delivery* — deployable, manual click. Continuous *Deployment* — automatic. |
| **Containerd vs runc** | containerd is **high-level** (image pulls, lifecycle). runc is **low-level** (creates the container). containerd uses runc. |
| **runc vs runsc** | `runc` = reference **low-level** OCI runtime (creates namespaces/cgroups). `runsc` = **gVisor's** sandboxed runtime (user-space kernel). Different layers. |
| **gVisor vs Kata** | gVisor = user-space kernel (intercepts syscalls). Kata = lightweight VM per container. Both are **sandboxed runtimes** — the answer to "which group provides additional sandboxed isolation". |
| **cgroups vs runtime** | cgroups is a **Linux kernel feature** for resource limits — *not* a runtime. Runtimes *use* cgroups. |
| **Knative Serving vs Eventing** | Serving = HTTP scale-to-zero. Eventing = pub/sub via CloudEvents. |
| **Service mesh components** | **Service proxy** (data plane / sidecar — Envoy etc.) + **control plane** (istiod etc.). Not "data plane + runtime plane". Not "tracing + log storage". |
| **Required YAML fields** | **`apiVersion`, `kind`, `metadata`** (and `spec` for most). `namespace` lives **inside** metadata, not top-level. `data` is ConfigMap/Secret-only. |
| **Showback vs Chargeback** | Showback shows the bill. Chargeback collects it. |
| **Sandbox / Incubating / Graduated** | Sandbox = experimental. Incubating = production-used. Graduated = mature + audited. |
| **PSP vs PSA** | PSP was removed in 1.25. **PSA replaced it** via namespace labels. |
| **PodDisruptionBudget protects against…** | **Voluntary** disruptions only (drain, deploy, scale-down). Not node crashes. |
| **K3s vs vanilla K8s** | K3s = single-binary, tiny footprint, made for IoT / edge / dev. Default CNI is Flannel (so NP needs Calico/Cilium). |
| **Service discovery: DNS vs env vars** | **DNS (CoreDNS)** is the standard — Pods resolve `<svc>.<ns>.svc.cluster.local` to the ClusterIP. **Env vars** (`<SVC>_SERVICE_HOST/PORT`) are a legacy fallback and **only see Services that existed at Pod start**. |
| **Headless Service in DNS** | Returns the **Pod IPs** directly, not a single virtual IP. Used by StatefulSets to address each Pod by name. |
| **CoreDNS vs kube-dns** | **CoreDNS** has been the default since 1.13. kube-dns is the older one. |
| **OpenShift vs K3s vs RKE vs k1s** | **K3s** is the lightweight K8s distribution for **IoT / edge**. OpenShift is Red Hat's full-featured platform. RKE is Rancher's traditional installer (heavier than K3s). "k1s" doesn't exist — distractor. |
| **OPA + Rego** | OPA policies are written in **Rego** (not Python/YAML). OPA works **outside** Kubernetes too (Terraform, CI, Envoy). Policies can be **tested locally** with `opa test` / `conftest`. |
| **Stable API deprecation window** | **At least 12 months or 3 minor releases**, whichever is longer. |

---

## 10. kubectl cheat sheet

| Command | Why it matters |
|---|---|
| `kubectl get pods -o wide` | Shows Pod IP and assigned node. First step in "where is this running?" |
| `kubectl describe <resource>` | Shows **Events** — *the* place to look for "why is this Pod not starting?" (image pull fails, scheduling fails, OOMKilled). |
| `kubectl logs <pod> [-c container] [-f] [--previous]` | App logs. `--previous` for the *crashed* container. |
| `kubectl exec -it <pod> -- sh` | Drop into a running container. |
| `kubectl explain <resource>[.field]` | Field-level docs straight from the API. e.g. `kubectl explain pod.spec.containers`. |
| `kubectl top node` / `kubectl top pod` | Live CPU/memory (needs `metrics-server`). |
| `kubectl rollout status deploy/<name>` | Watch a rollout. |
| `kubectl rollout undo deploy/<name>` | Roll back one revision. |
| `kubectl rollout history deploy/<name>` | Revisions available to roll back to. |
| `kubectl scale deploy/<name> --replicas=5` | Imperative scale. |
| `kubectl apply -f file.yaml` | Declarative apply. |
| `kubectl apply -k overlays/prod` | Kustomize overlay. |
| `kubectl get events --sort-by=.lastTimestamp` | Cluster-wide event timeline. |
| `kubectl config view` / `kubectl config use-context <ctx>` | See / switch kubeconfig contexts. |
| `kubectl auth can-i <verb> <resource>` | Test RBAC permissions. e.g. `kubectl auth can-i delete pods --as=jane`. |
| `kubectl debug <pod> --image=<img>` | Attach an ephemeral debug container (1.25+). |
| `kubectl port-forward svc/<name> 8080:80` | Local tunnel into a Service for ad-hoc testing. |
| `kubectl drain <node>` | Voluntary eviction respecting PDBs (use before maintenance). |
| `kubectl cordon <node>` / `uncordon` | Mark a node unschedulable / schedulable again. |
| `kubectl label <res> <k>=<v>` / `--overwrite` | Add or change labels. |
| `kubectl get ns` / `kubectl create ns <name>` | Namespace operations. |

---

## 11. The morning-of read

If you only have 10 minutes:

1. **Request flow:** Authn → Authz → Mutating → Validating → etcd. Mutating *before* validating.
2. **Scheduler:** filter, then score.
3. **dockershim removed in 1.24.** Default runtime is **containerd**.
4. **kube-proxy programs Service NAT. CNI carries Pod-to-Pod packets.** Two different planes.
5. **CNI + NetworkPolicy:** **Flannel does NOT enforce NetworkPolicy.** Calico/Cilium/Weave/AWS-VPC-CNI do.
6. **PSA profiles:** Privileged, Baseline, Restricted. **Modes:** enforce, audit, warn. PSP is dead since 1.25.
7. **Service types stack:** ClusterIP ⊂ NodePort ⊂ LoadBalancer. ExternalName = CNAME. Headless = `clusterIP: None`.
8. **EndpointSlices replaced Endpoints.** Gateway API GA in 1.29. nftables kube-proxy GA in 1.31.
9. **Sidecar containers GA in 1.29** (`restartPolicy: Always` on an init container).
10. **Liveness restarts. Readiness gates traffic. Startup defers liveness.**
11. **HPA = pod count. VPA = pod resource requests. CA = node count. KEDA = scale-to-zero from events. Karpenter = JIT node provisioning.** Don't combine HPA + VPA on the same metric.
12. **QoS classes:** Guaranteed (req=lim everywhere), Burstable, BestEffort. **BestEffort is OOM-killed first.**
13. **PVC Pending?** Most likely: provisioner / CSI driver isn't installed. Storage drivers ship as **operators** that the cluster admin installs.
14. **PDB protects against voluntary disruptions only** (drain, deployment update). Not node crashes.
15. **Prometheus types:** **Counter** (up only), **Gauge** (up & down), **Histogram** (server-side quantiles, aggregates), **Summary** (client-side quantiles, doesn't aggregate). **Histogram > Summary** for distributed systems.
16. **GitOps is pull-based.** Argo CD, Flux. CD-Delivery (manual click) vs CD-Deployment (automatic).
17. **12-Factor:** config in env, processes stateless, logs as streams, fast startup + graceful shutdown.
18. **FinOps:** Inform → Optimize → Operate. Crawl → Walk → Run.
19. **CNCF maturity:** Sandbox → Incubating → Graduated.
20. **K8s deprecation policy:** Stable API supported **≥12 months / 3 minor releases** after deprecation. Beta ≥9 months. Alpha = no guarantees.
21. **Open standards:** OCI (image, runtime, distribution), CRI, CNI, CSI.
22. **Runtime layers + binary names:** `containerd` / `crio` (high-level), `runc` / `crun` (low-level), **`runsc` (gVisor) / `kata`** (sandboxed). `cgroups` is a kernel feature, not a runtime.
23. **Image supply chain:** **cosign** signs, **Trivy** scans, **SBOM** lists ingredients, **Kyverno/Gatekeeper** enforces at admission.
24. **Runtime security:** **Falco** (syscall anomalies), seccomp `RuntimeDefault`, drop ALL capabilities and add only what's needed, `runAsNonRoot: true`.
25. **Knative Serving = HTTP scale-to-zero. Knative Eventing = CloudEvents pub/sub.** KEDA = event-driven autoscaler.
26. **SLI = measurement. SLO = internal target. SLA = external contract.** Error budget = `1 - SLO`.
27. **RED** (Rate/Errors/Duration) for services. **USE** (Utilization/Saturation/Errors) for resources. **Four Golden Signals** = Latency, Traffic, Errors, Saturation.
28. **High-cardinality labels blow up Prometheus.** Don't put user/request IDs in labels.
29. **Service discovery:** **CoreDNS** (standard, since 1.13) — Pods resolve `<svc>.<ns>.svc.cluster.local` to a ClusterIP. **Env vars** are a fallback that only sees Services existing at Pod start. **Headless** Services return Pod IPs in DNS, not a VIP.
30. **Service mesh = service proxy (data plane / sidecar) + control plane.** Not "runtime plane". Mesh adds mTLS, retries, circuit breaking, traffic shaping; doesn't replace the CNI.
31. **Every K8s object needs `apiVersion`, `kind`, `metadata`** (and usually `spec`). `namespace` is a sub-field of `metadata`, not top-level. `data` is only on ConfigMap / Secret.
30. **K3s / KubeEdge** are the K8s distros for **IoT / edge**.
33. **OPA** policies are in **Rego** (not Python). Wrapped by **Gatekeeper** in K8s; works outside K8s too; testable locally before publish.
34. **Read every option.** When two answers are close, the more specific one is usually right.

Good luck. 🚀

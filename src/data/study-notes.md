# KCNA Last-Mile Study Notes

Dense, exam-focused. Read once the night before, again the morning of. Trap callouts mark the places people lose points.

> **Exam shape:** 60 multiple-choice questions, 90 minutes, pass mark **75%**.
> **Domain weights:** Kubernetes Fundamentals **46%** · Container Orchestration **22%** · Cloud Native Architecture **16%** · Observability **8%** · App Delivery **8%**.
> **Strategy:** spend the most time on Fundamentals. Read every option — KCNA trades on subtle distinctions (DaemonSet vs Deployment, ClusterIP vs NodePort, HPA vs VPA vs CA).

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
| **kube-proxy** | Programs the network so traffic to a Service IP reaches a backing Pod. Modes: **iptables** (default), **IPVS** (faster at scale), **nftables** (newer, GA 1.31). |
| **Container runtime** | Runs the containers. Default is **containerd**. dockershim was **removed in 1.24** — Docker is no longer a supported runtime. |

### Request flow through the API server

Every API request travels through these stages **in order**. If any stage rejects, the request fails before persistence.

1. **Authentication** — *Who are you?* (TLS client certs, bearer tokens, OIDC, ServiceAccount tokens.)
2. **Authorization** — *What can you do?* (RBAC is the standard. ABAC, Node, Webhook also exist.)
3. **Admission control**
   - **Mutating** admission webhooks run first — they can *modify* the request (add labels, inject sidecars).
   - **Validating** admission webhooks run after — they can only accept or reject.
   - **Pod Security Admission (PSA)** is a built-in *validating* admission controller.
4. **Persistence** — only now does the object get written to **etcd**.

**TRAP:** mutating runs before validating. The exam loves to flip the order. Mnemonic: **"Mutate first, validate second"** — you fix the form before checking it.

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

### Workload controllers

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

### Storage: Volumes, PVs, PVCs, StorageClass

- **Volume** — a directory accessible to a Pod's containers. Lifetime tied to the Pod (except for some types).
- **PersistentVolume (PV)** — cluster-level storage resource. Provisioned statically by an admin or **dynamically** by a StorageClass.
- **PersistentVolumeClaim (PVC)** — a user's *request* for storage. Binds 1:1 to a PV.
- **StorageClass** — defines a *class* of storage with a provisioner, parameters, and reclaim policy. Enables dynamic provisioning.

**Access modes (the exam asks):**
- `ReadWriteOnce` (RWO) — one node R/W.
- `ReadOnlyMany` (ROX) — many nodes RO.
- `ReadWriteMany` (RWX) — many nodes R/W (NFS, CephFS).
- `ReadWriteOncePod` (RWOP) — exactly one **Pod** R/W (since 1.22, GA 1.29). Tighter than RWO.

**Reclaim policies:** `Retain` (keep data, manual cleanup), `Delete` (default for dynamic — deletes the underlying volume), ~~`Recycle`~~ (deprecated).

---

## 2. Networking & Services (part of Kubernetes 46% + Orchestration 22%)

### The 4 requirements of the cluster network model

1. Pods can communicate with all other Pods **without NAT**.
2. Nodes can communicate with all Pods without NAT.
3. The Pod sees itself with the same IP that others see it with.
4. Containers inside a Pod share a network namespace (same `localhost`).

The **CNI plugin** (Cilium, Calico, Flannel, Weave, AWS VPC CNI) implements these.

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

### NetworkPolicy

- **Pod-level firewall.** Selects Pods by label, controls ingress/egress.
- **Default is allow-all** — until you create *any* NetworkPolicy that selects a Pod, then everything *not* allowed is denied.
- Common pattern: a `default-deny-all` policy, then allow what you need.
- **Requires a CNI that supports it** (Calico, Cilium yes; Flannel needs an extension).

---

## 3. Container Orchestration & Open Standards (22%)

### OCI (Open Container Initiative) — 3 specs

| Spec | What it standardizes |
|---|---|
| **Image-spec** | The on-disk/registry layout: manifest, config, layers (tarballs), digests. |
| **Runtime-spec** | How a runtime configures and executes a container (config.json, namespaces, cgroups). |
| **Distribution-spec** | The HTTP API for pushing/pulling images to/from a registry. |

### CRI (Container Runtime Interface)

- A **gRPC API** between the kubelet and the container runtime. Vendor-neutral.
- **dockershim was removed in 1.24.** Docker is no longer a directly-supported runtime; you use containerd, CRI-O, or another CRI-compliant runtime.
- The runtime *can* still read images Docker built (they're OCI images).

### Runtime hierarchy

| Layer | Examples | What it does |
|---|---|---|
| **High-level runtime** | **containerd**, **CRI-O** | Image pulls, network, lifecycle management; talks to kubelet over CRI; delegates to a low-level runtime. |
| **Low-level runtime** | **runc** (reference impl), crun | Actually creates the container — namespaces, cgroups, syscall isolation. |
| **Sandboxed runtimes** | **gVisor** (user-space kernel), **Kata Containers** (lightweight VMs) | Stronger isolation at higher overhead. Used for multi-tenant or untrusted workloads. |

**TRAP:** containerd is *not* a low-level runtime — it's the layer **above** runc.

---

## 4. Security: 4Cs, PSA, RBAC

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

**Three profiles (rules):**

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

**TRAP:** modes can be combined per namespace (enforce one profile, audit a stricter one). Version-pin the profile so an upgrade can't silently change behaviour.

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

---

## 5. Cloud Native Architecture & Delivery (16%)

### 12-Factor App

Memorize the names; the questions usually quote a scenario and ask which factor it violates.

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

### Deployment strategies

| Strategy | What happens | Resource cost | Risk |
|---|---|---|---|
| **Recreate** | Kill all old, start all new. | Low | **Downtime.** |
| **RollingUpdate** (Deployment default) | Replace incrementally; tunable via `maxSurge`, `maxUnavailable`. | Slightly extra during rollout | Mid — both versions serve briefly. |
| **Blue-Green** | Two parallel environments; flip traffic at once. | **2× resources** during the switch. | Low — instant rollback by flipping back. |
| **Canary** | Send a small % of traffic to v2, ramp up. | Slight extra. | Lowest — fail closes the canary, not prod. Tools: **Argo Rollouts**, **Flagger**. |
| **A/B test** | Route by user attribute (header, cookie). | Slight extra. | Not strictly a deploy strategy — a feature-rollout strategy. |

**TRAP:** RollingUpdate is the *default* for `Deployment`. StatefulSet defaults to `RollingUpdate` too but with a **partition** option for canaried stateful rollouts.

### GitOps

- **Git is the source of truth.** Cluster state is reconciled to match the repo.
- **Pull-based:** an in-cluster agent (ArgoCD, Flux) watches the repo and applies changes. Beats push-based CD because no external system needs cluster credentials.
- Auditable, rollback-by-revert, declarative.
- Two big tools: **Argo CD** (UI-heavy, app-centric), **Flux** (modular, Kustomize/Helm-native).

### Helm vs Kustomize

| | **Helm** | **Kustomize** |
|---|---|---|
| Approach | Templating engine + package manager (charts). | Overlay engine — patches a base. No templating, plain YAML. |
| Versioning | Chart versions, releases, rollback via Helm history. | Git-based; integrates with Argo / Flux. |
| Strength | Distribution, dependency management, third-party charts. | Simplicity, no templating syntax, kubectl native (`kubectl apply -k`). |

### CI vs CD vs CD

- **Continuous Integration** — every change is built and tested automatically.
- **Continuous Delivery** — every passing build is *deployable*; release is a manual click.
- **Continuous Deployment** — every passing build is *deployed* automatically.

### Service mesh (one level above Kubernetes networking)

- Sidecar (or sidecar-less, like Cilium / Ambient Istio) proxy intercepts all Pod traffic.
- **Data plane** — the proxies (Envoy is the dominant data plane).
- **Control plane** — configures the proxies (istiod, Linkerd).
- Provides: **mTLS** between services, retries/timeouts, traffic splitting, observability metrics, policy enforcement.
- Big names: **Istio**, **Linkerd**, **Consul Connect**, **Cilium service mesh**.

---

## 6. Observability (8%)

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

### Prometheus metric types

| Type | Behaviour | Examples |
|---|---|---|
| **Counter** | Monotonically increasing (resets only on restart). | `http_requests_total`, `errors_total`. Use `rate()` to query. |
| **Gauge** | Goes up and down. | `memory_in_use_bytes`, `pods_pending`. |
| **Histogram** | Bucketed observations; calculates quantiles **at query time** on the server. | `request_duration_seconds_bucket`. Aggregates across instances. |
| **Summary** | Calculates quantiles **on the client**. | `request_duration_seconds_summary`. Doesn't aggregate well. |

**TRAP:** Histogram > Summary for distributed systems, because Summary's quantiles can't be averaged across instances.

### Health probes — the most-confused topic in this section

| Probe | Failure action | Use it for |
|---|---|---|
| **liveness** | **Restart** the container. | "Is the app alive, or stuck in a deadlock?" |
| **readiness** | Remove Pod from Service endpoints (no traffic). | "Is the app ready to serve right now?" Slow warm-up, dependency-down. |
| **startup** | Suspend liveness/readiness checks until it passes. | Slow-starting apps that would otherwise be killed by liveness. |

**TRAP:** if your liveness probe hits `/` and the dependency DB is down, you'll *restart* a perfectly healthy app forever. Use **readiness** for "depends on something else" checks.

---

## 7. FinOps (part of App Delivery 8%)

### Phases

| Phase | What it looks like |
|---|---|
| **Inform** | Visibility, tagging, cost allocation, dashboards. "How much are we spending and on what?" |
| **Optimize** | Rightsizing, reserved instances / savings plans, autoscaling, removing idle resources. "How do we spend less without breaking anything?" |
| **Operate** | Automation, governance, cultural ownership. "How do we keep it that way without manual effort?" |

### Maturity levels

| Level | Behaviour |
|---|---|
| **Crawl** | Manual, reactive, ad-hoc. A single person checks the bill at month-end. |
| **Walk** | Formalized processes, KPIs, regular reviews. |
| **Run** | Automated and embedded in the dev workflow; cost is a first-class citizen alongside latency and reliability. |

### Showback vs Chargeback

- **Showback** — present each team their costs. *Information only*.
- **Chargeback** — actually bill the team. Forces accountability.

### Why K8s makes this hard

Shared nodes, dynamic scaling, and per-Pod resource requests/limits mean you can't just look at a VM's bill. Tools like **OpenCost** and **Kubecost** allocate node costs to namespaces / labels / Pods.

---

## 8. CNCF Landscape — quick map

You don't need to memorize every project, but know the **canonical project for each function** and that **Graduated** = mature, production-ready.

| Function | Project(s) |
|---|---|
| **Container runtime** | containerd, CRI-O |
| **Orchestration** | Kubernetes |
| **Packaging** | Helm, Kustomize |
| **CNI** | Cilium, Calico, Flannel |
| **Service mesh** | Istio, Linkerd, Consul |
| **Service proxy / API gateway** | Envoy, NGINX, Contour, Emissary |
| **Storage** | Rook (Ceph), Longhorn, OpenEBS, MinIO |
| **GitOps / CD** | Argo CD, Flux |
| **CI** | Tekton, Argo Workflows |
| **Metrics** | Prometheus, Thanos, Cortex |
| **Logging** | Fluent Bit, Fluentd, Loki |
| **Tracing** | Jaeger, Zipkin, Tempo, OpenTelemetry |
| **Policy / security** | OPA / Gatekeeper, Kyverno, Falco, Trivy |
| **Cost** | OpenCost |
| **Serverless** | Knative, KEDA |
| **Service discovery** | CoreDNS, etcd |

**CNCF maturity levels:**

| Level | Bar |
|---|---|
| **Sandbox** | Early-stage, experimental. Welcomed in. |
| **Incubating** | Real production use, three independent end users, healthy contributors. |
| **Graduated** | Mature governance, security audit, broad adoption. (Kubernetes, Prometheus, Helm, Envoy, Argo, Flux, etcd, containerd, OpenTelemetry, Cilium, Istio, Linkerd, CoreDNS, Fluentd…) |

---

## 9. Common exam traps (X vs Y)

| | They look alike, but… |
|---|---|
| **DaemonSet vs Deployment** | DaemonSet runs **one Pod per node** (bypasses the scheduler). Deployment runs **N replicas anywhere**. |
| **StatefulSet vs Deployment** | StatefulSet gives **stable network identity + per-Pod storage**. Use for DBs / clustered apps. |
| **HPA vs VPA vs CA** | HPA = scale Pod **count** horizontally on metrics. VPA = adjust Pod **resource requests** vertically. CA = scale **node count** when Pods can't be scheduled. **Don't run HPA + VPA on the same metric.** |
| **ClusterIP vs NodePort vs LoadBalancer** | Each is a strict superset. LoadBalancer ⊇ NodePort ⊇ ClusterIP. |
| **ConfigMap vs Secret** | Both store key-value config. Secret is base64-encoded, **not encrypted by default** — same trust level as ConfigMap unless you enable encryption-at-rest. |
| **Volume vs PV vs PVC** | Volume = Pod-level. PV = cluster-level resource. PVC = a user's claim against a PV. |
| **Labels vs Annotations** | **Labels** are queryable selectors (`app=web`). **Annotations** are arbitrary metadata, not selectable. |
| **Init container vs sidecar** | Init runs to completion *before* the main container. Sidecar (1.29+ as `restartPolicy: Always`) runs *alongside* it. |
| **Liveness vs readiness** | Liveness restarts. Readiness gates traffic. |
| **Counter vs Gauge** | Counter only goes up. Gauge moves both ways. |
| **Histogram vs Summary** | Histogram aggregates server-side (good for distributed). Summary computes quantiles client-side (doesn't aggregate). |
| **Helm vs Kustomize** | Helm = templates + chart packaging. Kustomize = overlays on plain YAML. |
| **GitOps push vs pull** | GitOps is **pull**-based — agent in-cluster watches Git. Push is plain CD with creds outside the cluster. |
| **Showback vs Chargeback** | Showback shows the bill. Chargeback collects it. |
| **Sandbox / Incubating / Graduated** | Sandbox = experimental. Incubating = production-used. Graduated = mature + audited. |

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

---

## 11. The morning-of read

If you only have 10 minutes:

1. **Request flow:** Authn → Authz → Mutating → Validating → etcd. Mutating *before* validating.
2. **Scheduler:** filter, then score.
3. **dockershim removed in 1.24.** Default runtime is containerd.
4. **PSA profiles:** Privileged, Baseline, Restricted. **Modes:** enforce, audit, warn. PSP is dead since 1.25.
5. **Service types stack:** ClusterIP ⊂ NodePort ⊂ LoadBalancer. ExternalName is a CNAME. Headless = `clusterIP: None`.
6. **EndpointSlices replaced Endpoints.** Gateway API GA in 1.29.
7. **Sidecar containers GA in 1.29** (`restartPolicy: Always` on an init container).
8. **Liveness restarts; readiness gates traffic; startup defers liveness.**
9. **HPA scales Pods. VPA adjusts requests. CA scales nodes.** Don't combine HPA + VPA on the same metric.
10. **Histogram > Summary** for distributed systems.
11. **GitOps is pull-based.** Argo CD, Flux.
12. **12-Factor:** config in env, processes stateless, logs as streams, fast startup + graceful shutdown.
13. **FinOps:** Inform → Optimize → Operate. Crawl → Walk → Run.
14. **CNCF maturity:** Sandbox → Incubating → Graduated. Kubernetes, Prometheus, Helm, Envoy, Argo are graduated.
15. **Read every option.** When two answers are close, the more specific one is usually right.

Good luck. 🚀

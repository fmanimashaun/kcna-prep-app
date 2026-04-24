// Import the 60-question KCNA Google Form (practice exam) into questions.json.
// Skips multi-select items (form questions #19 and #48 — schema is single-answer only).
// Dedupes against existing questions via Jaccard similarity on meaningful tokens.
// Run: node scripts/import-form-questions.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'src/data/questions.json');
const CONFIG_PATH = path.join(ROOT, 'src/data/config.json');

// Form questions with answers, explanations, and domain tags.
// `correct` is the zero-based index into `opts`. Skipped: #19 and #48 (multi-select).
const FORM_QUESTIONS = [
  { q: "Select the characteristics of cloud native applications",
    opts: ["Self-healing","Easy to maintain","Decoupled services","All of the above"],
    correct: 3, d: "arch",
    expl: "Cloud native applications are designed to be resilient (self-healing), operable/maintainable through automation, and loosely coupled (decoupled services) to scale and evolve independently." },
  { q: "Select advantages of cloud native architecture",
    opts: ["High cost and maintenance","High automation and scalability","High security risk and complexity","All of the above"],
    correct: 1, d: "arch",
    expl: "Cloud native architectures bring high automation (declarative orchestration, CI/CD, GitOps) and scalability (horizontal scaling, autoscaling). They reduce ops cost and improve security when used correctly." },
  { q: "The Open Container Initiative standards are for",
    opts: ["Runtime, image and build","Runtime, image and distribution","Image, build and distribution","Storage, build and image"],
    correct: 1, d: "arch",
    expl: "OCI publishes three specifications: Runtime Spec (how to execute a container), Image Spec (how images are packaged), and Distribution Spec (how images are pushed/pulled via registries)." },
  { q: "Cloud applications are usually scaled by",
    opts: ["Vertical scaling","Horizontal scaling","Circular scaling","Triangular scaling"],
    correct: 1, d: "arch",
    expl: "Horizontal scaling — adding more instances behind a load balancer — is the dominant model for stateless cloud native apps. Vertical scaling (bigger machines) is bounded by hardware limits and causes downtime." },
  { q: "Serverless computing does not require",
    opts: ["Servers","Provisioning and operating infrastructure","Application Code","Network"],
    correct: 1, d: "arch",
    expl: "Servers still exist under the hood — the word 'serverless' means developers don't provision or operate them. The platform handles capacity, patching, scaling, and runtime lifecycle." },
  { q: "The twelve-factor app is a guideline to",
    opts: ["Develop cloud native applications","Build containers","Deploy on Kubernetes","All of the above"],
    correct: 0, d: "arch",
    expl: "The 12-factor methodology (from Heroku) is a set of guidelines for building portable, scalable, cloud-suited applications — config in env, logs as streams, disposability, and so on. It predates Kubernetes." },
  { q: "Which of the following is not a standard used for container orchestration?",
    opts: ["Container Network Interface (CNI)","Container Deployment Interface (CDI)","Container Runtime Interface (CRI)","Container Storage Interface (CSI)"],
    correct: 1, d: "arch",
    expl: "CNI (networking), CRI (runtime), and CSI (storage) are real Kubernetes interface standards. 'Container Deployment Interface (CDI)' is a distractor — deployment is handled by controllers, not a standardized plugin interface." },
  { q: "Which of the following is not a key metric for Site Reliability Engineers?",
    opts: ["Service level agreement (SLA)","Service level indicator (SLI)","Service level objective (SLO)","Service level requirement (SLR)"],
    correct: 3, d: "obs",
    expl: "SRE uses SLIs (what you measure), SLOs (internal targets), and SLAs (external contractual promises). 'SLR' is not an SRE term." },
  { q: "Containers can help with which of the following? (best answer)",
    opts: ["Dependency management of applications","More efficient use of hardware resources","Writing secure application code","All of the above"],
    correct: 3, d: "k8s",
    expl: "Containers package dependencies with the app (solving 'works on my machine') and allow denser packing onto hosts compared to VMs. They can also reduce the surface area for some security issues (though they don't write secure code for you)." },
  { q: "The usage of containers and virtual machines are mutually exclusive. True or False?",
    opts: ["True","False"],
    correct: 1, d: "k8s",
    expl: "False. Containers commonly run inside VMs — many managed Kubernetes services provision VM worker nodes and run containers on top. The two technologies complement rather than replace each other." },
  { q: "Container isolation is achieved by which Linux kernel features?",
    opts: ["Namespaces and cgroups","Container Network Interface","Security Groups and Firewall","Service Mesh"],
    correct: 0, d: "k8s",
    expl: "Linux namespaces isolate what a process can see (PID, network, mount, user, UTS, IPC). Cgroups limit what a process can use (CPU, memory, I/O). Together they're the core primitives behind container isolation." },
  { q: "A Dockerfile contains instructions on how to do what?",
    opts: ["Install Docker","Start multiple containers","Install Kubernetes","Build a container image"],
    correct: 3, d: "k8s",
    expl: "A Dockerfile is the declarative build recipe for a container image — base image, copied files, installed packages, entrypoint. `docker build` reads it and produces an OCI image." },
  { q: "Which command can be used to build a container image with Docker?",
    opts: ["docker build","docker create","docker start","docker image"],
    correct: 0, d: "k8s",
    expl: "`docker build` constructs an image from a Dockerfile. `docker create` makes a stopped container from an existing image, `docker start` runs a container, `docker image` is a management subcommand (list, rm)." },
  { q: "Sort the 4C's of cloud native security, starting from the inside.",
    opts: ["Code, container, cloud, cluster","Cluster, container, cloud, code","Code, container, cluster, cloud","Container, cluster, cloud, code"],
    correct: 2, d: "orch",
    expl: "The 4C's of Cloud Native Security, from innermost layer outward: Code → Container → Cluster → Cloud. Each layer secures the next one out; weaknesses in an inner layer can't be fully compensated by outer layers." },
  { q: "Which problems can be solved with a container orchestration system?",
    opts: ["Scheduling containers","Managing resources like CPU and memory","Providing a container network","All of the above"],
    correct: 3, d: "orch",
    expl: "Orchestrators like Kubernetes schedule workloads onto nodes, enforce resource requests/limits, and provide a cluster network (via a CNI plugin) so pods can talk to each other." },
  { q: "What do you call the automatic process of discovering services on a network?",
    opts: ["Service Mesh","Service Registry","Service Discovery","Service IP"],
    correct: 2, d: "orch",
    expl: "Service discovery is the mechanism by which clients locate service instances dynamically — in Kubernetes, via DNS lookups on Service names. A service mesh *uses* service discovery but adds a proxy layer on top." },
  { q: "What are the main parts of a Service Mesh?",
    opts: ["Controller-Manager and DNS","Data Plane and Control Plane","Virus and Malware scanner","Dockerfile and Network"],
    correct: 1, d: "orch",
    expl: "A service mesh is split into a data plane (sidecar proxies that handle actual traffic) and a control plane (configures the proxies with policies, certificates, routing rules)." },
  { q: "Kubernetes was originally designed and developed by",
    opts: ["Google","Facebook","Amazon","Microsoft"],
    correct: 0, d: "arch",
    expl: "Kubernetes originated at Google, based on lessons from their internal Borg system. Google open-sourced it in 2014 and donated it to the CNCF in 2015." },
  { q: "What tool can be used to set up a Kubernetes cluster?",
    opts: ["Minikube","Kubeadm","Rancher","All of the above"],
    correct: 3, d: "k8s",
    expl: "Minikube (local dev), kubeadm (production-grade bootstrap), and Rancher (multi-cluster management) all set up Kubernetes clusters, each for a different scale of use." },
  { q: "Sort the three stages a request needs to go through in the api-server.",
    opts: ["Admission Control, Authorization, Authentication","Authentication, Admission Control, Authorization","Authentication, Authorization, Admission Control","Authorization, Authentication, Admission Control"],
    correct: 2, d: "k8s",
    expl: "The API server processes requests in this order: Authentication (who are you?) → Authorization (are you allowed?) → Admission Control (should this specific object be accepted or mutated?)." },
  { q: "Which container runtime is marked as deprecated by Kubernetes?",
    opts: ["CRI-O","containerd","Docker","gvisor"],
    correct: 2, d: "orch",
    expl: "Direct Docker support via dockershim was deprecated in Kubernetes 1.20 and removed in 1.24. Kubernetes now talks to OCI-compliant runtimes via the CRI — containerd (which Docker itself uses under the hood) and CRI-O are standard choices." },
  { q: "Which Kubernetes component is responsible for scheduling?",
    opts: ["kube-apiserver","kube-scheduler","kube-controller-manager","kube-proxy"],
    correct: 1, d: "k8s",
    expl: "The kube-scheduler watches for pods without an assigned node and picks one based on resource requests, affinity, taints, and other constraints." },
  { q: "Kubernetes objects can be described in a data-serialization language called",
    opts: ["HTML","PHP","YAML","Python"],
    correct: 2, d: "k8s",
    expl: "Kubernetes manifests are almost always written in YAML (sometimes JSON for APIs). YAML is human-readable and well-suited to declarative configuration." },
  { q: "Which of the following is not a required field in a Kubernetes object?",
    opts: ["kind","spec","containers","metadata"],
    correct: 2, d: "k8s",
    expl: "The required top-level fields in a Kubernetes manifest are apiVersion, kind, metadata, and spec (for most resources). `containers` is a field nested inside a Pod's spec, not a top-level required field." },
  { q: "What is the name of the official Kubernetes command line interface?",
    opts: ["containerctl","kubectl","kube-tool","podctl"],
    correct: 1, d: "k8s",
    expl: "kubectl (often pronounced 'kube-control' or 'kube-cuddle') is the official CLI for interacting with the Kubernetes API server." },
  { q: "How do you configure a container to run in a pod before your main container(s)?",
    opts: ["bootstrapContainer","initContainer","priorityContainer","startContainer"],
    correct: 1, d: "k8s",
    expl: "Init containers run sequentially before the main application containers start, and must complete successfully. They're ideal for setup tasks like schema migrations, fetching configuration, or waiting for dependencies." },
  { q: "Which workload object does not exist in Kubernetes?",
    opts: ["ReplicaSet","Deployment","ApplicationSet","StatefulSet"],
    correct: 2, d: "k8s",
    expl: "ReplicaSet, Deployment, StatefulSet (and DaemonSet, Job, CronJob) are built-in Kubernetes workload resources. 'ApplicationSet' is an Argo CD CRD, not a core Kubernetes workload." },
  { q: "Which service types exist in Kubernetes?",
    opts: ["NodePort","ClusterIP","LoadBalancer","ExternalName","All of the above"],
    correct: 4, d: "orch",
    expl: "Kubernetes Services support four types: ClusterIP (default, internal), NodePort (opens a port on every node), LoadBalancer (provisions a cloud LB), and ExternalName (DNS CNAME to an external hostname)." },
  { q: "Ingress objects can be used to configure HTTP(S) routing rules. True or False?",
    opts: ["True","False"],
    correct: 0, d: "orch",
    expl: "True. Ingress is the Kubernetes resource for L7 HTTP/S routing — host- and path-based rules, TLS termination. An Ingress controller (NGINX, Traefik, etc.) reads these rules and implements them." },
  { q: "Which Kubernetes object can be used to request storage?",
    opts: ["Container Storage Interface","PersistentVolume","PersistentVolumeClaim","StorageClass"],
    correct: 2, d: "orch",
    expl: "A PersistentVolumeClaim (PVC) is how a user/Pod requests storage. It binds to a matching PersistentVolume (PV), which represents the actual storage. StorageClass defines how PVs are dynamically provisioned; CSI is the plugin interface." },
  { q: "What is the main difference between ConfigMaps and Secrets?",
    opts: ["Base64 encoding","Pretty formatting","Encryption","Syntax Highlighting"],
    correct: 0, d: "k8s",
    expl: "Secrets are base64-encoded, ConfigMaps are plain text. Base64 is encoding, not encryption — Secrets are not encrypted at rest by default (enable etcd encryption for that)." },
  { q: "Which autoscalers are available in Kubernetes?",
    opts: ["Horizontal Pod Autoscaler","Cluster Autoscaler","Vertical Pod Autoscaler","All of the above"],
    correct: 3, d: "arch",
    expl: "All three exist: HPA scales pod replicas, VPA adjusts pod resource requests/limits, Cluster Autoscaler adds/removes nodes. They operate on different axes and can complement each other." },
  { q: "What is the name of a popular version control tool?",
    opts: ["Docker","git","Kubernetes","containerd"],
    correct: 1, d: "del",
    expl: "Git is the dominant distributed version control system. The others are containerization/orchestration tools that typically *use* git for their source and config, but aren't version control themselves." },
  { q: "Version control systems can be used as a basis to manage which of these?",
    opts: ["Source code","Configuration","Infrastructure","All of the above"],
    correct: 3, d: "del",
    expl: "Modern engineering treats all of these as code: application source, configuration (ConfigMaps/Helm values), and infrastructure (Terraform, Kubernetes manifests). GitOps builds on this principle." },
  { q: "What does CI/CD stand for?",
    opts: ["Continuous Installation/Continuous Downtime","Continuous Integration/Continuous Delivery","Container Interface/Container Deployment","Continuous Infrastructure/Continuous Deployment"],
    correct: 1, d: "del",
    expl: "CI = Continuous Integration (automated build + test on every commit). CD = Continuous Delivery (every change is always in a deployable state) or Continuous Deployment (every change auto-deploys to production)." },
  { q: "How can you automate the build, test and deployment of an application?",
    opts: ["CI/CD pipeline","CI/CD branch","CI/CD repository","CI/CD network"],
    correct: 0, d: "del",
    expl: "A CI/CD pipeline defines the stages (build → test → scan → deploy) an artifact moves through automatically. Tools like Jenkins, GitHub Actions, GitLab CI, and Argo CD implement pipelines." },
  { q: "Flux is built with the",
    opts: ["CI/CD Toolkit","Cluster Toolkit","GitOps Toolkit","Infrastructure Toolkit"],
    correct: 2, d: "del",
    expl: "Flux v2 is composed of a set of Kubernetes controllers collectively called the GitOps Toolkit — source-controller, kustomize-controller, helm-controller, notification-controller, image-automation-controller." },
  { q: "Flux and ArgoCD are popular GitOps tools. They use a push-based approach.",
    opts: ["True","False"],
    correct: 1, d: "del",
    expl: "False. Flux and ArgoCD are pull-based: an agent runs inside the cluster and pulls desired state from Git, reconciling continuously. Pull is considered more secure because the cluster doesn't need inbound credentials from CI." },
  { q: "Observability is the same as monitoring. True or False?",
    opts: ["True","False"],
    correct: 1, d: "obs",
    expl: "False. Monitoring checks predefined signals against thresholds ('known unknowns'). Observability lets you ask arbitrary questions about system state from its outputs (logs, metrics, traces) — addressing 'unknown unknowns'." },
  { q: "Which of the following is typical telemetry data?",
    opts: ["Metrics","Logs","Traces","All of the above"],
    correct: 3, d: "obs",
    expl: "Metrics, logs, and traces are the three pillars of observability. OpenTelemetry provides a vendor-neutral way to generate and export all three." },
  { q: "How can you show the logs of a previously terminated container named ruby in the web-1 pod?",
    opts: ["kubectl logs web-1 ruby","kubectl logs -p web-1 ruby","kubectl web-1 ruby -p","kubectl logs -p -c ruby web-1"],
    correct: 3, d: "obs",
    expl: "Use `-p` (--previous) to fetch logs from the prior instance of a container that has since restarted or terminated. Use `-c` to specify a container when the pod has multiple. Correct: `kubectl logs -p -c ruby web-1`." },
  { q: "What do you call the pattern where you add a second container to your pod to collect and ship logs?",
    opts: ["Cluster-level logging","Node-level logging","Sidecar container logging","Application-level logging"],
    correct: 2, d: "obs",
    expl: "The sidecar pattern adds an auxiliary container to the pod. For logging, a sidecar can tail the app's log files and ship them to an aggregator — without modifying the main application." },
  { q: "What is a good format for structured logging?",
    opts: ["YAML","JSON","XML","HTML"],
    correct: 1, d: "obs",
    expl: "JSON is the de facto format for structured logs — compact, machine-parseable, supported by all aggregators (Loki, Elasticsearch, CloudWatch). One JSON object per line." },
  { q: "What kind of software is Prometheus?",
    opts: ["Software to manage containers","Software to collect and store metrics","Software to manage virtual machines","Software to collect and store logs"],
    correct: 1, d: "obs",
    expl: "Prometheus is a time-series database and monitoring system for metrics. It scrapes HTTP endpoints, stores the data in its TSDB, and exposes PromQL for querying and alerting." },
  { q: "Which Prometheus metric type should be used for a value that only increases (e.g., an error_count)?",
    opts: ["Histogram","Gauge","Counter","Summary"],
    correct: 2, d: "obs",
    expl: "Counters monotonically increase (or reset to zero on restart). Use them for event counts like requests, errors, or bytes sent. Gauges go up and down; histograms/summaries track distributions." },
  { q: "What is the front end for the Kubernetes control plane?",
    opts: ["kube-scheduler","etcd","kube-controller-manager","kube-apiserver"],
    correct: 3, d: "k8s",
    expl: "The kube-apiserver is the only component that talks to etcd and is the entry point for all cluster interactions. Every other component (schedulers, controllers, kubelets, kubectl) communicates through it." },
  { q: "Which key-value store is used as Kubernetes' backing store for all cluster data?",
    opts: ["etcd","kube-scheduler","kube-apiserver","kubelet"],
    correct: 0, d: "k8s",
    expl: "etcd is the distributed, consistent key-value store that holds all cluster state. Lose etcd = lose the cluster. Production clusters run etcd as a 3- or 5-node cluster for high availability." },
  { q: "Which component watches newly created pods that have no node assigned, and selects a node for them to run on?",
    opts: ["kube-proxy","kube-scheduler","kube-apiserver","kubelet"],
    correct: 1, d: "k8s",
    expl: "The kube-scheduler is specifically responsible for this. It filters candidate nodes (that can satisfy the pod's requests) and scores them, then binds the pod to the best node via the API server." },
  { q: "Which of the following runs controllers?",
    opts: ["kube-proxy","kube-scheduler","kube-apiserver","kube-controller-manager"],
    correct: 3, d: "k8s",
    expl: "The kube-controller-manager bundles core controllers — Node, ReplicaSet, Deployment, Endpoints, ServiceAccount, and more — into a single binary. Each controller runs a reconciliation loop." },
  { q: "Which agent runs on each node in a Kubernetes cluster?",
    opts: ["etcd","kube-scheduler","kube-apiserver","kubelet"],
    correct: 3, d: "k8s",
    expl: "kubelet runs on every node. It talks to the API server, receives pod specs assigned to its node, and instructs the container runtime (via CRI) to actually run the containers." },
  { q: "Which type of components make global decisions about the cluster in Kubernetes?",
    opts: ["Add on components","Extra components","Node components","Master components"],
    correct: 3, d: "k8s",
    expl: "The control plane (historically called 'master components') — API server, scheduler, controller manager, etcd — makes cluster-wide decisions. Node components (kubelet, kube-proxy) handle local execution." },
  { q: "You can deploy a Kubernetes cluster on",
    opts: ["Cloud","On-prem datacenter","A local machine","All of the above"],
    correct: 3, d: "k8s",
    expl: "Kubernetes runs anywhere Linux does. Managed services (EKS, GKE, AKS) in the cloud, self-managed on-prem, and local tools like Minikube, kind, or k3d for a developer laptop." },
  { q: "Which tool runs a single-node cluster in a virtual machine on your personal computer?",
    opts: ["kubectl","kube-proxy","Container runtime","Minikube"],
    correct: 3, d: "k8s",
    expl: "Minikube provisions a local single-node Kubernetes cluster (historically inside a VM, now optionally via containers). It's the classic way to experiment locally without cloud resources." },
  { q: "Autoscaling in Kubernetes is supported on",
    opts: ["AWS","Google Compute Engine (GCE)","Google Container Engine (GKE)","All of the above"],
    correct: 3, d: "arch",
    expl: "Cluster Autoscaler has integrations for all major cloud providers (AWS, GCP, Azure, and others). HPA and VPA are provider-agnostic — they work on any Kubernetes cluster with a metrics source." },
  { q: "A Kubernetes container image encapsulates",
    opts: ["an application and all of its dependencies","an application","software dependencies","none of these"],
    correct: 0, d: "k8s",
    expl: "A container image bundles the application binary together with its runtime dependencies (libraries, files, config) into a single immutable artifact that runs the same everywhere." },
  { q: "kubelet performs garbage collection for images every",
    opts: ["1 minute","5 minutes","10 minutes","30 minutes"],
    correct: 1, d: "k8s",
    expl: "By default, kubelet runs image garbage collection every 5 minutes (configurable via --image-minimum-gc-age and related flags). It removes unused images when disk usage crosses high-water thresholds." },
  { q: "Minikube can be installed on",
    opts: ["Linux","macOS","Windows","All of the above"],
    correct: 3, d: "k8s",
    expl: "Minikube is cross-platform: binaries and packages are available for Linux, macOS, and Windows. It's the easiest way to run Kubernetes on any developer workstation." },
];

// Build question objects and append.
const existing = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
const existingIds = new Set(existing.map(q => q.id));

// Find the next available q#### id.
let nextId = 1;
for (const q of existing) {
  const m = q.id && q.id.match(/^q(\d+)$/);
  if (m) nextId = Math.max(nextId, parseInt(m[1], 10) + 1);
}

// Dedupe by Jaccard similarity on meaningful tokens.
const STOP = new Set([
  'the','a','an','is','are','was','were','of','to','in','on','for','and','or','but',
  'with','as','at','by','from','that','this','these','those','it','its','be','been',
  'which','what','how','when','where','who','why','can','could','should','would','will',
  'not','no','do','does','did','has','have','had','than','then','you','your','we','our',
  'if','so','more','most','less','least','also','about','into','only','same','other',
  'following','used','use','uses','make','makes','made','run','runs','running','single',
]);

function tokens(s) {
  return new Set(
    (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter(t => t.length > 2 && !STOP.has(t))
  );
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const existingTokens = existing.map(q => ({ id: q.id, toks: tokens(q.q) }));

const added = [];
const skipped = [];

for (const fq of FORM_QUESTIONS) {
  const fqToks = tokens(fq.q);
  let dup = null;
  for (const ex of existingTokens) {
    if (jaccard(fqToks, ex.toks) >= 0.55) {
      dup = ex.id;
      break;
    }
  }
  if (dup) {
    skipped.push({ q: fq.q, dupOf: dup });
    continue;
  }
  const id = `q${String(nextId).padStart(4, '0')}`;
  nextId += 1;
  added.push({
    q: fq.q,
    opts: fq.opts,
    correct: fq.correct,
    expl: fq.expl,
    d: fq.d,
    src: 'form',
    id,
  });
}

// Write updated questions.json
const updated = [...existing, ...added];
fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(updated, null, 2));

// Update config.json to register the new source if needed
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
if (!config.sources.form) {
  config.sources.form = {
    label: 'Practice Form',
    desc: '60-question KCNA practice exam from a public Google Form',
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('Added "form" source to config.json');
}

console.log(`\nForm questions processed: ${FORM_QUESTIONS.length}`);
console.log(`Added:   ${added.length}`);
console.log(`Skipped: ${skipped.length} (duplicates of existing questions)`);
console.log(`\nNew total in questions.json: ${updated.length}`);

if (skipped.length > 0) {
  console.log('\nSkipped as duplicates:');
  for (const s of skipped) {
    console.log(`  - ${s.q.slice(0, 70)}... (matches ${s.dupOf})`);
  }
}

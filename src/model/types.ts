/**
 * Duet's domain model.
 *
 * A design is a typed graph, not a drawing. Every node is one of a fixed set of
 * cloud primitives with structured properties, and every edge carries a protocol.
 * WebMCP tools and the analysis engine both operate on *this*, never on pixels or
 * the DOM — that's the whole point of the app.
 */

export type NodeKind =
  | 'client'
  | 'cdn'
  | 'loadbalancer'
  | 'service'
  | 'worker'
  | 'queue'
  | 'datastore'
  | 'cache'
  | 'objectstore'
  | 'external';

export const NODE_KINDS: NodeKind[] = [
  'client',
  'cdn',
  'loadbalancer',
  'service',
  'worker',
  'queue',
  'datastore',
  'cache',
  'objectstore',
  'external',
];

export type InstanceSize = 'small' | 'medium' | 'large';

export interface NodeProps {
  /** service / worker: horizontal replica count */
  replicas?: number;
  /** service / worker / datastore / cache: rough instance class */
  instanceSize?: InstanceSize;
  /** datastore: postgres|mysql|mongodb · cache: redis|memcached · queue: sqs|kafka|rabbitmq */
  engine?: string;
  /** datastore / cache / loadbalancer: spread across availability zones */
  multiAz?: boolean;
  /** datastore: a read replica exists */
  replica?: boolean;
  /** service / loadbalancer / cdn: reachable directly from the public internet */
  publicIngress?: boolean;
  /** external: has a real SLA / is a managed offering (vs. best-effort third party) */
  managed?: boolean;
  /** free-text, surfaced to the agent */
  notes?: string;
}

export interface DuetNode {
  id: string;
  kind: NodeKind;
  label: string;
  position: { x: number; y: number };
  props: NodeProps;
}

export type EdgeProtocol = 'http' | 'grpc' | 'sql' | 'cache' | 'queue' | 'event' | 'blob';

export interface DuetEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: EdgeProtocol;
}

export type CloudProvider = 'aws' | 'gcp' | 'cloudflare' | 'generic';

export interface Design {
  name: string;
  provider: CloudProvider;
  region: string;
  nodes: DuetNode[];
  edges: DuetEdge[];
}

/* ------------------------------------------------------------------ proposals */

/** An atomic change the agent proposes. `tempId` lets a proposal wire together
 *  nodes it is itself creating: a later op's `source`/`target` may be a real
 *  node id *or* an earlier op's `tempId`. */
export type Op =
  | {
      op: 'add_node';
      tempId: string;
      kind: NodeKind;
      label: string;
      props?: NodeProps;
      position?: { x: number; y: number };
    }
  | { op: 'update_node'; id: string; label?: string; props?: Partial<NodeProps> }
  | { op: 'remove_node'; id: string }
  | {
      op: 'connect';
      source: string;
      target: string;
      label?: string;
      protocol?: EdgeProtocol;
    }
  | { op: 'disconnect'; source: string; target: string };

export type ProposalStatus = 'pending' | 'applied' | 'rejected' | 'partial';

export interface Proposal {
  id: string;
  title: string;
  rationale?: string;
  ops: Op[];
  createdAt: number;
  status: ProposalStatus;
  /** which op indexes have been applied (for partial approvals) */
  appliedOps?: number[];
}

/* ------------------------------------------------------------------- activity */

export interface ActivityEntry {
  id: string;
  ts: number;
  actor: 'you' | 'agent';
  text: string;
}

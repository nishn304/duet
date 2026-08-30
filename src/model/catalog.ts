/**
 * Per-kind metadata: how a node looks, what it costs, and what counts as a
 * sane connection into it. The cost numbers are deliberately coarse
 * order-of-magnitude USD/month figures — Duet labels them as estimates
 * everywhere they surface, and never pretends to be a billing calculator.
 */
import type { DuetNode, InstanceSize, NodeKind, NodeProps } from './types';

export interface KindMeta {
  kind: NodeKind;
  label: string;
  blurb: string;
  glyph: string;
  accent: string;
  /** kinds that it's normal to see pointing *into* this node (advisory only) */
  expectedSources: NodeKind[];
  stateful: boolean;
  defaultProps: NodeProps;
}

const SIZE_MULT: Record<InstanceSize, number> = { small: 1, medium: 2, large: 4 };
const sizeMult = (p: NodeProps) => SIZE_MULT[p.instanceSize ?? 'small'];

export const CATALOG: Record<NodeKind, KindMeta> = {
  client: {
    kind: 'client',
    label: 'Client',
    blurb: 'Browser or mobile app — the entry point traffic comes from.',
    glyph: '▲',
    accent: '#9aa6b8',
    expectedSources: [],
    stateful: false,
    defaultProps: {},
  },
  cdn: {
    kind: 'cdn',
    label: 'CDN / Edge',
    blurb: 'Edge cache and static asset delivery in front of the origin.',
    glyph: '⌘',
    accent: '#7ee7c7',
    expectedSources: ['client'],
    stateful: false,
    defaultProps: { publicIngress: true },
  },
  loadbalancer: {
    kind: 'loadbalancer',
    label: 'Load Balancer',
    blurb: 'Distributes inbound requests across service replicas.',
    glyph: '⇄',
    accent: '#6ea8fe',
    expectedSources: ['client', 'cdn'],
    stateful: false,
    defaultProps: { publicIngress: true, multiAz: false },
  },
  service: {
    kind: 'service',
    label: 'Service',
    blurb: 'Stateless application or API compute.',
    glyph: '◆',
    accent: '#6ea8fe',
    expectedSources: ['loadbalancer', 'cdn', 'client', 'service'],
    stateful: false,
    defaultProps: { replicas: 1, instanceSize: 'small', publicIngress: false },
  },
  worker: {
    kind: 'worker',
    label: 'Worker',
    blurb: 'Background job / async processor pulling from a queue.',
    glyph: '⚙',
    accent: '#c8a2ff',
    expectedSources: ['queue', 'service'],
    stateful: false,
    defaultProps: { replicas: 1, instanceSize: 'small' },
  },
  queue: {
    kind: 'queue',
    label: 'Queue / Bus',
    blurb: 'Message queue or event bus decoupling producers from consumers.',
    glyph: '≋',
    accent: '#ffcf6e',
    expectedSources: ['service'],
    stateful: true,
    defaultProps: { engine: 'sqs' },
  },
  datastore: {
    kind: 'datastore',
    label: 'Database',
    blurb: 'Primary system of record.',
    glyph: '⛁',
    accent: '#7ee7c7',
    expectedSources: ['service', 'worker'],
    stateful: true,
    defaultProps: { engine: 'postgres', instanceSize: 'small', multiAz: false, replica: false },
  },
  cache: {
    kind: 'cache',
    label: 'Cache',
    blurb: 'In-memory cache for hot reads.',
    glyph: '⚡',
    accent: '#ffcf6e',
    expectedSources: ['service', 'worker'],
    stateful: true,
    defaultProps: { engine: 'redis', instanceSize: 'small', multiAz: false },
  },
  objectstore: {
    kind: 'objectstore',
    label: 'Object Store',
    blurb: 'Blob storage for files, backups, and large artifacts.',
    glyph: '▤',
    accent: '#7ee7c7',
    expectedSources: ['service', 'worker', 'client'],
    stateful: true,
    defaultProps: {},
  },
  external: {
    kind: 'external',
    label: 'External API',
    blurb: 'Third-party service this system depends on.',
    glyph: '☁',
    accent: '#9aa6b8',
    expectedSources: ['service', 'worker'],
    stateful: false,
    defaultProps: { managed: false },
  },
};

export const kindMeta = (k: NodeKind): KindMeta => CATALOG[k];

/** Coarse monthly cost estimate for one node, in USD. */
export function nodeCost(n: DuetNode): number {
  const p = n.props;
  switch (n.kind) {
    case 'client':
      return 0;
    case 'cdn':
      return 20;
    case 'loadbalancer':
      return 18 + (p.multiAz ? 18 : 0);
    case 'service':
      return 15 * (p.replicas ?? 1) * sizeMult(p);
    case 'worker':
      return 12 * (p.replicas ?? 1) * sizeMult(p);
    case 'queue':
      return p.engine === 'kafka' ? 60 : 10;
    case 'datastore':
      return 60 * sizeMult(p) + (p.replica ? 60 * sizeMult(p) : 0) + (p.multiAz ? 40 : 0);
    case 'cache':
      return 25 * sizeMult(p) + (p.multiAz ? 25 : 0);
    case 'objectstore':
      return 5;
    case 'external':
      return 0;
  }
}

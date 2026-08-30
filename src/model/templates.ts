/**
 * Starter designs. Deliberately imperfect — each one has findings for the agent
 * and the human to work through together, which is the whole demo.
 */
import { kindMeta } from './catalog';
import type { Design, DuetEdge, DuetNode, NodeKind } from './types';

let seq = 0;
const nid = () => `t${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function n(
  kind: NodeKind,
  label: string,
  x: number,
  y: number,
  props: DuetNode['props'] = {},
): DuetNode {
  return { id: nid(), kind, label, position: { x, y }, props: { ...kindMeta(kind).defaultProps, ...props } };
}
function e(source: string, target: string, label?: string, protocol?: DuetEdge['protocol']): DuetEdge {
  return { id: nid(), source, target, label, protocol };
}

export interface TemplateDef {
  key: string;
  name: string;
  blurb: string;
  build: () => Design;
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: 'blank',
    name: 'Blank canvas',
    blurb: 'Start from nothing.',
    build: () => ({ name: 'Untitled design', provider: 'generic', region: '', nodes: [], edges: [] }),
  },
  {
    key: 'starter-web',
    name: 'Web app (needs hardening)',
    blurb: 'A single service and one database — no redundancy, no LB. Classic day-one setup.',
    build: () => {
      const client = n('client', 'Web client', 40, 200);
      const api = n('service', 'API', 320, 200, { replicas: 1, publicIngress: true });
      const db = n('datastore', 'Postgres', 620, 200, { engine: 'postgres', multiAz: false });
      return {
        name: 'Web app',
        provider: 'aws',
        region: 'us-east-1',
        nodes: [client, api, db],
        edges: [e(client.id, api.id, 'HTTP', 'http'), e(api.id, db.id, 'reads/writes', 'sql')],
      };
    },
  },
  {
    key: 'starter-jobs',
    name: 'App + background jobs',
    blurb: 'API, worker, queue, DB, and an unbuffered third-party call. Several things to tighten.',
    build: () => {
      const client = n('client', 'Client', 40, 120);
      const cdn = n('cdn', 'CDN', 240, 120);
      const api = n('service', 'API', 460, 120, { replicas: 1, publicIngress: true });
      const q = n('queue', 'Jobs queue', 460, 320, { engine: 'sqs' });
      const worker = n('worker', 'Worker', 720, 320, { replicas: 1 });
      const db = n('datastore', 'Primary DB', 940, 200, { engine: 'postgres' });
      const stripe = n('external', 'Payments API', 720, 40, { managed: false });
      return {
        name: 'App with jobs',
        provider: 'aws',
        region: 'us-east-1',
        nodes: [client, cdn, api, q, worker, db, stripe],
        edges: [
          e(client.id, cdn.id, 'HTTPS', 'http'),
          e(cdn.id, api.id, 'HTTP', 'http'),
          e(api.id, db.id, 'sql', 'sql'),
          e(api.id, q.id, 'enqueue', 'queue'),
          e(api.id, stripe.id, 'charge', 'http'),
          e(q.id, worker.id, 'deliver', 'queue'),
          e(worker.id, db.id, 'sql', 'sql'),
        ],
      };
    },
  },
];

export const templateByKey = (key: string) =>
  TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];

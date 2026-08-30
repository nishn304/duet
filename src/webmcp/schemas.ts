/**
 * JSON Schemas for the WebMCP tool inputs. Kept in one place so the agent-facing
 * contract is easy to read and review.
 */
import { NODE_KINDS } from '../model/types';

const nodeKindEnum = [...NODE_KINDS];

export const nodePropsSchema = {
  type: 'object',
  description: 'Structured properties. Only the keys relevant to the component kind are used.',
  properties: {
    replicas: { type: 'integer', minimum: 1, description: 'service/worker: horizontal replica count' },
    instanceSize: { type: 'string', enum: ['small', 'medium', 'large'] },
    engine: {
      type: 'string',
      description: 'datastore: postgres|mysql|mongodb · cache: redis|memcached · queue: sqs|kafka|rabbitmq',
    },
    multiAz: { type: 'boolean', description: 'datastore/cache/loadbalancer: spread across availability zones' },
    replica: { type: 'boolean', description: 'datastore: a read replica exists' },
    publicIngress: { type: 'boolean', description: 'service/loadbalancer/cdn: reachable from the public internet' },
    managed: { type: 'boolean', description: 'external: has a real SLA / managed offering' },
    notes: { type: 'string' },
  },
  additionalProperties: false,
} as const;

const opSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        op: { const: 'add_node' },
        tempId: {
          type: 'string',
          description:
            'A local handle for this new node (e.g. "lb1"). Later ops in the same proposal can use it as a source/target before the node has a real id.',
        },
        kind: { type: 'string', enum: nodeKindEnum },
        label: { type: 'string' },
        props: nodePropsSchema,
      },
      required: ['op', 'tempId', 'kind', 'label'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        op: { const: 'update_node' },
        id: { type: 'string', description: 'Existing node id (from get_design).' },
        label: { type: 'string' },
        props: nodePropsSchema,
      },
      required: ['op', 'id'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        op: { const: 'remove_node' },
        id: { type: 'string' },
      },
      required: ['op', 'id'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        op: { const: 'connect' },
        source: { type: 'string', description: 'Node id or an add_node tempId from this proposal.' },
        target: { type: 'string', description: 'Node id or an add_node tempId from this proposal.' },
        label: { type: 'string', description: 'e.g. "reads", "enqueue", "HTTP"' },
        protocol: { type: 'string', enum: ['http', 'grpc', 'sql', 'cache', 'queue', 'event', 'blob'] },
      },
      required: ['op', 'source', 'target'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        op: { const: 'disconnect' },
        source: { type: 'string' },
        target: { type: 'string' },
      },
      required: ['op', 'source', 'target'],
      additionalProperties: false,
    },
  ],
} as const;

export const proposeChangesSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short summary of the change set, shown in the Approval Lane.' },
    rationale: { type: 'string', description: 'Why — one or two sentences the reviewer will see.' },
    ops: {
      type: 'array',
      minItems: 1,
      items: opSchema,
      description: 'Ordered list of atomic changes. Applied top to bottom on approval.',
    },
  },
  required: ['title', 'ops'],
  additionalProperties: false,
} as const;

export const addComponentSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: nodeKindEnum },
    label: { type: 'string' },
    props: nodePropsSchema,
    connectFrom: {
      type: 'array',
      items: { type: 'string' },
      description: 'Existing node ids that should point INTO the new component.',
    },
    connectTo: {
      type: 'array',
      items: { type: 'string' },
      description: 'Existing node ids the new component should point AT.',
    },
  },
  required: ['kind', 'label'],
  additionalProperties: false,
} as const;

export const connectComponentsSchema = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    target: { type: 'string' },
    label: { type: 'string' },
    protocol: { type: 'string', enum: ['http', 'grpc', 'sql', 'cache', 'queue', 'event', 'blob'] },
  },
  required: ['source', 'target'],
  additionalProperties: false,
} as const;

export const updateComponentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    props: nodePropsSchema,
  },
  required: ['id'],
  additionalProperties: false,
} as const;

export const idSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
  additionalProperties: false,
} as const;

export const simulateFailureSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description:
        'Component to take down. Omit to clear the simulation and return the board to normal.',
    },
  },
  additionalProperties: false,
} as const;

export const exportSchema = {
  type: 'object',
  properties: {
    format: {
      type: 'string',
      enum: ['compose', 'terraform'],
      description: 'compose → docker-compose.yml · terraform → main.tf sketch',
    },
  },
  required: ['format'],
  additionalProperties: false,
} as const;

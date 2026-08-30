import { beforeEach, describe, expect, it } from 'vitest';
import { useDuet } from './store';
import type { Design } from './types';

const design = (): Design => ({
  name: 't',
  provider: 'aws',
  region: 'us-east-1',
  nodes: [
    { id: 'c', kind: 'client', label: 'Client', position: { x: 0, y: 0 }, props: {} },
    {
      id: 'a',
      kind: 'service',
      label: 'API',
      position: { x: 0, y: 0 },
      props: { replicas: 1, instanceSize: 'small' },
    },
    {
      id: 'd',
      kind: 'datastore',
      label: 'DB',
      position: { x: 0, y: 0 },
      props: { engine: 'postgres' },
    },
  ],
  edges: [
    { id: 'e1', source: 'c', target: 'a' },
    { id: 'e2', source: 'a', target: 'd' },
  ],
});

beforeEach(() => {
  useDuet.setState({
    design: design(),
    proposals: [],
    selectedIds: [],
    activity: [],
    past: [],
    future: [],
    touch: null,
    autoApply: false,
  });
});

describe('approveProposal', () => {
  it('highlights only the components the change set touched', () => {
    const s = useDuet.getState();
    const id = s.submitProposal({
      title: 'scale the API',
      ops: [{ op: 'update_node', id: 'a', props: { replicas: 3 } }],
    });
    useDuet.getState().approveProposal(id);

    const touch = useDuet.getState().touch;
    expect(touch?.by).toBe('agent');
    expect(touch?.ids).toEqual(['a']);
  });

  it('highlights newly created components by their real ids', () => {
    const s = useDuet.getState();
    const id = s.submitProposal({
      title: 'front it with a load balancer',
      ops: [
        { op: 'add_node', tempId: 'lb', kind: 'loadbalancer', label: 'ALB' },
        { op: 'connect', source: 'c', target: 'lb' },
      ],
    });
    useDuet.getState().approveProposal(id);

    const after = useDuet.getState();
    const lb = after.design.nodes.find((n) => n.label === 'ALB')!;
    expect(after.touch?.ids).toContain(lb.id);
    expect(after.touch?.ids).toContain('c');
    // the untouched database is not highlighted
    expect(after.touch?.ids).not.toContain('d');
  });

  it('only counts the ops actually approved', () => {
    const s = useDuet.getState();
    const id = s.submitProposal({
      title: 'two changes',
      ops: [
        { op: 'update_node', id: 'a', props: { replicas: 3 } },
        { op: 'update_node', id: 'd', props: { multiAz: true } },
      ],
    });
    useDuet.getState().approveProposal(id, [0]);

    const after = useDuet.getState();
    expect(after.touch?.ids).toEqual(['a']);
    expect(after.design.nodes.find((n) => n.id === 'd')?.props.multiAz).toBeFalsy();
    expect(after.proposals[0].status).toBe('partial');
  });

  it('autoApply lands agent changes without a review step', () => {
    useDuet.setState({ autoApply: true });
    useDuet.getState().submitProposal({
      title: 'scale',
      ops: [{ op: 'update_node', id: 'a', props: { replicas: 4 } }],
    });
    const after = useDuet.getState();
    expect(after.design.nodes.find((n) => n.id === 'a')?.props.replicas).toBe(4);
    expect(after.proposals[0].status).toBe('applied');
  });

  it('an approved change is undoable', () => {
    const s = useDuet.getState();
    const id = s.submitProposal({
      title: 'scale',
      ops: [{ op: 'update_node', id: 'a', props: { replicas: 9 } }],
    });
    useDuet.getState().approveProposal(id);
    expect(useDuet.getState().design.nodes.find((n) => n.id === 'a')?.props.replicas).toBe(9);
    useDuet.getState().undo();
    expect(useDuet.getState().design.nodes.find((n) => n.id === 'a')?.props.replicas).toBe(1);
  });
});

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDuet } from '../model/store';
import { host } from '../test/setup';
import { Tools } from './Tools';

const reset = () =>
  useDuet.setState({
    design: {
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
          props: { replicas: 1, instanceSize: 'small', publicIngress: true },
        },
        {
          id: 'd',
          kind: 'datastore',
          label: 'DB',
          position: { x: 0, y: 0 },
          props: { engine: 'postgres', instanceSize: 'small', multiAz: false, replica: false },
        },
      ],
      edges: [
        { id: 'e1', source: 'c', target: 'a' },
        { id: 'e2', source: 'a', target: 'd' },
      ],
    },
    proposals: [],
    selectedIds: [],
    activity: [],
    past: [],
    future: [],
    autoApply: false,
    simulatedFailureId: null,
  });

beforeEach(reset);

describe('<Tools /> WebMCP registration', () => {
  it('registers the full read + proposal tool set', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.size).toBeGreaterThanOrEqual(12));

    const names = [...host().tools.keys()];
    for (const expected of [
      'get_design',
      'list_component_types',
      'analyze_design',
      'get_selection',
      'export_config',
      'focus_component',
      'propose_changes',
      'add_component',
      'connect_components',
      'update_component',
      'remove_component',
      'simulate_failure',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('marks read tools readOnlyHint and mutation tools not', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('get_design')).toBe(true));
    expect(host().tools.get('get_design')?.annotations?.readOnlyHint).toBe(true);
    expect(host().tools.get('analyze_design')?.annotations?.readOnlyHint).toBe(true);
    expect(host().tools.get('propose_changes')?.annotations?.readOnlyHint).toBeFalsy();
  });

  it('get_design returns the current graph as structured JSON', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('get_design')).toBe(true));
    const { value } = await host().call('get_design');
    const design = value as { nodes: unknown[]; edges: unknown[] };
    expect(design.nodes).toHaveLength(3);
    expect(design.edges).toHaveLength(2);
  });

  it('analyze_design surfaces the SPOFs with a reason and a fix', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('analyze_design')).toBe(true));
    const { value } = await host().call('analyze_design');
    const report = value as {
      singlePointsOfFailure: Array<{ reason: string; fix: string }>;
    };
    expect(report.singlePointsOfFailure.length).toBeGreaterThan(0);
    expect(report.singlePointsOfFailure[0].fix).toBeTruthy();
  });

  it('propose_changes does not mutate the design — it queues a reviewable proposal', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('propose_changes')).toBe(true));

    const nodesBefore = useDuet.getState().design.nodes.length;
    const { ok, value } = await host().call('propose_changes', {
      title: 'harden',
      ops: [
        { op: 'update_node', id: 'a', props: { replicas: 3, publicIngress: false } },
        { op: 'update_node', id: 'd', props: { multiAz: true, replica: true } },
      ],
    });

    expect(ok).toBe(true);
    expect(useDuet.getState().design.nodes.length).toBe(nodesBefore);
    expect(useDuet.getState().proposals).toHaveLength(1);

    const res = value as {
      status: string;
      singlePointsOfFailure: { before: number; after: number };
    };
    expect(res.status).toBe('pending_review');
    expect(res.singlePointsOfFailure.after).toBeLessThan(res.singlePointsOfFailure.before);
  });

  it('approving a queued proposal is what actually changes the design', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('propose_changes')).toBe(true));
    await host().call('propose_changes', {
      title: 'scale',
      ops: [{ op: 'update_node', id: 'a', props: { replicas: 4 } }],
    });
    const id = useDuet.getState().proposals[0].id;
    useDuet.getState().approveProposal(id);
    expect(useDuet.getState().design.nodes.find((x) => x.id === 'a')?.props.replicas).toBe(4);
  });

  it('get_pending_proposals is only registered while something is pending', async () => {
    const { rerender } = render(<Tools />);
    await waitFor(() => expect(host().tools.has('propose_changes')).toBe(true));
    expect(host().tools.has('get_pending_proposals')).toBe(false);

    await host().call('add_component', { kind: 'cache', label: 'Redis' });
    rerender(<Tools />);
    await waitFor(() => expect(host().tools.has('get_pending_proposals')).toBe(true));
  });

  it('simulate_failure reports the blast radius and puts the canvas in that mode', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('simulate_failure')).toBe(true));

    const nodesBefore = useDuet.getState().design.nodes.length;
    const { ok, value } = await host().call('simulate_failure', { id: 'a' });

    expect(ok).toBe(true);
    const blast = value as { failed: string; unreachable: string[]; storageCutOff: string[] };
    expect(blast.failed).toBe('API');
    expect(blast.unreachable).toContain('DB');
    expect(blast.storageCutOff).toContain('DB');

    // the human's canvas is now showing it, and the design is untouched
    expect(useDuet.getState().simulatedFailureId).toBe('a');
    expect(useDuet.getState().design.nodes.length).toBe(nodesBefore);
  });

  it('simulate_failure with no id clears the simulation', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('simulate_failure')).toBe(true));
    await host().call('simulate_failure', { id: 'a' });
    expect(useDuet.getState().simulatedFailureId).toBe('a');

    await host().call('simulate_failure', {});
    expect(useDuet.getState().simulatedFailureId).toBeNull();
  });

  it('focus_component selects the node without changing the design', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('focus_component')).toBe(true));
    const edgesBefore = useDuet.getState().design.edges.length;
    const { ok } = await host().call('focus_component', { id: 'a' });
    expect(ok).toBe(true);
    expect(useDuet.getState().selectedIds).toEqual(['a']);
    expect(useDuet.getState().design.edges.length).toBe(edgesBefore);
  });

  it('a tool error comes back as an isError result, not a throw', async () => {
    render(<Tools />);
    await waitFor(() => expect(host().tools.has('focus_component')).toBe(true));
    const { ok, text } = await host().call('focus_component', { id: 'does-not-exist' });
    expect(ok).toBe(false);
    expect(text).toContain('does-not-exist');
  });
});

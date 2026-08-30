/**
 * Component-kind glyphs. Hand-drawn on a 16×16 grid with a 1.5 stroke so they
 * stay legible at the 20px chip size the canvas and palette use. Unicode
 * symbols were the placeholder; these carry the kinds' identity properly.
 */
import type { NodeKind } from '../model/types';

type P = { className?: string };

const svg = (children: React.ReactNode) =>
  function Icon({ className }: P) {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {children}
      </svg>
    );
  };

const Client = svg(
  <>
    <rect x="2.2" y="3" width="11.6" height="8" rx="1.4" />
    <path d="M5.5 13.5h5" />
  </>,
);

const Cdn = svg(
  <>
    <circle cx="8" cy="8" r="5.6" />
    <path d="M2.4 8h11.2M8 2.4c1.5 1.6 2.3 3.5 2.3 5.6S9.5 12 8 13.6C6.5 12 5.7 10.1 5.7 8S6.5 4 8 2.4Z" />
  </>,
);

const LoadBalancer = svg(
  <>
    <path d="M8 2.5v4M8 6.5 3.5 10M8 6.5 12.5 10" />
    <circle cx="8" cy="2.6" r="1.4" />
    <circle cx="3.2" cy="11.6" r="1.7" />
    <circle cx="12.8" cy="11.6" r="1.7" />
  </>,
);

const Service = svg(
  <>
    <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.6" />
    <path d="M6 8h4M8 6v4" />
  </>,
);

const Worker = svg(
  <>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6" />
  </>,
);

const Queue = svg(
  <>
    <rect x="1.6" y="5" width="3.6" height="6" rx="1" />
    <rect x="6.2" y="5" width="3.6" height="6" rx="1" />
    <rect x="10.8" y="5" width="3.6" height="6" rx="1" />
  </>,
);

const Datastore = svg(
  <>
    <ellipse cx="8" cy="3.9" rx="5.3" ry="2.1" />
    <path d="M2.7 3.9v8.2c0 1.16 2.37 2.1 5.3 2.1s5.3-.94 5.3-2.1V3.9" />
    <path d="M13.3 8c0 1.16-2.37 2.1-5.3 2.1S2.7 9.16 2.7 8" />
  </>,
);

const Cache = svg(
  <>
    <path d="M8.9 1.8 3.4 9.1h3.9l-.9 5.1 5.7-7.5H8.2l.7-4.9Z" />
  </>,
);

const ObjectStore = svg(
  <>
    <path d="m8 1.9 5.6 3.05v6.1L8 14.1 2.4 11.05v-6.1L8 1.9Z" />
    <path d="M2.6 5 8 8l5.4-3M8 8v6" />
  </>,
);

const External = svg(
  <>
    <path d="M4.4 11.4a3 3 0 0 1 .3-6 4.1 4.1 0 0 1 7.8 1.2 2.7 2.7 0 0 1-.6 4.8" />
    <path d="M8 8.2v5.4M6.2 11.4 8 13.6l1.8-2.2" />
  </>,
);

export const KIND_ICON: Record<NodeKind, (p: P) => React.ReactElement> = {
  client: Client,
  cdn: Cdn,
  loadbalancer: LoadBalancer,
  service: Service,
  worker: Worker,
  queue: Queue,
  datastore: Datastore,
  cache: Cache,
  objectstore: ObjectStore,
  external: External,
};

/* -------------------------------------------------------------- UI icons */

const ui = (d: React.ReactNode) =>
  function UiIcon({ className }: P) {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {d}
      </svg>
    );
  };

export const UndoIcon = ui(<path d="M3.2 6.6h7a3.6 3.6 0 0 1 0 7.2H6.4M3.2 6.6l3-3M3.2 6.6l3 3" />);
export const RedoIcon = ui(
  <path d="M12.8 6.6h-7a3.6 3.6 0 0 0 0 7.2h3.8M12.8 6.6l-3-3M12.8 6.6l-3 3" />,
);
export const TidyIcon = ui(
  <>
    <rect x="1.8" y="2.4" width="5" height="4.4" rx="1" />
    <rect x="9.2" y="2.4" width="5" height="4.4" rx="1" />
    <rect x="1.8" y="9.2" width="5" height="4.4" rx="1" />
    <rect x="9.2" y="9.2" width="5" height="4.4" rx="1" />
  </>,
);
export const ExportIcon = ui(<path d="M8 10.6V2.2M8 2.2 4.8 5.4M8 2.2l3.2 3.2M2.6 10v2.4a1.4 1.4 0 0 0 1.4 1.4h8a1.4 1.4 0 0 0 1.4-1.4V10" />);
export const CloseIcon = ui(<path d="m3.6 3.6 8.8 8.8M12.4 3.6l-8.8 8.8" />);
export const CheckIcon = ui(<path d="m3 8.4 3.4 3.4L13 4.6" />);
export const TrashIcon = ui(
  <>
    <path d="M2.6 4.2h10.8M6.2 4.2V2.8a.9.9 0 0 1 .9-.9h1.8a.9.9 0 0 1 .9.9v1.4" />
    <path d="M4 4.2v8.2a1.2 1.2 0 0 0 1.2 1.2h5.6a1.2 1.2 0 0 0 1.2-1.2V4.2" />
  </>,
);
export const PlusIcon = ui(<path d="M8 3.4v9.2M3.4 8h9.2" />);
export const CopyIcon = ui(
  <>
    <rect x="5.4" y="5.4" width="8.2" height="8.2" rx="1.4" />
    <path d="M10.6 5.4V3.8a1.4 1.4 0 0 0-1.4-1.4H3.8a1.4 1.4 0 0 0-1.4 1.4v5.4a1.4 1.4 0 0 0 1.4 1.4h1.6" />
  </>,
);
export const SparkIcon = ui(
  <path d="M8 1.8 9.5 6l4.2 1.5L9.5 9 8 13.2 6.5 9 2.3 7.5 6.5 6 8 1.8Z" />,
);

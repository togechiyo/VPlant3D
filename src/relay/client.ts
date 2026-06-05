import {
  createRelayAssetUploadUrl,
  createRelayWebSocketUrl,
  type RelayAssetDescriptor,
  type RelayAssetKind,
  type RelayMessage,
} from './messages';

export type RelayMessageHandler = (message: RelayMessage) => void;
export type RelayConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';
export type RelayStatusHandler = (status: RelayConnectionStatus) => void;

export class VPlantRelayClient {
  private socket: WebSocket | null = null;
  private readonly queuedMessages: RelayMessage[] = [];

  constructor(
    private readonly role: 'control' | 'render',
    private readonly onMessage: RelayMessageHandler,
    private readonly browserLocation: Location = window.location,
    private readonly onStatusChange: RelayStatusHandler = () => undefined,
  ) {}

  connect(): void {
    if (this.socket) {
      return;
    }

    this.onStatusChange('connecting');
    const socket = new WebSocket(createRelayWebSocketUrl(this.browserLocation));
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.onStatusChange('open');
      this.send({ type: 'hello', role: this.role });
      while (this.queuedMessages.length > 0) {
        const message = this.queuedMessages.shift();
        if (message) {
          this.send(message);
        }
      }
    });

    socket.addEventListener('message', (event) => {
      const message = parseRelayMessage(event.data);
      if (message) {
        this.onMessage(message);
      }
    });

    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.onStatusChange('closed');
    });

    socket.addEventListener('error', () => {
      this.onStatusChange('error');
    });
  }

  send(message: RelayMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return;
    }

    this.queuedMessages.push(message);
  }

  get bufferedAmount(): number {
    return this.socket?.bufferedAmount ?? 0;
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
    this.queuedMessages.length = 0;
  }

  async uploadAsset(kind: RelayAssetKind, file: File): Promise<RelayAssetDescriptor> {
    const response = await fetch(createRelayAssetUploadUrl(this.browserLocation, kind), {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-vplant3d-file-name': encodeURIComponent(file.name),
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Relay upload failed: ${response.status}`);
    }

    return (await response.json()) as RelayAssetDescriptor;
  }
}

function parseRelayMessage(data: unknown): RelayMessage | null {
  if (typeof data !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as RelayMessage;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

import type { Position } from '../deck/navigation';
import {
  parsePresenterMessage,
  presenterChannelName,
  type PresenterMessage,
  type RemoteAction,
} from '../deck/presenter-protocol';
import type { Deck } from '../deck/types';

const POPUP_FEATURES = 'popup,width=1280,height=800';

export interface PresenterLinkOptions {
  readonly deck: Deck;
  readonly position: () => Position;
  readonly onAction: (action: RemoteAction) => void;
}

export interface PresenterLink {
  /** Opens (or focuses) the presenter window. Returns false when the popup was blocked. */
  open(): boolean;
  publish(position: Position): void;
  destroy(): void;
}

/** Audience side of the presenter view: answers the presenter window and follows its remote control. */
export function createPresenterLink(options: PresenterLinkOptions): PresenterLink {
  const id = crypto.randomUUID();
  let channel: BroadcastChannel | null = null;

  const send = (message: PresenterMessage) => channel?.postMessage(message);

  const connect = () => {
    if (channel) return;
    channel = new BroadcastChannel(presenterChannelName(id));
    channel.addEventListener('message', (event) => {
      const message = parsePresenterMessage(event.data);
      if (message?.type === 'hello') {
        send({ type: 'state', deck: options.deck, position: options.position() });
      } else if (message?.type === 'action') {
        options.onAction(message.action);
      }
    });
  };

  return {
    open() {
      connect();
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({ presenter: id }).toString();
      url.hash = '';
      return window.open(url, `motion-deck-presenter-${id}`, POPUP_FEATURES) !== null;
    },
    publish(position) {
      send({ type: 'position', position });
    },
    destroy() {
      send({ type: 'end' });
      channel?.close();
      channel = null;
    },
  };
}

import type { Blank } from '../deck/blank';
import type { StagePoint } from '../deck/fit';
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
  /** The deck on stage, which changes when its file is reloaded. */
  readonly deck: () => Deck;
  readonly position: () => Position;
  readonly blank: () => Blank;
  readonly onAction: (action: RemoteAction) => void;
  /** Laser dot position sent by the presenter window, null to hide it. */
  readonly onLaser: (point: StagePoint | null) => void;
}

export interface PresenterLink {
  /** Opens (or focuses) the presenter window. Returns false when the popup was blocked. */
  open(): boolean;
  publish(position: Position): void;
  /** Sends the whole deck again, after it was reloaded. */
  republish(): void;
  /** Tells the presenter window the screen was blanked or restored. */
  publishBlank(): void;
  destroy(): void;
}

/** Audience side of the presenter view: answers the presenter window and follows its remote control. */
export function createPresenterLink(options: PresenterLinkOptions): PresenterLink {
  const id = crypto.randomUUID();
  let channel: BroadcastChannel | null = null;

  const send = (message: PresenterMessage) => channel?.postMessage(message);
  const sendState = () => send({ type: 'state', deck: options.deck(), position: options.position() });
  const sendBlank = () => send({ type: 'blank', blank: options.blank() });

  const connect = () => {
    if (channel) return;
    channel = new BroadcastChannel(presenterChannelName(id));
    channel.addEventListener('message', (event) => {
      const message = parsePresenterMessage(event.data);
      if (message?.type === 'hello') {
        sendState();
        sendBlank();
      } else if (message?.type === 'action') {
        options.onAction(message.action);
      } else if (message?.type === 'laser') {
        options.onLaser(message.point);
      }
    });
  };

  return {
    open() {
      connect();
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({ presenter: id }).toString();
      url.hash = '';
      return window.open(url, `motion-slides-presenter-${id}`, POPUP_FEATURES) !== null;
    },
    publish(position) {
      send({ type: 'position', position });
    },
    republish: sendState,
    publishBlank: sendBlank,
    destroy() {
      send({ type: 'end' });
      channel?.close();
      channel = null;
    },
  };
}

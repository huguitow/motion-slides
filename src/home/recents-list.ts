import { relativeTime, type RecentDeck } from '../deck/recents';
import { ICONS } from '../ui/icons';
import { forgetDeck, listRecents } from './recents-store';

/**
 * "Récents" on the home screen: decks opened before in this browser, to resume where they were left.
 * Titles come from decks, so everything is written with textContent.
 */
export function mountRecentsList(
  container: HTMLElement,
  onResume: (recent: RecentDeck) => void,
  saved: Promise<void>,
): void {
  const list = document.createElement('ul');
  const heading = document.createElement('h2');
  heading.textContent = 'Récents';
  container.append(heading, list);

  const render = (recents: readonly RecentDeck[]) => {
    container.hidden = recents.length === 0;
    list.replaceChildren(...recents.map((recent) => renderItem(recent, onResume, () => void forget(recent.name))));
  };
  const forget = async (name: string) => {
    await forgetDeck(name);
    render(await listRecents());
  };

  // Leaving a deck saves its position right before this list appears: wait for it.
  void saved.then(listRecents).then(render);
}

function renderItem(recent: RecentDeck, onResume: (recent: RecentDeck) => void, onForget: () => void): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'recent';

  const resume = document.createElement('button');
  resume.type = 'button';
  resume.className = 'recent-resume';
  const title = document.createElement('strong');
  title.textContent = recent.title;
  const meta = document.createElement('span');
  meta.textContent = [
    recent.name,
    `slide ${recent.position.slide + 1}/${recent.slideCount}`,
    relativeTime(Date.now() - recent.openedAt),
  ].join(' · ');
  resume.append(title, meta);
  resume.title = `Reprendre « ${recent.title} » à la slide ${recent.position.slide + 1}`;
  resume.addEventListener('click', () => onResume(recent));

  const forget = document.createElement('button');
  forget.type = 'button';
  forget.className = 'recent-forget';
  forget.innerHTML = ICONS.close;
  forget.setAttribute('aria-label', `Oublier « ${recent.title} »`);
  forget.title = 'Oublier ce deck';
  forget.addEventListener('click', onForget);

  item.append(resume, forget);
  return item;
}

/**
 * Screens are addressed by a plain #name, so links can be bookmarked and sent:
 *   #initiatives          the list (home)
 *   #new                  a new initiative
 *   #edit-<initiative id> an existing one
 *   #compare              A vs B
 * Plain names only (letters, digits, hyphens): embedded previews pass nothing else.
 */

export type Route =
  | { screen: 'initiatives' }
  | { screen: 'new' }
  | { screen: 'edit'; id: string }
  | { screen: 'compare' };

export const HOME: Route = { screen: 'initiatives' };

export function parseHash(hash: string): Route {
  const name = hash.replace(/^#/, '');
  if (name === 'new') return { screen: 'new' };
  if (name === 'compare') return { screen: 'compare' };
  const edit = /^edit-([A-Za-z0-9-]+)$/.exec(name);
  if (edit?.[1]) return { screen: 'edit', id: edit[1] };
  return HOME;
}

export function toHash(route: Route): string {
  switch (route.screen) {
    case 'initiatives':
      return '#initiatives';
    case 'new':
      return '#new';
    case 'edit':
      return `#edit-${route.id}`;
    case 'compare':
      return '#compare';
  }
}

export const sameRoute = (a: Route, b: Route): boolean => toHash(a) === toHash(b);

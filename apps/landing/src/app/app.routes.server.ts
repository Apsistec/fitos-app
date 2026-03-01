import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Sprint 67: Trainer profiles are dynamic (data changes per username and over time).
  // Use Server mode so each request gets fresh SSR content — important for:
  //   - New reviews appearing on the page
  //   - Updated bio/photo/availability
  //   - Correct Open Graph tags for social sharing on each request
  {
    path: 't/:username',
    renderMode: RenderMode.Server,
  },
  // All other landing pages are static content → prerender at build time for max perf
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

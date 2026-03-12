import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { HomePage } from './routes/home-page';
import { TasksPage } from './routes/tasks-page';
import { OliviaPage } from './routes/olivia-page';
import { MemoryPage } from './routes/memory-page';
import { ItemDetailPage } from './routes/item-detail-page';
import { ReEntryPage } from './routes/re-entry-page';
import { SettingsPage } from './routes/settings-page';

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
});

// ── Primary four-tab routes ──────────────────────────────────────────────────
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: TasksPage });
const oliviaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/olivia', component: OliviaPage });
const memoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/memory', component: MemoryPage });

// ── Supporting routes (token-compliant, hidden from primary nav) ─────────────
const itemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/items/$itemId', component: ItemDetailPage });
const reEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/re-entry',
  validateSearch: (search: Record<string, unknown>) => ({ reason: typeof search.reason === 'string' ? search.reason : 'review' }),
  component: ReEntryPage
});
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });

// ── Legacy redirects (old routes → new primary nav) ──────────────────────────
const addRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/add',
  beforeLoad: () => {
    throw redirect({ to: '/tasks' });
  }
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  tasksRoute,
  oliviaRoute,
  memoryRoute,
  itemRoute,
  reEntryRoute,
  settingsRoute,
  addRedirectRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

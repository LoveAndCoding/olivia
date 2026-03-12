import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { AddPage } from './routes/add-page';
import { HomePage } from './routes/home-page';
import { ItemDetailPage } from './routes/item-detail-page';
import { MemoryPage } from './routes/memory-page';
import { OliviaPage } from './routes/olivia-page';
import { ReEntryPage } from './routes/re-entry-page';
import { SettingsPage } from './routes/settings-page';
import { TasksPage } from './routes/tasks-page';

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
});

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: TasksPage });
const oliviaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/olivia',
  validateSearch: (search: Record<string, unknown>) => ({
    intent: typeof search.intent === 'string' ? search.intent : 'default',
    ...(typeof search.itemId === 'string' ? { itemId: search.itemId } : {})
  }),
  component: OliviaPage
});
const memoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/memory', component: MemoryPage });
const addRoute = createRoute({ getParentRoute: () => rootRoute, path: '/add', component: AddPage });
const itemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/items/$itemId', component: ItemDetailPage });
const reEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/re-entry',
  validateSearch: (search: Record<string, unknown>) => ({ reason: typeof search.reason === 'string' ? search.reason : 'review' }),
  component: ReEntryPage
});
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });

const routeTree = rootRoute.addChildren([homeRoute, tasksRoute, oliviaRoute, memoryRoute, addRoute, itemRoute, reEntryRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

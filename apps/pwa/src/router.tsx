import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { HomePage } from './routes/home-page';
import { TasksPage } from './routes/tasks-page';
import { OliviaPage } from './routes/olivia-page';
import { MemoryPage } from './routes/memory-page';
import { ItemDetailPage } from './routes/item-detail-page';
import { RemindersPage } from './routes/reminders-page';
import { ReminderDetailPage } from './routes/reminder-detail-page';
import { ReEntryPage } from './routes/re-entry-page';
import { SettingsPage } from './routes/settings-page';
import { ListsPage } from './routes/lists-page';
import { ListDetailPage } from './routes/list-detail-page';
import { RoutinesPage } from './routes/routines-page';
import { RoutineDetailPage } from './routes/routine-detail-page';
import { MealsPage } from './routes/meals-page';
import { MealDetailPage } from './routes/meal-detail-page';
import { HistoryPage } from './routes/history-page';
import { WeekPage } from './routes/week-page';
import { ReviewFlowPage } from './routes/review-flow-page';
import { ReviewRecordDetailPage } from './routes/review-record-detail-page';
import { OnboardingPage } from './routes/onboarding-page';

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
});

// ── Primary five-tab routes ───────────────────────────────────────────────────
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const tasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: TasksPage });
const oliviaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/olivia', component: OliviaPage });
const listsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/lists', component: ListsPage });
const listDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/lists/$listId', component: ListDetailPage });
const memoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/memory', component: MemoryPage });
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: HistoryPage });
const weekRoute = createRoute({ getParentRoute: () => rootRoute, path: '/week', component: WeekPage });

// ── Supporting routes (token-compliant, hidden from primary nav) ─────────────
const itemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/items/$itemId', component: ItemDetailPage });
const remindersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reminders', component: RemindersPage });
const reminderDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reminders/$reminderId', component: ReminderDetailPage });
const routinesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/routines', component: RoutinesPage });
const routineDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/routines/$routineId', component: RoutineDetailPage });
const reviewFlowRoute = createRoute({ getParentRoute: () => rootRoute, path: '/routines/$routineId/review/$occurrenceId', component: ReviewFlowPage });
const reviewRecordDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/review-records/$reviewRecordId', component: ReviewRecordDetailPage });
const mealsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/meals', component: MealsPage });
const mealDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/meals/$planId', component: MealDetailPage });
const reEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/re-entry',
  validateSearch: (search: Record<string, unknown>) => ({
    reason: typeof search.reason === 'string' ? search.reason : 'review',
    reminderId: typeof search.reminderId === 'string' ? search.reminderId : undefined,
  }),
  component: ReEntryPage
});
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });
const onboardingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/onboarding', component: OnboardingPage });

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
  listsRoute,
  listDetailRoute,
  memoryRoute,
  historyRoute,
  weekRoute,
  itemRoute,
  remindersRoute,
  reminderDetailRoute,
  routinesRoute,
  routineDetailRoute,
  reviewFlowRoute,
  reviewRecordDetailRoute,
  mealsRoute,
  mealDetailRoute,
  reEntryRoute,
  settingsRoute,
  onboardingRoute,
  addRedirectRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

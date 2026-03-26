import { createRootRoute, createRoute, createRouter, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './lib/auth';
import { HomePage } from './routes/home-page';
import { DailyPage } from './routes/daily-page';
import { TasksPage } from './routes/tasks-page';
import { OliviaPage } from './routes/olivia-page';

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
import { MorePage } from './routes/more-page';
import { ReviewFlowPage } from './routes/review-flow-page';
import { ReviewRecordDetailPage } from './routes/review-record-detail-page';
import { OnboardingPage } from './routes/onboarding-page';
import { HealthCheckPage } from './routes/health-check-page';
import { AuthPage } from './routes/auth-page';
import { FeedbackPage } from './routes/feedback-page';

// Auth-aware root component: redirects to /auth when unauthenticated,
// and renders auth page without AppLayout.
function RootComponent() {
  const { state } = useAuth();
  const location = useRouterState({ select: (s) => s.location });
  const isAuthRoute = location.pathname === '/auth';

  // While loading auth state, show nothing to avoid flash
  if (state.status === 'loading') {
    return null;
  }

  // Unauthenticated or uninitialized: show auth page (no AppLayout)
  if (state.status === 'unauthenticated' || state.status === 'uninitialized') {
    if (isAuthRoute) {
      return (
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      );
    }
    // Redirect to auth — render auth page inline to avoid router loop
    return (
      <ErrorBoundary>
        <AuthPage />
      </ErrorBoundary>
    );
  }

  // Authenticated user on /auth should go home
  if (isAuthRoute) {
    return (
      <ErrorBoundary>
        <AppLayout>
          <HomePage />
        </AppLayout>
      </ErrorBoundary>
    );
  }

  // Normal authenticated flow with AppLayout
  return (
    <ErrorBoundary>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ErrorBoundary>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

// ── Primary five-tab routes ───────────────────────────────────────────────────
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const dailyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily',
  validateSearch: (search: Record<string, unknown>) => ({
    segment: typeof search.segment === 'string' ? search.segment : undefined,
  }),
  component: DailyPage,
});
const oliviaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/olivia', component: OliviaPage });
const listsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/lists', component: ListsPage });
const listDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/lists/$listId', component: ListDetailPage });
const moreRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more', component: MorePage });

// ── More sub-routes (nested within More tab context) ──────────────────────────
const moreTasksRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more/tasks', component: TasksPage });
const moreHistoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more/history', component: HistoryPage });
const moreWeekRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more/week', component: WeekPage });
const moreSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more/settings', component: SettingsPage });
const moreFeedbackRoute = createRoute({ getParentRoute: () => rootRoute, path: '/more/settings/feedback', component: FeedbackPage });

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
const onboardingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/onboarding', component: OnboardingPage });
const healthCheckRoute = createRoute({ getParentRoute: () => rootRoute, path: '/health-check', component: HealthCheckPage });
const authRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthPage });

// ── Legacy redirects (old routes → new locations) ────────────────────────────
const addRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/add',
  beforeLoad: () => { throw redirect({ to: '/more/tasks' }); }
});
const tasksRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  beforeLoad: () => { throw redirect({ to: '/more/tasks' }); }
});
const memoryRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/memory',
  beforeLoad: () => { throw redirect({ to: '/more/history' }); }
});
const historyRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  beforeLoad: () => { throw redirect({ to: '/more/history' }); }
});
const weekRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/week',
  beforeLoad: () => { throw redirect({ to: '/more/week' }); }
});
const settingsRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: () => { throw redirect({ to: '/more/settings' }); }
});
const feedbackRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/feedback',
  beforeLoad: () => { throw redirect({ to: '/more/settings/feedback' }); }
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  dailyRoute,
  oliviaRoute,
  listsRoute,
  listDetailRoute,
  moreRoute,
  moreTasksRoute,
  moreHistoryRoute,
  moreWeekRoute,
  moreSettingsRoute,
  moreFeedbackRoute,
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
  onboardingRoute,
  healthCheckRoute,
  authRoute,
  addRedirectRoute,
  tasksRedirectRoute,
  memoryRedirectRoute,
  historyRedirectRoute,
  weekRedirectRoute,
  settingsRedirectRoute,
  feedbackRedirectRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

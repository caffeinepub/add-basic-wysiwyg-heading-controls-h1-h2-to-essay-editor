import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useIsAdmin } from './hooks/useQueries';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import WritingPage from './pages/WritingPage';
import ContactPage from './pages/ContactPage';
import EssayDetailPage from './pages/EssayDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSetupModal from './components/ProfileSetupModal';

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const writingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/writing',
  component: WritingPage,
});

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: ContactPage,
});

const essayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/essay/$essayId',
  component: EssayDetailPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboard,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  writingRoute,
  contactRoute,
  essayRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const isAuthenticated = !!identity;

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <>
      <RouterProvider router={router} />
      {showProfileSetup && <ProfileSetupModal />}
    </>
  );
}

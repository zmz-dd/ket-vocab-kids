import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";

import AppHome from "@/pages/app/AppHome";
import PlanPage from "@/pages/app/Plan";
import LearnPage from "@/pages/app/Learn";
import ReviewPage from "@/pages/app/Review";
import QuizPage from "@/pages/app/Quiz";
import MistakesPage from "@/pages/app/Mistakes";
import StatsPage from "@/pages/app/Stats";
import LeaderboardPage from "@/pages/app/Leaderboard";
import AdminPage from "@/pages/admin/Admin";

function AuthedApp({ path }: { path: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return <Home />;
  }

  // 管理员：允许进后台，但不参与学习PK（需求：不参与学习/排行榜）
  if (user.role === "admin" && path.startsWith("/app")) {
    return <AdminPage />;
  }

  return (
    <AppShell user={user}>
      <Switch>
        <Route path="/app" component={AppHome} />
        <Route path="/app/plan" component={PlanPage} />
        <Route path="/app/learn" component={LearnPage} />
        <Route path="/app/review" component={ReviewPage} />
        <Route path="/app/quiz" component={QuizPage} />
        <Route path="/app/mistakes" component={MistakesPage} />
        <Route path="/app/stats" component={StatsPage} />
        <Route path="/app/leaderboard" component={LeaderboardPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Home />;
  if (user.role !== "admin") return <AuthedApp path="/app" />;
  return <AdminPage />;
}

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/app/:rest*">{() => <AuthedApp path="/app" />}</Route>
        <Route path="/app">{() => <AuthedApp path="/app" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

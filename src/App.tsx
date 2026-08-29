import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Notifications from "./pages/Notifications";
import LecturerDashboard from "./pages/LecturerDashboard";
import LecturerCourseSelection from "./pages/LecturerCourseSelection";
import LecturerCourses from "./pages/LecturerCourses";
import MarksManagement from "./pages/MarksManagement";
import LecturerAttendance from "./pages/LecturerAttendance";
import LecturerClasses from "./pages/LecturerClasses";
import LecturerMessages from "./pages/LecturerMessages";
import LecturerGradeBook from "./pages/LecturerGradeBook";
import LecturerAssignments from "./pages/LecturerAssignments";
import LecturerAnnouncements from "./pages/LecturerAnnouncements";
import LecturerRoster from "./pages/LecturerRoster";
import LecturerAnalytics from "./pages/LecturerAnalytics";
import LecturerEnrollments from "./pages/LecturerEnrollments";
import LecturerSettings from "./pages/LecturerSettings";
import LecturerQuiz from "./pages/LecturerQuiz";
import CreateQuiz from "./pages/CreateQuiz";
import EditQuiz from "./pages/EditQuiz";
import QuizView from "./pages/QuizView";
import QuizResults from "./pages/QuizResults";
import NotFound from "./pages/NotFound";
import LecturerIdCard from "./pages/LecturerIdCard";

const queryClient = new QueryClient();

function LecturerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.role !== "lecturer") {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/notifications"
        element={
          <LecturerRoute>
            <Notifications />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer"
        element={
          <LecturerRoute>
            <LecturerDashboard />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/courses"
        element={
          <LecturerRoute>
            <LecturerCourses />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/marks"
        element={
          <LecturerRoute>
            <MarksManagement />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/attendance"
        element={
          <LecturerRoute>
            <LecturerAttendance />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/classes"
        element={
          <LecturerRoute>
            <LecturerClasses />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/messages"
        element={
          <LecturerRoute>
            <LecturerMessages />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/gradebook"
        element={
          <LecturerRoute>
            <LecturerGradeBook />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/assignments"
        element={
          <LecturerRoute>
            <LecturerAssignments />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/enrollments"
        element={
          <LecturerRoute>
            <LecturerEnrollments />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/settings"
        element={
          <LecturerRoute>
            <LecturerSettings />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/announcements"
        element={
          <LecturerRoute>
            <LecturerAnnouncements />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/roster"
        element={
          <LecturerRoute>
            <LecturerRoster />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/analytics"
        element={
          <LecturerRoute>
            <LecturerAnalytics />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/quiz"
        element={
          <LecturerRoute>
            <LecturerQuiz />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/quiz/create"
        element={
          <LecturerRoute>
            <CreateQuiz />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/quiz/:id"
        element={
          <LecturerRoute>
            <QuizView />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/quiz/:id/edit"
        element={
          <LecturerRoute>
            <EditQuiz />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/quiz/:id/results"
        element={
          <LecturerRoute>
            <QuizResults />
          </LecturerRoute>
        }
      />
      <Route
        path="/lecturer/id-card"
        element={
          <LecturerRoute>
            <LecturerIdCard />
          </LecturerRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <SiteSettingsProvider>
            <AppRoutes />
          </SiteSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

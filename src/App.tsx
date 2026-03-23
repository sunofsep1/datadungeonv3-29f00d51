import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageFallbackSkeleton } from "@/components/PageFallbackSkeleton";

// Core workflow chunk (Dashboard, Contacts, Properties + details) — one download for main nav
const Dashboard = lazy(() => import("./pages/CorePages").then((m) => ({ default: m.Dashboard })));
const Contacts = lazy(() => import("./pages/CorePages").then((m) => ({ default: m.Contacts })));
const ContactDetail = lazy(() => import("./pages/CorePages").then((m) => ({ default: m.ContactDetail })));
const Properties = lazy(() => import("./pages/CorePages").then((m) => ({ default: m.Properties })));
const PropertyDetail = lazy(() => import("./pages/CorePages").then((m) => ({ default: m.PropertyDetail })));

// Calendar/scheduling chunk
const Appointments = lazy(() => import("./pages/CalendarPages").then((m) => ({ default: m.Appointments })));
const Calendar = lazy(() => import("./pages/CalendarPages").then((m) => ({ default: m.Calendar })));
const Tasks = lazy(() => import("./pages/CalendarPages").then((m) => ({ default: m.Tasks })));

// Other routes (individual chunks)
const Marketing = lazy(() => import("./pages/Marketing"));
const Performance = lazy(() => import("./pages/Performance"));
const Scripts = lazy(() => import("./pages/Scripts"));
const Settings = lazy(() => import("./pages/Settings"));
const HotLeads = lazy(() => import("./pages/HotLeads"));
const Nurture = lazy(() => import("./pages/Nurture"));
const TodoList = lazy(() => import("./pages/TodoList"));
const Recent = lazy(() => import("./pages/Recent"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const VisionCardDetail = lazy(() => import("./pages/VisionCardDetail"));
const Research = lazy(() => import("./pages/Research"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ContactPrintPage = lazy(() => import("./pages/ContactPrintPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<PageFallbackSkeleton />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<ProtectedRoute><MainLayout><ErrorBoundary><Dashboard /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/hot-leads" element={<ProtectedRoute><MainLayout><HotLeads /></MainLayout></ProtectedRoute>} />
                <Route path="/recent" element={<ProtectedRoute><MainLayout><Recent /></MainLayout></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><MainLayout><Tasks /></MainLayout></ProtectedRoute>} />
                <Route path="/todos" element={<ProtectedRoute><MainLayout><TodoList /></MainLayout></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><MainLayout><ErrorBoundary><Contacts /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/nurture" element={<ProtectedRoute><MainLayout><Nurture /></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/:id" element={<ProtectedRoute><MainLayout><ContactDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/:id/print" element={<ProtectedRoute><ContactPrintPage /></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><MainLayout><Appointments /></MainLayout></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><MainLayout><Calendar /></MainLayout></ProtectedRoute>} />
                <Route path="/listings/:id" element={<ProtectedRoute><MainLayout><ListingDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/listings" element={<Navigate to="/dashboard" replace />} />
                <Route path="/properties" element={<ProtectedRoute><MainLayout><ErrorBoundary><Properties /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><MainLayout><PropertyDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/vision/:id" element={<ProtectedRoute><MainLayout><VisionCardDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/pipeline" element={<Navigate to="/dashboard" replace />} />
                <Route path="/marketing" element={<ProtectedRoute><MainLayout><Marketing /></MainLayout></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute><MainLayout><ErrorBoundary><Performance /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/scripts" element={<ProtectedRoute><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
                <Route path="/research" element={<ProtectedRoute><MainLayout><Research /></MainLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
                <Route path="/campaigns" element={<Navigate to="/marketing" replace />} />
                <Route path="/agent-ops/*" element={<Navigate to="/performance" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

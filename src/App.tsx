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

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Performance = lazy(() => import("./pages/Performance"));
const Scripts = lazy(() => import("./pages/Scripts"));
const Settings = lazy(() => import("./pages/Settings"));
const HotLeads = lazy(() => import("./pages/HotLeads"));
const Recent = lazy(() => import("./pages/Recent"));
const Tasks = lazy(() => import("./pages/Tasks"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Research = lazy(() => import("./pages/Research"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      <p>Loading…</p>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<ProtectedRoute><MainLayout><ErrorBoundary><Dashboard /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/hot-leads" element={<ProtectedRoute><MainLayout><HotLeads /></MainLayout></ProtectedRoute>} />
                <Route path="/recent" element={<ProtectedRoute><MainLayout><Recent /></MainLayout></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><MainLayout><Tasks /></MainLayout></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><MainLayout><ErrorBoundary><Contacts /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/:id" element={<ProtectedRoute><MainLayout><ContactDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><MainLayout><Appointments /></MainLayout></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><MainLayout><Calendar /></MainLayout></ProtectedRoute>} />
                <Route path="/listings/:id" element={<ProtectedRoute><MainLayout><ListingDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/listings" element={<Navigate to="/dashboard" replace />} />
                <Route path="/properties" element={<ProtectedRoute><MainLayout><ErrorBoundary><Properties /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><MainLayout><PropertyDetail /></MainLayout></ProtectedRoute>} />
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

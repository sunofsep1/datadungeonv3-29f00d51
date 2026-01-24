import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Listings from "./pages/Listings";
import Appointments from "./pages/Appointments";
import Pipeline from "./pages/Pipeline";
import Marketing from "./pages/Marketing";
import Performance from "./pages/Performance";
import Scripts from "./pages/Scripts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><MainLayout><Contacts /></MainLayout></ProtectedRoute>} />
            <Route path="/contacts/:id" element={<ProtectedRoute><MainLayout><ContactDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/listings" element={<ProtectedRoute><MainLayout><Listings /></MainLayout></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><MainLayout><Appointments /></MainLayout></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><MainLayout><Pipeline /></MainLayout></ProtectedRoute>} />
            <Route path="/marketing" element={<ProtectedRoute><MainLayout><Marketing /></MainLayout></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><MainLayout><Performance /></MainLayout></ProtectedRoute>} />
            <Route path="/scripts" element={<ProtectedRoute><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
            {/* Legacy redirects */}
            <Route path="/campaigns" element={<Navigate to="/marketing" replace />} />
            <Route path="/agent-ops/*" element={<Navigate to="/performance" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

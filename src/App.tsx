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
import { DrakoProvider, DrakoCompanion } from "@/components/drako";

// Route-level splits to avoid one oversized "core pages" bundle.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Tasks = lazy(() => import("./pages/Tasks"));

// Other routes (individual chunks)
const Marketing = lazy(() => import("./pages/Marketing"));
const Performance = lazy(() => import("./pages/Performance"));
const Scripts = lazy(() => import("./pages/Scripts"));
const Settings = lazy(() => import("./pages/Settings"));
const HotLeads = lazy(() => import("./pages/HotLeads"));
const Nurture = lazy(() => import("./pages/Nurture"));
const NurtureBacklogPrintPage = lazy(() => import("./pages/NurtureBacklogPrintPage"));
const TodoList = lazy(() => import("./pages/TodoList"));
const AttentionHub = lazy(() => import("./pages/AttentionHub"));
const WorkWorkspace = lazy(() => import("./pages/WorkWorkspace"));
const Workshop = lazy(() => import("./pages/Workshop"));
const Recent = lazy(() => import("./pages/Recent"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const ListingsSalesBoard = lazy(() => import("./pages/ListingsSalesBoard"));
const VisionCardDetail = lazy(() => import("./pages/VisionCardDetail"));
const Research = lazy(() => import("./pages/Research"));
const AnnualReviews = lazy(() => import("./pages/AnnualReviews"));
const Automations = lazy(() => import("./pages/Automations"));
const DataHealth = lazy(() => import("./pages/DataHealth"));
const PricingIntelligence = lazy(() => import("./pages/PricingIntelligence"));
const SmsSuitePage = lazy(() => import("./pages/sms/SmsSuitePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ContactPrintPage = lazy(() => import("./pages/ContactPrintPage"));
const ContactRequirementsSearch = lazy(() => import("./pages/ContactRequirementsSearch"));
const PropertyPrintPage = lazy(() => import("./pages/PropertyPrintPage"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const AIOps = lazy(() => import("./pages/AIOps"));
const TouchReport = lazy(() => import("./pages/TouchReport"));
const TouchReportPrint = lazy(() => import("./pages/TouchReportPrint"));
const MatchBuyersLettersPrintPage = lazy(() => import("./pages/MatchBuyersLettersPrintPage"));
const OfferLettersPrintPage = lazy(() => import("./pages/OfferLettersPrintPage"));
const ListingVendorPreviewPage = lazy(() => import("./pages/ListingVendorPreviewPage"));
const Reports = lazy(() => import("./pages/Reports"));
const InvoicePrintPage = lazy(() => import("./pages/InvoicePrintPage"));
const Invoices = lazy(() => import("./pages/Invoices"));
const OfiCheckInPage = lazy(() => import("./pages/OfiCheckInPage"));
const OfiBrochurePrintPage = lazy(() => import("./pages/OfiBrochurePrintPage"));
const DrakoDemo = lazy(() => import("./pages/DrakoDemo"));
const DrakoLair = lazy(() => import("./pages/DrakoLair"));
const ContactMarkets = lazy(() => import("./pages/ContactMarkets"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DrakoProvider>
            <AuthProvider>
              <Suspense fallback={<PageFallbackSkeleton />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/attention-hub" replace />} />
                  <Route path="/drako-demo" element={<DrakoDemo />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/ofi/check-in/:token" element={<OfiCheckInPage />} />
                <Route path="/ofi/brochure/:token/print" element={<ProtectedRoute><OfiBrochurePrintPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><MainLayout><ErrorBoundary><Dashboard /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/attention-hub" element={<ProtectedRoute><MainLayout><ErrorBoundary><AttentionHub /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/lair" element={<ProtectedRoute><MainLayout><ErrorBoundary><DrakoLair /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/work" element={<ProtectedRoute><MainLayout><WorkWorkspace /></MainLayout></ProtectedRoute>} />
                <Route path="/workshop" element={<ProtectedRoute><MainLayout><Workshop /></MainLayout></ProtectedRoute>} />
                <Route path="/hot-leads" element={<ProtectedRoute><MainLayout><HotLeads /></MainLayout></ProtectedRoute>} />
                <Route path="/recent" element={<ProtectedRoute><MainLayout><Recent /></MainLayout></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><MainLayout><Tasks /></MainLayout></ProtectedRoute>} />
                <Route path="/todos" element={<ProtectedRoute><MainLayout><TodoList /></MainLayout></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><MainLayout><ErrorBoundary><Contacts /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/markets" element={<ProtectedRoute><MainLayout><ErrorBoundary><ContactMarkets /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/requirements-search" element={<ProtectedRoute><MainLayout><ErrorBoundary><ContactRequirementsSearch /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/nurture" element={<ProtectedRoute><MainLayout><Nurture /></MainLayout></ProtectedRoute>} />
                <Route path="/nurture/print" element={<ProtectedRoute><NurtureBacklogPrintPage /></ProtectedRoute>} />
                <Route path="/contacts/:id" element={<ProtectedRoute><MainLayout><ErrorBoundary><ContactDetail /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/contacts/:id/print" element={<ProtectedRoute><ContactPrintPage /></ProtectedRoute>} />
                <Route path="/properties/:id/print" element={<ProtectedRoute><PropertyPrintPage /></ProtectedRoute>} />
                <Route path="/touch-report/print" element={<ProtectedRoute><TouchReportPrint /></ProtectedRoute>} />
                <Route
                  path="/listings/match-buyers/letters/print"
                  element={<ProtectedRoute><MatchBuyersLettersPrintPage /></ProtectedRoute>}
                />
                <Route
                  path="/listings/offers/letters/print"
                  element={<ProtectedRoute><OfferLettersPrintPage /></ProtectedRoute>}
                />
                <Route path="/appointments" element={<ProtectedRoute><MainLayout><ErrorBoundary><Appointments /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><MainLayout><ErrorBoundary><Calendar /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/listings/:id" element={<ProtectedRoute><MainLayout><ListingDetail /></MainLayout></ProtectedRoute>} />
                <Route
                  path="/listings/:id/vendor-preview"
                  element={<ProtectedRoute><ListingVendorPreviewPage /></ProtectedRoute>}
                />
                <Route path="/listings" element={<ProtectedRoute><MainLayout><ListingsSalesBoard /></MainLayout></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><MainLayout><PricingIntelligence /></MainLayout></ProtectedRoute>} />
                <Route path="/listings-sales" element={<Navigate to="/listings" replace />} />
                <Route path="/properties" element={<ProtectedRoute><MainLayout><ErrorBoundary><Properties /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><MainLayout><PropertyDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/vision/:id" element={<ProtectedRoute><MainLayout><VisionCardDetail /></MainLayout></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><MainLayout><Pipeline /></MainLayout></ProtectedRoute>} />
                <Route path="/marketing" element={<ProtectedRoute><MainLayout><Marketing /></MainLayout></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute><MainLayout><ErrorBoundary><Performance /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/scripts" element={<ProtectedRoute><MainLayout><Scripts /></MainLayout></ProtectedRoute>} />
                <Route path="/automations" element={<ProtectedRoute><MainLayout><ErrorBoundary><Automations /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/data-health" element={<ProtectedRoute><MainLayout><DataHealth /></MainLayout></ProtectedRoute>} />
                <Route path="/research" element={<ProtectedRoute><MainLayout><Research /></MainLayout></ProtectedRoute>} />
                <Route path="/annual-reviews" element={<ProtectedRoute><MainLayout><AnnualReviews /></MainLayout></ProtectedRoute>} />
                <Route path="/ai-ops" element={<ProtectedRoute><MainLayout><AIOps /></MainLayout></ProtectedRoute>} />
                <Route path="/touch-report" element={<ProtectedRoute><MainLayout><TouchReport /></MainLayout></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><MainLayout><ErrorBoundary><Invoices /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/invoices/:id/print" element={<ProtectedRoute><InvoicePrintPage /></ProtectedRoute>} />
                <Route path="/communications/sms" element={<ProtectedRoute><MainLayout><ErrorBoundary><SmsSuitePage /></ErrorBoundary></MainLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
                <Route path="/campaigns" element={<Navigate to="/marketing" replace />} />
                <Route path="/agent-ops/*" element={<Navigate to="/performance" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
          <DrakoCompanion />
        </DrakoProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import AnalyticsPage from "./pages/AnalyticsPage";
import CompliancePage from "./pages/CompliancePage";
import DashboardPage from "./pages/DashboardPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import EntriesPage from "./pages/EntriesPage";
import ImportHubPage from "./pages/ImportHubPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import LibraryHealthPage from "./pages/LibraryHealthPage";
import LoginPage from "./pages/LoginPage";
import MergeReviewPage from "./pages/MergeReviewPage";
import OutdatedPage from "./pages/OutdatedPage";
import QuestionnaireReviewPage from "./pages/QuestionnaireReviewPage";
import QuestionnaireUploadPage from "./pages/QuestionnaireUploadPage";
import SearchPage from "./pages/SearchPage";
import TrustCenterPage from "./pages/TrustCenterPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public trust center — no auth. */}
      <Route path="/trust/:slug" element={<TrustCenterPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/questionnaires" element={<QuestionnaireUploadPage />} />
        <Route path="/questionnaires/:id/review" element={<QuestionnaireReviewPage />} />
        <Route path="/library-health" element={<LibraryHealthPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/import" element={<ImportHubPage />} />
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/outdated" element={<OutdatedPage />} />
        <Route path="/merge" element={<MergeReviewPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/datasources" element={<DataSourcesPage />} />
      </Route>
    </Routes>
  );
}

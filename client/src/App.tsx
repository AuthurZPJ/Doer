import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Todos = lazy(() => import('./pages/Todos'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Learnings = lazy(() => import('./pages/Learnings'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 dark:text-gray-500">Loading…</div>
          </div>
        }>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/todos" element={<Todos />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/learnings" element={<Learnings />} />
              <Route path="/weekly-report" element={<WeeklyReport />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-2xl text-gray-400 dark:text-gray-500">404</p>
                </div>
              } />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <ToastContainer />
    </>
  );
}

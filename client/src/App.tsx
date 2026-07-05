import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Todos from './pages/Todos';
import Meetings from './pages/Meetings';
import Learnings from './pages/Learnings';
import WeeklyReport from './pages/WeeklyReport';
import SearchPage from './pages/SearchPage';
import TagsPage from './pages/TagsPage';
import { ToastContainer } from './components/Toast';

export default function App() {
  return (
    <>
      <ErrorBoundary>
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
                <p className="text-2xl text-gray-400">404</p>
              </div>
            } />
          </Route>
        </Routes>
      </ErrorBoundary>
      <ToastContainer />
    </>
  );
}

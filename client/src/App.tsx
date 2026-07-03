import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Todos from './pages/Todos';
import Meetings from './pages/Meetings';
import Learnings from './pages/Learnings';
import Issues from './pages/Issues';
import WeeklyReport from './pages/WeeklyReport';
import { ToastContainer } from './components/Toast';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/learnings" element={<Learnings />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/weekly-report" element={<WeeklyReport />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

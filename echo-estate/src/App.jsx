import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './services/auth.jsx';
import Home from './Home';
import Login from './Login';
import LoadingSpinner from './components/LoadingSpinner';
import Register from './Register';
import Dashboard from './Dashboard';
import Memories from './Memories';
import AddMemory from './AddMemory';
import Profile from './Profile';
import ProtectedRoute from './components/ProtectedRoute';
import CreateLegacy from './CreateLegacy';
import LegacyProfile from './LegacyProfile';
import MemoryGraph from './MemoryGraph';
import LifeStorybook from './LifeStorybook';
import VoiceStudio from './VoiceStudio';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <main className="page-shell grid min-h-screen place-items-center px-5">
        <LoadingSpinner label="Authenticating" />
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/legacies/new" element={<ProtectedRoute><CreateLegacy /></ProtectedRoute>} />
        <Route path="/legacy/:legacyId" element={<ProtectedRoute><LegacyProfile /></ProtectedRoute>} />
        <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
        <Route path="/add-memory" element={<ProtectedRoute><AddMemory /></ProtectedRoute>} />
        <Route path="/memory-graph" element={<ProtectedRoute><MemoryGraph /></ProtectedRoute>} />
        <Route path="/storybook" element={<ProtectedRoute><LifeStorybook /></ProtectedRoute>} />
        <Route path="/voice-studio" element={<ProtectedRoute><VoiceStudio /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

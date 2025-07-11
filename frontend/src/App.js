import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NotesList from './pages/NotesList';
import AddNoteForm from './pages/AddNoteForm';
import LoginForm from './components/LoginForm'; // à créer

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/" element={<PrivateRoute><NotesList /></PrivateRoute>} />
        <Route path="/add" element={<PrivateRoute><AddNoteForm /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

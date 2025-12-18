import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TermDetail from './pages/TermDetail';
import EditTerm from './pages/EditTerm';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/terms/:slug" element={<TermDetail />} />
    <Route path="/edit/:id" element={<EditTerm />} />
    {/* fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;

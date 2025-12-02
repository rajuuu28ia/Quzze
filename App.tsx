import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuizPage from './client/pages/QuizPage';
import RoomPage from './client/pages/RoomPage';
import AdminDashboard from './client/pages/AdminDashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="/admin/:secretKey" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

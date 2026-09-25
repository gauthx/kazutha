import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';

export function App() {
  return (
    <BrowserRouter>
      <main className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<GamePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;

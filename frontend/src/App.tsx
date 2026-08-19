import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import BatteryAnalysis from './pages/BatteryAnalysis';
import BmsSimulation from './pages/BmsSimulation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/battery" element={<BatteryAnalysis />} />
          <Route path="/bms" element={<BmsSimulation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

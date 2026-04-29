import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calculator, Layers, Archive } from 'lucide-react';
import './App.css';
import FabricDirectory from './pages/FabricDirectory';
import ItemCalculator from './pages/ItemCalculator';
import SavedCostumes from './pages/SavedCostumes';

function Sidebar() {
  const location = useLocation();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Adum Culture
      </div>
      <Link 
        to="/" 
        className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
      >
        <Layers size={20} />
        Fabrics Directory
      </Link>
      <Link 
        to="/calculator" 
        className={`sidebar-link ${location.pathname === '/calculator' ? 'active' : ''}`}
      >
        <Calculator size={20} />
        Cost Calculator
      </Link>
      <Link 
        to="/inventory" 
        className={`sidebar-link ${location.pathname === '/inventory' ? 'active' : ''}`}
      >
        <Archive size={20} />
        Costumes Inventory
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<FabricDirectory />} />
            <Route path="/calculator" element={<ItemCalculator />} />
            <Route path="/inventory" element={<SavedCostumes />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

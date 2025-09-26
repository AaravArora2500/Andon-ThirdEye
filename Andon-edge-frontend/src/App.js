import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Andon from './pages/Andon';
import DowntimeTagging from './pages/DowntimeTagging';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/andon" element={<Andon />} />
          <Route path="/downtime-tagging" element={<DowntimeTagging />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;

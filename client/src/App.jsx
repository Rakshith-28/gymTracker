import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import LogWorkout from './pages/LogWorkout';
import WorkoutHistory from './pages/WorkoutHistory';

function App() {
  return (
    <Router>
      <div>
        <h1>Gym Tracker</h1>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/log-workout" element={<LogWorkout />} />
          <Route path="/history" element={<WorkoutHistory />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
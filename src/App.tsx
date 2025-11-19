import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import Home from './pages/Home'
import Coaches from './pages/Coaches'
import BrowseCoaches from './pages/BrowseCoaches'
import MealPlans from './pages/MealPlans'
import WorkoutPlans from './pages/WorkoutPlans'
import SignUp from './pages/SignUp'
import Login from './pages/Login'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/coaches" element={<Coaches />} />
              <Route path="/browse-coaches" element={<BrowseCoaches />} />
              <Route path="/meal-plans" element={<MealPlans />} />
              <Route path="/workout-plans" element={<WorkoutPlans />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  )
}

export default App

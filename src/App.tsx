import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import Home from './pages/Home'
import Coaches from './pages/Coaches'
import BrowseCoaches from './pages/BrowseCoaches'
import CoachProfile from './pages/CoachProfile'
import Chat from './pages/Chat'
import MealPlans from './pages/MealPlans'
import MealPlansNew from './pages/MealPlansNew'
import MealPlanDetail from './pages/MealPlanDetail'
import WorkoutPlans from './pages/WorkoutPlans'
import WorkoutPlanDetail from './pages/WorkoutPlanDetail'
import Progress from './pages/Progress'
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
              <Route path="/coach/:id" element={<CoachProfile />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:conversationId" element={<Chat />} />
              <Route path="/meal-plans" element={<MealPlans />} />
              <Route path="/meal-plans-new" element={<MealPlansNew />} />
              <Route path="/meal-plan/:id" element={<MealPlanDetail />} />
              <Route path="/workout-plans" element={<WorkoutPlans />} />
              <Route path="/workout-plan/:id" element={<WorkoutPlanDetail />} />
              <Route path="/progress" element={<Progress />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Layout } from './components'
import { RamadanProvider } from './contexts/RamadanContext'

// Lazy load all page components
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Coaches = lazy(() => import('./pages/Coaches'))
const BrowseCoaches = lazy(() => import('./pages/BrowseCoaches'))
const CoachProfile = lazy(() => import('./pages/CoachProfile'))
const Chat = lazy(() => import('./pages/Chat'))
const MealPlans = lazy(() => import('./pages/MealPlans'))
const MealPlansNew = lazy(() => import('./pages/MealPlansNew'))
const MealPlanDetail = lazy(() => import('./pages/MealPlanDetail'))
const CreateMeals = lazy(() => import('./pages/CreateMeals'))
const WorkoutPlans = lazy(() => import('./pages/WorkoutPlans'))
const WorkoutPlanDetail = lazy(() => import('./pages/WorkoutPlanDetail'))
const Progress = lazy(() => import('./pages/Progress'))
const HydrationReminders = lazy(() => import('./pages/HydrationReminders'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Login = lazy(() => import('./pages/Login'))

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
)

function App() {
  return (
    <RamadanProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/coaches" element={<Coaches />} />
                    <Route path="/browse-coaches" element={<BrowseCoaches />} />
                    <Route path="/coach/:id" element={<CoachProfile />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:conversationId" element={<Chat />} />
                    <Route path="/meal-plans" element={<MealPlans />} />
                    <Route path="/meal-plans-new" element={<MealPlansNew />} />
                    <Route path="/meal-plan/:id" element={<MealPlanDetail />} />
                    <Route path="/create-meals" element={<CreateMeals />} />
                    <Route path="/workout-plans" element={<WorkoutPlans />} />
                    <Route path="/workout-plan/:id" element={<WorkoutPlanDetail />} />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/hydration-reminders" element={<HydrationReminders />} />
                  </Routes>
                </Suspense>
              </Layout>
            } />
          </Routes>
        </Suspense>
      </Router>
    </RamadanProvider>
  )
}

export default App

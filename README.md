# 🏋️ Halal Gains

A comprehensive fitness and nutrition app designed specifically for the Muslim community. Track your workouts, follow personalized meal plans, connect with certified coaches, and stay consistent with your health goals—all while respecting Islamic dietary guidelines and accommodating Ramadan fasting.

![Halal Gains Banner](https://img.shields.io/badge/Halal-Certified-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)

## ✨ Features

### 🎯 For Clients

#### 📊 **Dashboard**
- View your daily workout schedule at a glance
- Track completed workouts and meals
- Monitor your current weight and progress
- See your assigned coach information

#### 🏋️ **Workout Plans**
- Access personalized workout plans created by your coach
- Track exercise completion with checkboxes
- View sets, reps, and rest periods for each exercise
- Log your actual performance (weights used, actual reps completed)
- Weekly workout schedule organized by day

#### 🥗 **Meal Plans**
- Follow customized meal plans with detailed nutritional information
- Track daily calorie, protein, carbs, and fat intake
- View individual meals with complete ingredient lists
- Mark days as completed to track consistency
- **🌙 Ramadan Mode**: Special Suhoor and Iftar meal scheduling

#### 📈 **Progress Tracking**
- Log weekly weight measurements
- Visualize weight trends with interactive charts
- Track workout completion rates
- Monitor your transformation over time

#### 💬 **Chat with Coaches**
- Real-time messaging with your assigned coach
- Get guidance and support when you need it
- Read receipts to know when messages are seen

#### 💧 **Hydration Reminders**
- Stay hydrated with customizable reminders
- Track your daily water intake

### 🏆 For Coaches

#### 👥 **Client Management**
- View all your assigned clients
- Track client progress and workout completions
- Monitor client weight changes over time

#### 📝 **Workout Plan Builder**
- Create customized workout plans for each client
- Organize workouts by weeks and days
- Add exercises with detailed instructions
- Set target sets, reps, and rest periods

#### 🍽️ **Meal Plan Creator**
- Design personalized meal plans
- Add detailed nutritional information
- Include Halal-certified food options
- Enable Ramadan mode for fasting schedules

#### 📊 **Progress Monitoring**
- View client workout completion stats
- Track client weight progress with charts
- Review exercise performance logs

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/musty778/Halal-Gains-.git
   cd Halal-Gains-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5175`

### Database Setup

If you're setting up the database for the first time:

```bash
# Set up Supabase locally or connect to your project
npm run db:setup

# Push migrations to your database
npm run db:push
```

## 📱 How to Use

### Creating an Account

1. Visit the landing page and click **"Get Started"**
2. Choose to sign up as a **Client** or **Coach**
3. Fill in your details and create your profile
4. If you're a client, browse coaches and connect with one

### As a Client

1. **Dashboard**: Your home base showing today's workout and quick stats
2. **Workout Plans**: View and complete your assigned workouts
3. **Meal Plans**: Follow your personalized nutrition plan
4. **Progress**: Track your weight and view your transformation
5. **Chat**: Message your coach for guidance

### As a Coach

1. **Dashboard**: Overview of your clients and stats
2. **Workout Plans**: Create and manage workout plans
3. **Meal Plans**: Design nutrition plans for clients
4. **Progress**: Monitor client progress
5. **Chat**: Communicate with your clients

### Ramadan Mode 🌙

Toggle Ramadan mode to:
- Switch meal timing to Suhoor (pre-dawn) and Iftar (sunset)
- Adjust workout schedules around prayer times
- Get fasting-friendly meal suggestions

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | Frontend UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Supabase** | Backend, Auth, and Real-time DB |
| **Chart.js** | Progress visualization |
| **React Router** | Client-side routing |
| **Lucide React** | Beautiful icons |

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── Sidebar.tsx
├── contexts/         # React contexts
│   └── RamadanContext.tsx
├── hooks/            # Custom React hooks
│   ├── useDebounce.ts
│   └── useSupabaseQuery.ts
├── pages/            # Page components
│   ├── Dashboard.tsx
│   ├── WorkoutPlans.tsx
│   ├── MealPlans.tsx
│   ├── Progress.tsx
│   ├── Chat.tsx
│   └── ...
├── services/         # API and external services
│   └── supabase.ts
├── types/            # TypeScript type definitions
│   └── index.ts
└── utils/            # Utility functions
    └── performance.ts
```

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Set up Supabase |
| `npm run db:push` | Push database migrations |
| `npm run db:status` | Check migration status |
| `npm run db:reset` | Reset database |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with love for the Muslim fitness community
- Designed to support healthy lifestyles while respecting Islamic values
- Special features for Ramadan to help maintain fitness during the holy month

---

<div align="center">

**Made with 💚 for the Ummah**

*"Take care of your body. It's the only place you have to live."* — Jim Rohn

</div>

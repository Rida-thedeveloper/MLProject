import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import IntroScreen from './components/IntroScreen';
import { supabase } from './supabaseClient';

// 9 Frontend Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SetupPage from './pages/SetupPage';
import InterviewScreenPage from './pages/InterviewScreenPage';
import QuestionFeedbackPage from './pages/QuestionFeedbackPage';
import FinalReportPage from './pages/FinalReportPage';
import HistoryPage from './pages/HistoryPage';
import ProgressPage from './pages/ProgressPage';

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.22, ease: 'easeIn' } },
};

export default function App() {
  const [authDone, setAuthDone] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const [currentPage, setCurrentPage] = useState('landing');

  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      supabase.auth.getSession()
        .then(res => {
          if (res?.data?.session) {
            const session = res.data.session;
            setUser({
              name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email
            });
            setAuthDone(true);
          }
        })
        .catch(err => console.warn('Supabase getSession skipped:', err));

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setUser({
            name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email
          });
          setAuthDone(true);
        }
      });
      return () => subscription?.unsubscribe();
    } catch (err) {
      console.warn('Supabase auth listener setup failed:', err);
    }
  }, []);

  const [interviewSetup, setInterviewSetup] = useState({
    role: 'Software Engineer',
    difficulty: 'Intermediate',
    type: 'Technical',
    questionCount: 5
  });

  const [recordedAnswers, setRecordedAnswers] = useState({});
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState(null);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage setCurrentPage={setCurrentPage} />;
      case 'login':
        return <LoginPage setCurrentPage={setCurrentPage} setUser={setUser} />;
      case 'dashboard':
        return <DashboardPage setCurrentPage={setCurrentPage} user={user} />;
      case 'setup':
        return (
          <SetupPage
            setCurrentPage={setCurrentPage}
            interviewSetup={interviewSetup}
            setInterviewSetup={setInterviewSetup}
          />
        );
      case 'interview':
        return (
          <InterviewScreenPage
            setCurrentPage={setCurrentPage}
            interviewSetup={interviewSetup}
            recordedAnswers={recordedAnswers}
            setRecordedAnswers={setRecordedAnswers}
            setSelectedAnswerIdx={setSelectedAnswerIdx}
            selectedAnswerIdx={selectedAnswerIdx}
          />
        );
      case 'feedback':
        return (
          <QuestionFeedbackPage
            setCurrentPage={setCurrentPage}
            recordedAnswers={recordedAnswers}
            selectedAnswerIdx={selectedAnswerIdx}
          />
        );
      case 'report':
        return (
          <FinalReportPage
            setCurrentPage={setCurrentPage}
            recordedAnswers={recordedAnswers}
            interviewSetup={interviewSetup}
          />
        );
      case 'history':
        return <HistoryPage setCurrentPage={setCurrentPage} />;
      case 'progress':
        return <ProgressPage setCurrentPage={setCurrentPage} interviewSetup={interviewSetup} />;
      default:
        return <LandingPage setCurrentPage={setCurrentPage} />;
    }
  };

  // Step 1: Auth (login / signup)
  if (!authDone) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh' }}>
        <LoginPage
          setCurrentPage={setCurrentPage}
          setUser={setUser}
          onAuth={() => { setAuthDone(true); setCurrentPage('landing'); }}
        />
      </div>
    );
  }

  // Step 2: Intro video
  if (!introShown) {
    return (
      <div style={{ background: 'var(--obsidian)', minHeight: '100vh' }}>
        <IntroScreen onDone={() => setIntroShown(true)} />
      </div>
    );
  }

  // Step 3: Main site
  return (
    <div
      className="min-h-screen flex flex-col selection:bg-indigo-600 selection:text-white"
      style={{ background: 'var(--obsidian)', color: 'var(--text-primary)' }}
    >
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer setCurrentPage={setCurrentPage} currentPage={currentPage} />
    </div>
  );
}

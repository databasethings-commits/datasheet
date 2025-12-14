import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-space)',
        color: 'var(--text-main)'
      }}>
        Loading Datasheet...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="full-height" style={{ flexDirection: 'row', overflow: 'hidden' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header
          onProfileClick={() => setView('profile')}
          toggleSidebar={toggleSidebar}
        />
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
          <Dashboard
            view={view}
            setView={setView}
            theme={theme}
            toggleTheme={toggleTheme}
            isCollapsed={isSidebarCollapsed}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

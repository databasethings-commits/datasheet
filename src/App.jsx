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

  // Handle navigation with browser history
  const navigateTo = (newView) => {
    if (newView === view) return;
    window.history.pushState({ view: newView }, '', '');
    setView(newView);
  };

  useEffect(() => {
    // Initial history state
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '', '');
    }

    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        // If checking back to start, default to home
        setView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const handleNotificationNavigation = (policyId) => {
    // Dispatch a custom event for Dashboard to listen to
    // This decouples App from knowing specific Dashboard internal logic
    const event = new CustomEvent('openPolicyFromNotification', { detail: { policyId } });
    window.dispatchEvent(event);
  };

  return (
    <div className="full-height">
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'visible' }}>
        <Header
          onProfileClick={() => navigateTo('profile')}
          toggleSidebar={toggleSidebar}
          onNotificationClick={handleNotificationNavigation}
        />
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
          <Dashboard
            view={view}
            setView={navigateTo}
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

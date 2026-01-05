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
  const [isPaused, setIsPaused] = useState(false);

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
    const checkUserStatus = async (user) => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_paused')
        .eq('id', user.id)
        .single();

      if (data?.is_paused) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserStatus(session.user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserStatus(session.user);
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

  if (isPaused) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-space)',
        color: 'var(--text-main)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          padding: '3rem',
          background: 'var(--bg-panel)',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '2rem' }}>Access Paused</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Your account access has been temporarily suspended by the administrator.
            Please contact your Super Admin for reactivation.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '0.8rem 2rem', background: '#334155' }}
            onClick={() => supabase.auth.signOut()}
          >
            Switch Account
          </button>
        </div>
      </div>
    );
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

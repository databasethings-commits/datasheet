import React, { useState, useEffect } from 'react';
import { User, Bell, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Header({ onProfileClick, toggleSidebar }) {
  const [userProfile, setUserProfile] = useState({ name: 'User', id: 'Loading...' });

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserProfile({ name: 'Guest', id: '' });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, agent_code')
        .eq('id', user.id)
        .single();

      const name = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user.email?.split('@')[0];
      const id = profile?.agent_code || 'No Code';

      setUserProfile({ name, id });
    } catch (error) {
      console.error('Error fetching header profile:', error);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Listen for profile updates from Profile.jsx
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  return (
    <header style={{
      backgroundColor: 'var(--bg-panel)', // Use variable background
      backdropFilter: 'var(--backdrop)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--border)',
      transition: 'background-color 0.3s, border-color 0.3s'
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Toggle Sidebar Icon */}
        <button
          onClick={toggleSidebar}
          style={{
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Menu size={24} />
        </button>
        <div className="hide-on-mobile">
          {/* Optional Breadcrumbs or Title if needed */}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
          <Bell size={20} color="var(--text-muted)" />
        </button>

        <div
          onClick={onProfileClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="hide-on-mobile">
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{userProfile.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {userProfile.id}</span>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}

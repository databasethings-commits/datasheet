import React, { useState, useEffect } from 'react';
import { User, Bell, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getNotifications, markNotificationRead } from '../utils/storage';

export default function Header({ onProfileClick, toggleSidebar, onNotificationClick }) {
  const [userProfile, setUserProfile] = useState({ name: 'User', id: 'Loading...' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

      // Fetch notifications
      const notifs = await getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching header profile:', error);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Listen for profile updates from Profile.jsx
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Realtime subscription for notifications
    const subscription = supabase
      .channel('notifications_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        // Verify if the notification is for the current user
        // RLS usually handles this, but client-side check is safe if payload is broadcasted
        // Since we rely on RLS, we assume we only get what we can see.
        // Fetch fresh to be sure or append payload.new
        // Let's just re-fetch to keep it simple and consistent with sorting/filtering
        getNotifications().then(n => {
          setNotifications(n);
          setUnreadCount(n.filter(x => !x.is_read).length);
        });
      })
      .subscribe();

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      supabase.removeChannel(subscription);
    };
  }, []);

  // Auto-refresh notifications when looking at them
  useEffect(() => {
    if (showNotifications) {
      getNotifications().then(n => {
        setNotifications(n);
        setUnreadCount(n.filter(x => !x.is_read).length);
      });
    }
  }, [showNotifications]);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      const updated = notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.is_read).length);
    }

    // Navigate even if read
    if (notif.policy_id && onNotificationClick) {
      setShowNotifications(false); // Close dropdown
      onNotificationClick(notif.policy_id);
    }
  };

  return (
    <header style={{
      backgroundColor: 'var(--bg-panel)', // Use variable background
      backdropFilter: 'var(--backdrop)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--border)',
      transition: 'background-color 0.3s, border-color 0.3s',
      position: 'relative', // For notification dropdown
      zIndex: 50 // Ensure it stays on top of dashboard content
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
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', position: 'relative' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} color={showNotifications ? 'var(--primary)' : "var(--text-muted)"} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white',
                fontSize: '0.6rem', padding: '2px 5px', borderRadius: '10px', minWidth: '16px'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute', top: '150%', right: '-50px', width: '300px',
              background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 1000, overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Notifications</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={async (e) => { e.stopPropagation(); const n = await getNotifications(); setNotifications(n); setUnreadCount(n.filter(x => !x.is_read).length); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Refresh
                  </button>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                </div>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                        background: notif.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.1)', // More visible unread state
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-space)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(56, 189, 248, 0.1)'}
                    >
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: notif.is_read ? 400 : 600 }}>
                        {notif.message}
                      </p>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

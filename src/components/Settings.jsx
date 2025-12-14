import React from 'react';

export default function Settings({ theme, toggleTheme }) {
    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Settings</h2>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Appearance & Data</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Offline Mode</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Save data locally when internet is unavailable</div>
                    </div>
                    <input type="checkbox" checked readOnly style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Dark Mode</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{theme === 'dark' ? 'On' : 'Off'}</div>
                    </div>
                    <input
                        type="checkbox"
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Notifications</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                    <div>
                        <div style={{ fontWeight: 500 }}>Email Alerts</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Get notified on policy submission</div>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px' }} />
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>About</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: '0.5rem' }}><strong>DATASHEET App</strong> v1.0.3</p>
                    <p>© 2024 LIC Authorization. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

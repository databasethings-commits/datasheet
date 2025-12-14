import React from 'react';
import { Home, Database, FileText, User, Settings, Shield } from 'lucide-react';

export default function Sidebar({ view, onChangeView, stats, isCollapsed, userRole }) {
    const menuItems = [
        { id: 'home', label: 'Home', icon: Home, count: null },
        { id: 'data', label: 'Data', icon: Database, count: stats.submitted },
        { id: 'drafts', label: 'Drafts', icon: FileText, count: stats.drafts },
        { id: 'profile', label: 'Profile', icon: User, count: null },
        ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Shield, count: null }] : []),
        { id: 'settings', label: 'Settings', icon: Settings, count: null },
    ];

    return (
        <div className="sidebar" style={{
            backgroundColor: 'var(--bg-panel)',
            backdropFilter: 'var(--backdrop)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            position: 'relative',
            zIndex: 50,
            width: isCollapsed ? '90px' : '260px',
            height: '100%',
            transition: 'all 0.3s ease',
            flexShrink: 0,
            overflow: 'hidden'
        }}>

            <div style={{
                marginBottom: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                paddingLeft: isCollapsed ? '0' : '0.5rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, var(--accent), #d97706)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
                    flexShrink: 0
                }}>
                    <Shield size={18} color="#fff" />
                </div>
                {!isCollapsed && (
                    <h3 style={{
                        fontSize: '1.1rem',
                        margin: 0,
                        letterSpacing: '1px',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        opacity: 1,
                        transition: 'opacity 0.2s'
                    }}>
                        DATASHEET
                    </h3>
                )}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {menuItems.map(item => {
                    const isActive = view === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            title={isCollapsed ? item.label : ''}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isCollapsed ? 'center' : 'space-between',
                                padding: '1rem',
                                borderRadius: '12px',
                                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                border: isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                                width: '100%',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Icon size={20} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                                {!isCollapsed && (
                                    <span style={{
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.95rem',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {item.label}
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && item.count !== null && (
                                <span style={{
                                    backgroundColor: isActive ? 'var(--primary)' : 'rgba(148, 163, 184, 0.1)',
                                    color: isActive ? '#fff' : 'var(--text-muted)',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {item.count}
                                </span>
                            )}
                            {/* Dot indicator for count when collapsed */}
                            {isCollapsed && item.count !== null && item.count > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '25px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary)',
                                    border: '1px solid var(--bg-panel)'
                                }} />
                            )}
                        </button>
                    )
                })}
            </nav>

            <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1.5rem',
                textAlign: isCollapsed ? 'center' : 'left'
            }}>
                {!isCollapsed ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v2.1 • Enterprise</p>
                ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v2.1</p>
                )}
            </div>
        </div>
    );
}

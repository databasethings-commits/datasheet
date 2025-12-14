import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Mail, Phone, Calendar, User, LogOut, Edit2, Save, X, Briefcase, FileBadge } from 'lucide-react';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        agentCode: '',
        doCode: '',
        doName: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                userProfile = { id: user.id, email: user.email, role: 'agent', first_name: '', last_name: '' };
            }

            setProfile(userProfile);
            setFormData({
                firstName: userProfile?.first_name || '',
                lastName: userProfile?.last_name || '',
                agentCode: userProfile?.agent_code || '',
                doCode: userProfile?.do_code || '',
                doName: userProfile?.do_name || ''
            });

            if (userProfile?.role === 'admin') {
                const { data: allAgents } = await supabase.from('profiles').select('*');
                setAgents(allAgents || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                agent_code: formData.agentCode,
                do_code: formData.doCode,
                do_name: formData.doName
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;

            setProfile({ ...profile, ...updates });
            setIsEditing(false);

            // Notify other components (Header) that profile has changed
            window.dispatchEvent(new CustomEvent('profileUpdated'));
        } catch (err) {
            alert('Failed to update profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (loading) return <div>Loading Profile...</div>;

    return (
        <div className="container" style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--primary)', margin: 0 }}>Agent Profile</h2>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <LogOut size={18} style={{ marginRight: '8px' }} /> Sign Out
                </button>
            </div>

            {/* Profile Card */}
            <div className="card" style={{ marginBottom: '2rem', position: 'relative' }}>
                {/* Edit Toggle */}
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--primary)'
                        }}
                    >
                        <Edit2 size={20} />
                    </button>
                ) : (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setIsEditing(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                            title="Cancel"
                        >
                            <X size={20} />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--success)'
                            }}
                            title="Save"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        boxShadow: 'var(--primary-glow)'
                    }}>
                        {(profile?.first_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                        {isEditing ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    className="form-control"
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    className="form-control"
                                    value={formData.lastName}
                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        ) : (
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Agent'}
                                {profile?.role === 'admin' && <span style={{ fontSize: '0.8rem', background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle' }}>ADMIN</span>}
                            </h3>
                        )}
                        <p style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <Mail size={14} /> Email
                        </label>
                        <div style={{ fontWeight: 500 }}>{profile?.email}</div>
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <Shield size={14} /> Role
                        </label>
                        <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{profile?.role}</div>
                    </div>
                </div>

                {/* Additional Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <FileBadge size={14} /> Agent Code
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter Agent Code"
                                value={formData.agentCode}
                                onChange={e => setFormData({ ...formData, agentCode: e.target.value })}
                            />
                        ) : (
                            <div style={{ fontWeight: 500 }}>{profile?.agent_code || '-'}</div>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <Briefcase size={14} /> DO Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Development Officer Name"
                                value={formData.doName}
                                onChange={e => setFormData({ ...formData, doName: e.target.value })}
                            />
                        ) : (
                            <div style={{ fontWeight: 500 }}>{profile?.do_name || '-'}</div>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <FileBadge size={14} /> DO Code
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Development Officer Code"
                                value={formData.doCode}
                                onChange={e => setFormData({ ...formData, doCode: e.target.value })}
                            />
                        ) : (
                            <div style={{ fontWeight: 500 }}>{profile?.do_code || '-'}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Admin Section */}
            {profile?.role === 'admin' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Agent Management</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            * Create new users in the Supabase Dashboard
                        </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Email</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Role</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem' }}>{agent.email}</td>
                                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: agent.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                            color: agent.role === 'admin' ? 'var(--accent)' : 'var(--primary)',
                                            fontSize: '0.85rem'
                                        }}>
                                            {agent.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {new Date(agent.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

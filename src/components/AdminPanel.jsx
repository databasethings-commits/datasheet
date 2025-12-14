import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, Shield, User, Loader, Save } from 'lucide-react';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form Stats
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'agent' // Default
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: formData
            });

            if (data?.error) throw new Error(data.error);
            if (error) throw new Error(error.message || 'Failed to invoke function');

            setSuccess(`User ${formData.email} created successfully!`);
            setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'agent' });
            fetchUsers(); // Refresh list
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`Permanently delete user ${user.email}? This cannot be undone.`)) return;

        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { user_id: user.id }
            });

            if (data?.error) throw new Error(data.error);
            if (error) throw new Error(error.message);

            setSuccess(`User ${user.email} deleted.`);
            fetchUsers();
        } catch (err) {
            setError('Failed to delete user: ' + err.message);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            setError('Failed to update role: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={28} /> Super Admin Panel
            </h2>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '10px', borderRadius: '4px', marginBottom: '1rem' }}>{success}</div>}

            {/* Create User Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Create New User</h3>

                <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={formData.firstName}
                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            type="text"
                            className="form-control"
                            required
                            value={formData.lastName}
                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-control"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-control"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Role</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="agent"
                                    checked={formData.role === 'agent'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                                Agent (Standard User)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={formData.role === 'admin'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                                Super Admin
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ gridColumn: 'span 2', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                        disabled={creating}
                    >
                        {creating ? 'Creating...' : <><UserPlus size={18} /> Create User</>}
                    </button>
                </form>
            </div>

            {/* User List */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Registered Users</h3>
                {loading ? <p>Loading users...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Role</th>
                                <th style={{ padding: '1rem' }}>Joined</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                        {user.first_name} {user.last_name}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.email}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: user.role === 'admin' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                                color: user.role === 'admin' ? '#ec4899' : '#0ea5e9',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            <option value="agent">AGENT</option>
                                            <option value="admin">SUPER ADMIN</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '5px',
                                                borderRadius: '4px'
                                            }}
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

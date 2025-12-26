import React, { useState, useEffect } from 'react';
import { Trash2, Share2, Users, X, UserMinus, Plus } from 'lucide-react';
import { sharePolicy, getPolicyShares, removePolicyShare } from '../utils/storage';

export default function PolicyList({ policies, isDraft, onAction, onDelete, currentUserId, refreshData }) {
    const [isMobile, setIsMobile] = useState(false);
    const [managingPolicy, setManagingPolicy] = useState(null); // The policy being managed
    const [sharedUsers, setSharedUsers] = useState([]);
    const [newShareEmail, setNewShareEmail] = useState('');
    const [loadingShares, setLoadingShares] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const openShareModal = async (e, policy) => {
        e.stopPropagation();
        setManagingPolicy(policy);
        setLoadingShares(true);
        try {
            const shares = await getPolicyShares(policy.id);
            setSharedUsers(shares);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingShares(false);
        }
    };

    const closeShareModal = () => {
        setManagingPolicy(null);
        setSharedUsers([]);
        setNewShareEmail('');
    };

    const handleAddShare = async (e) => {
        e.preventDefault();
        if (!newShareEmail || !newShareEmail.includes('@')) {
            alert("Invalid Email");
            return;
        }
        try {
            await sharePolicy(managingPolicy.id, newShareEmail);
            setSharedUsers(prev => [...prev, newShareEmail]); // Optimistic update
            setNewShareEmail('');
            if (refreshData) refreshData(); // Refresh dashboard stats/counts
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemoveShare = async (email) => {
        if (!confirm(`Stop sharing with ${email}?`)) return;
        try {
            await removePolicyShare(managingPolicy.id, email);
            setSharedUsers(prev => prev.filter(e => e !== email));
            if (refreshData) refreshData(); // Refresh dashboard stats/counts
        } catch (err) {
            alert("Failed to remove share.");
        }
    };

    // --- Modal Renderer ---
    const renderShareModal = () => {
        if (!managingPolicy) return null;
        return (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }} onClick={closeShareModal}>
                <div style={{
                    background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px',
                    width: '90%', maxWidth: '450px', border: '1px solid var(--border)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Share Application</h3>
                        <button onClick={closeShareModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Shared with:</h4>
                        {loadingShares ? <p style={{ fontSize: '0.9rem' }}>Loading...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                {sharedUsers.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not shared with anyone yet.</p> : (
                                    sharedUsers.map(email => (
                                        <div key={email} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.5rem', background: 'var(--bg-space)', borderRadius: '6px', border: '1px solid var(--border)'
                                        }}>
                                            <span style={{ fontSize: '0.9rem' }}>{email}</span>
                                            <button onClick={() => handleRemoveShare(email)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Remove Access">
                                                <UserMinus size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAddShare} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="email"
                            placeholder="Enter email to invite..."
                            className="form-control"
                            value={newShareEmail}
                            onChange={e => setNewShareEmail(e.target.value)}
                            required
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                            <Plus size={18} /> Invite
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    if (policies.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>No {isDraft ? 'drafts' : 'submitted policies'} found.</p>
            </div>
        );
    }

    const PolicyRowMobile = ({ policy }) => (
        <div className="card" style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {policy.firstName} {policy.lastName}
                    {policy.ownerId !== currentUserId && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={10} /> Shared</span>}
                    {policy.ownerId === currentUserId && policy.sharedCount > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--success, #22c55e)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Share2 size={10} /> Shared ({policy.sharedCount})</span>}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    {new Date(policy.lastModified).toLocaleDateString()}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Plan</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>{policy.policyPlan || '-'}</p>
                </div>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Sum Assured</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>₹{policy.sumAssured || '-'}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flex: 1 }}
                    onClick={() => onAction(policy)}
                >
                    {isDraft ? 'Resume' : 'View'}
                </button>
                {policy.ownerId === currentUserId && (
                    <button
                        className="btn btn-secondary"
                        onClick={(e) => openShareModal(e, policy)}
                        style={{ padding: '0.5rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: 'none' }}
                        title="Share"
                    >
                        <Share2 size={16} />
                    </button>
                )}
                <button
                    className="btn"
                    onClick={() => onDelete(policy)}
                    style={{ padding: '0.5rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }}
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );

    const PolicyRowDesktop = ({ policy }) => (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '1rem', fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {policy.firstName} {policy.lastName}
                    {policy.ownerId !== currentUserId && <span title="Shared with you" style={{ color: 'var(--accent)' }}><Users size={14} /></span>}
                    {policy.ownerId === currentUserId && policy.sharedCount > 0 && <span title={`Shared with ${policy.sharedCount} others`} style={{ color: 'var(--success, #22c55e)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem' }}><Share2 size={14} /> {policy.sharedCount}</span>}
                </div>
            </td>
            <td style={{ padding: '1rem' }}>{policy.policyPlan || '-'}</td>
            <td style={{ padding: '1rem' }}>₹{policy.sumAssured || '-'}</td>
            <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {new Date(policy.lastModified).toLocaleDateString()}
            </td>
            <td style={{ padding: '1rem', textAlign: 'right' }}>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    onClick={() => onAction(policy)}
                >
                    {isDraft ? 'Resume' : 'View'}
                </button>
                {policy.ownerId === currentUserId && (
                    <button
                        className="btn btn-secondary"
                        onClick={(e) => openShareModal(e, policy)}
                        style={{ padding: '0.5rem', marginLeft: '0.5rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: 'none' }}
                        title="Share"
                    >
                        <Share2 size={16} />
                    </button>
                )}
                <button
                    className="btn"
                    onClick={() => onDelete(policy)}
                    style={{ padding: '0.5rem', marginLeft: '0.5rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }}
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );

    return (
        <>
            {renderShareModal()}
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {policies.map(policy => <PolicyRowMobile key={policy.id} policy={policy} />)}
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Plan</th>
                                <th style={{ padding: '1rem' }}>Sum Assured</th>
                                <th style={{ padding: '1rem' }}>Last Modified</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map(policy => <PolicyRowDesktop key={policy.id} policy={policy} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

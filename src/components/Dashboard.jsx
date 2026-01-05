import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Import supabase to fetch profile
import CustomerForm from './CustomerForm';
import PolicyList from './PolicyList';
import Sidebar from './Sidebar';
import Profile from './Profile';
import Settings from './Settings';
import AdminPanel from './AdminPanel'; // Import AdminPanel
import { getPolicies, getCounts, deletePolicy, getPolicyById } from '../utils/storage';

export default function Dashboard({ view, setView, theme, toggleTheme, isCollapsed }) {
    const [stats, setStats] = useState({ submitted: 0, drafts: 0 });
    const [submittedPolicies, setSubmittedPolicies] = useState([]);
    const [draftPolicies, setDraftPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin' or 'agent'
    const [userId, setUserId] = useState(null);
    const [dataFilter, setDataFilter] = useState('all'); // 'all', 'owned', 'shared'

    const [editingPolicy, setEditingPolicy] = useState(null);
    const [startStep, setStartStep] = useState(1);
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        fetchData();
        fetchUserRole();
    }, [view]);

    // Handle deep linking/notification opening
    useEffect(() => {
        const handleOpenPolicy = async (event) => {
            const { policyId } = event.detail;
            if (!policyId) return;

            setLoading(true);
            try {
                // We need to fetch this specific policy because it might not be in the current list
                // (e.g. if we are on 'home' or 'drafts' view)
                // Actually safer to fetch fresh to ensure we have permissions
                const policy = await getPolicyById(policyId);

                if (policy) {
                    setEditingPolicy(policy);
                    setStartStep(10); // Review step
                    setIsReadOnly(policy.ownerId !== userId); // Read only if shared
                    setView('form');
                } else {
                    alert("Content not found or access denied.");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to load policy.");
            } finally {
                setLoading(false);
            }
        };

        window.addEventListener('openPolicyFromNotification', handleOpenPolicy);
        return () => window.removeEventListener('openPolicyFromNotification', handleOpenPolicy);
    }, [userId]); // Depend on userId to set IsReadOnly correctly

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data) setUserRole(data.role);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const counts = await getCounts();
            setStats(counts);

            if (view === 'data') {
                const submitted = await getPolicies('SUBMITTED');
                setSubmittedPolicies(submitted);
            } else if (view === 'drafts') {
                const drafts = await getPolicies('DRAFT');
                setDraftPolicies(drafts);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Data Sync
    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel(`dashboard_sync_${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'policies' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'policy_shares' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, view]);

    const handleStartNew = () => {
        setEditingPolicy(null);
        setStartStep(1);
        setIsReadOnly(false);
        setView('form');
    };

    const handleResumeDraft = (draft) => {
        setEditingPolicy(draft);
        setStartStep(1);
        setIsReadOnly(false);
        setView('form');
    };

    const handleFormClose = () => {
        setView('home');
        fetchData();
    };

    const handleDelete = async (policy) => {
        if (confirm(`Are you sure you want to delete the application for ${policy.firstName} ${policy.lastName}?`)) {
            try {
                await deletePolicy(policy.id);
                fetchData();
            } catch (err) {
                alert("Failed to delete application");
            }
        }
    };

    if (view === 'form') {
        return <CustomerForm
            initialData={editingPolicy}
            initialStep={startStep}
            readOnly={isReadOnly}
            onCancel={handleFormClose}
            onSuccess={handleFormClose}
            onEdit={editingPolicy?.ownerId === userId ? () => setIsReadOnly(false) : null}
        />;
    }

    // Filter policies based on selection
    const filteredPolicies = submittedPolicies.filter(p => {
        if (dataFilter === 'owned') return p.ownerId === userId;
        if (dataFilter === 'shared') return p.ownerId !== userId;
        return true;
    });

    return (
        <div className="dashboard-layout">
            <Sidebar
                view={view}
                onChangeView={setView}
                stats={stats}
                isCollapsed={isCollapsed}
                userRole={userRole} // Pass role to sidebar
            />

            <div style={{ flex: 1, padding: '1rem 0' }}>
                {view === 'home' && (
                    <div className="card welcome-card" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Welcome</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                            Start a new customer data collection session for life insurance policies.
                        </p>
                        <button className="btn btn-primary" onClick={handleStartNew} style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                            + New Policy Application
                        </button>
                        <div className="stats-container">
                            <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', minWidth: '150px' }}>
                                <h3 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stats.submitted}</h3>
                                <span style={{ color: 'var(--text-muted)' }}>Submitted</span>
                            </div>
                            <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', minWidth: '150px' }}>
                                <h3 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stats.drafts}</h3>
                                <span style={{ color: 'var(--text-muted)' }}>Drafts</span>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'data' && (
                    <div>
                        <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ color: 'var(--primary)', margin: 0 }}>Submitted Applications</h2>
                            <div className="filter-container">
                                <button
                                    onClick={() => setDataFilter('all')}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: dataFilter === 'all' ? 'var(--primary)' : 'transparent',
                                        color: dataFilter === 'all' ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setDataFilter('owned')}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: dataFilter === 'owned' ? 'var(--primary)' : 'transparent',
                                        color: dataFilter === 'owned' ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    My Data
                                </button>
                                <button
                                    onClick={() => setDataFilter('shared')}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: dataFilter === 'shared' ? 'var(--primary)' : 'transparent',
                                        color: dataFilter === 'shared' ? 'white' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Shared With Me
                                </button>
                            </div>
                        </div>

                        {loading ? <p>Loading...</p> : (
                            <PolicyList
                                policies={filteredPolicies}
                                isDraft={false}
                                onAction={(p) => {
                                    setEditingPolicy(p);
                                    setStartStep(10);
                                    // Read only if forced (view mode) or if I am not the owner
                                    setIsReadOnly(true);
                                    setView('form');
                                }}
                                onDelete={handleDelete}
                                currentUserId={userId}
                                refreshData={fetchData}
                            />
                        )}
                    </div>
                )}

                {view === 'drafts' && (
                    <div>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Draft Applications</h2>
                        {loading ? <p>Loading...</p> : (
                            <PolicyList
                                policies={draftPolicies}
                                isDraft={true}
                                onAction={(p) => {
                                    // If I am not the owner, force read only even for drafts (though likely rare)
                                    const isOwner = p.ownerId === userId;
                                    if (isOwner) {
                                        handleResumeDraft(p);
                                    } else {
                                        setEditingPolicy(p);
                                        setStartStep(10);
                                        setIsReadOnly(true);
                                        setView('form');
                                    }
                                }}
                                onDelete={handleDelete}
                                currentUserId={userId}
                                refreshData={fetchData}
                            />
                        )}
                    </div>
                )}

                {view === 'admin' && userRole === 'admin' && <AdminPanel />}

                {view === 'profile' && <Profile />}
                {view === 'settings' && <Settings theme={theme} toggleTheme={toggleTheme} />}
            </div>
        </div>
    );
}

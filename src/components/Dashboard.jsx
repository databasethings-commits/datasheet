import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Import supabase to fetch profile
import CustomerForm from './CustomerForm';
import PolicyList from './PolicyList';
import Sidebar from './Sidebar';
import Profile from './Profile';
import Settings from './Settings';
import AdminPanel from './AdminPanel'; // Import AdminPanel
import { getPolicies, getCounts, deletePolicy } from '../utils/storage';

export default function Dashboard({ view, setView, theme, toggleTheme, isCollapsed }) {
    const [stats, setStats] = useState({ submitted: 0, drafts: 0 });
    const [submittedPolicies, setSubmittedPolicies] = useState([]);
    const [draftPolicies, setDraftPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'admin' or 'agent'

    const [editingPolicy, setEditingPolicy] = useState(null);
    const [startStep, setStartStep] = useState(1);
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        fetchData();
        fetchUserRole();
    }, [view]);

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
            onEdit={() => setIsReadOnly(false)}
        />;
    }

    return (
        <div className="container" style={{ display: 'flex', gap: '2rem', padding: '0' }}>
            <Sidebar
                view={view}
                onChangeView={setView}
                stats={stats}
                isCollapsed={isCollapsed}
                userRole={userRole} // Pass role to sidebar
            />

            <div style={{ flex: 1, padding: '1rem 0' }}>
                {view === 'home' && (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Welcome</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                            Start a new customer data collection session for life insurance policies.
                        </p>
                        <button className="btn btn-primary" onClick={handleStartNew} style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                            + New Policy Application
                        </button>
                        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Submitted Applications</h2>
                        {loading ? <p>Loading...</p> : (
                            <PolicyList
                                policies={submittedPolicies}
                                isDraft={false}
                                onAction={(p) => {
                                    setEditingPolicy(p);
                                    setStartStep(10);
                                    setIsReadOnly(true);
                                    setView('form');
                                }}
                                onDelete={handleDelete}
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
                                onAction={handleResumeDraft}
                                onDelete={handleDelete}
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

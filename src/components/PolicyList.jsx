import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export default function PolicyList({ policies, isDraft, onAction, onDelete }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (policies.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>No {isDraft ? 'drafts' : 'submitted policies'} found.</p>
            </div>
        );
    }

    // Mobile Card View
    if (isMobile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {policies.map(policy => (
                    <div key={policy.id} className="card" style={{ padding: '1rem' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                                {policy.firstName} {policy.lastName}
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
                ))}
            </div>
        );
    }

    // Desktop Table View
    return (
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
                    {policies.map(policy => (
                        <tr key={policy.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>
                                {policy.firstName} {policy.lastName}
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}

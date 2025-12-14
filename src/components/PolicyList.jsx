import React from 'react';
import { Trash2 } from 'lucide-react';

export default function PolicyList({ policies, isDraft, onAction, onDelete }) {
    if (policies.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>No {isDraft ? 'drafts' : 'submitted policies'} found.</p>
            </div>
        );
    }

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

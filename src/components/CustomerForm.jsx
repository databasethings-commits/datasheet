import React, { useState, useRef } from 'react';
import { savePolicy, deletePolicy, uploadFile } from '../utils/storage';
import { Plus, Trash, Check, Upload, Camera, FileText, X, Eye, Edit2 } from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Personal' },
    { id: 2, title: 'Edu & Occ' },
    { id: 3, title: 'Address' },
    { id: 4, title: 'Family Hist' },
    { id: 5, title: 'Nominee' },
    { id: 6, title: 'Prev Policy' },
    { id: 7, title: 'Bank' },
    { id: 8, title: 'Medical' },
    { id: 9, title: 'Documents' },
    { id: 10, title: 'Summary' }
];

export default function CustomerForm({ onCancel, onSuccess, initialData, initialStep = 1, readOnly = false, onEdit }) {
    const [step, setStep] = useState(initialStep);
    const [formData, setFormData] = useState(initialData || {
        // 1. Personal
        firstName: '', lastName: '', dob: '', gender: 'Male', maritalStatus: 'Single',
        // 2. Edu & Occ
        education: '', occupation: '', annualIncome: '',
        // 3. Address
        phone: '', email: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
        // 4. Family History (Array of objects)
        familyHistory: [],
        // 5. Nominee
        nomineeName: '', nomineeRelation: '', nomineeDob: '', nomineeShare: '100',
        // 6. Appointee (Only if Nominee is minor)
        appointeeName: '', appointeeRelation: '',
        // 7. Previous Policies (Array)
        previousPolicies: [],
        // 8. Bank
        accountNumber: '', ifscCode: '', bankName: '', accountType: 'Savings',
        // 9. Medical
        height: '', weight: '', identificationMark: '', historyOfIllness: 'No', detailsOfIllness: '',
        // 10. Documents
        documents: []
    });

    // States
    const [isScanning, setIsScanning] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Helpers
    const getAge = (dobString) => {
        if (!dobString) return 0;
        const diff = Date.now() - new Date(dobString).getTime();
        return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    };

    const isNomineeMinor = getAge(formData.nomineeDob) < 18;

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- File Handling ---
    const handleFileChange = async (e) => {
        if (readOnly) return;
        const files = Array.from(e.target.files);
        const newDocs = [];
        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                // Store base64 for preview, but keep file for upload
                newDocs.push({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', type: file.type, data: base64, file: file });
            } catch (err) { console.error(err); }
        }
        setFormData(prev => ({ ...prev, documents: [...prev.documents, ...newDocs] }));
    };

    const removeDocument = (index) => {
        if (readOnly) return;
        const updated = formData.documents.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, documents: updated }));
    };

    // --- Camera Logic ---
    const startCamera = async () => {
        if (readOnly) return;
        setIsScanning(true);
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                alert("Could not access camera.");
                setIsScanning(false);
            }
        }, 100);
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    const captureImage = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            setFormData(prev => ({ ...prev, documents: [...prev.documents, { name: `scanned_${Date.now()}.jpg`, size: 'Scanned', type: 'image/jpeg', data: base64 }] }));
            stopCamera();
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            await savePolicy(formData, true);
            alert('Draft saved to Cloud!');
            onSuccess();
        } catch (err) {
            alert('Failed to save draft.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Upload new files first
            const updatedDocuments = await Promise.all(formData.documents.map(async (doc) => {
                if (doc.file) {
                    // It's a new file, upload it
                    try {
                        const folderName = `${formData.firstName} ${formData.lastName}`.trim() || 'Unnamed_Customer';
                        const url = await uploadFile(doc.file, folderName);
                        return { ...doc, url: url, data: null, file: null };
                    } catch (uploadErr) {
                        console.error("Upload failed for", doc.name, uploadErr);
                        throw uploadErr;
                    }
                } else if (doc.data && doc.data.startsWith('data:')) {
                    // It's a scanned base64 image without a file object
                    try {
                        // Convert base64 to Blob
                        const fetchRes = await fetch(doc.data);
                        const blob = await fetchRes.blob();
                        const file = new File([blob], doc.name, { type: doc.type });

                        const folderName = `${formData.firstName} ${formData.lastName}`.trim() || 'Unnamed_Customer';
                        const url = await uploadFile(file, folderName);
                        return { ...doc, url: url, data: null, file: null };
                    } catch (uploadErr) {
                        console.error("Upload failed for scanned doc", doc.name, uploadErr);
                        throw uploadErr;
                    }
                }
                // Already uploaded or old doc
                return doc;
            }));

            const finalData = { ...formData, documents: updatedDocuments };
            await savePolicy(finalData, false);
            // If we are editing a draft, delete the old draft (optional logic, depending on if DB updates in place)
            // But since we use same table, savePolicy handles upsert.
            // However if we are moving from DRAFT to SUBMITTED, the old DRAFT row might stay if we generated a new ID?
            // Actually our safePolicy upserts based on ID. 
            // If status changed, it just updates the row.
            // So we don't need manual deletePolicy unless we want clean up.
            // safely: if (initialData?.id) await deletePolicy(initialData.id, true); 
            // Supabase upsert handles it.

            onSuccess();
        } catch (err) {
            alert('Failed to submit application.');
        } finally {
            setIsSaving(false);
        }
    };
    const nextStep = () => { if (step < 10) setStep(step + 1); };
    const prevStep = () => { if (step > 1) setStep(step - 1); };

    // --- Dynamic Entry Handlers ---
    const addFamilyRow = () => { if (readOnly) return; setFormData(prev => ({ ...prev, familyHistory: [...prev.familyHistory, { member: 'Father', status: 'Living', age: '', cause: '' }] })); };
    const updateFamilyRow = (i, f, v) => { if (readOnly) return; const u = [...formData.familyHistory]; u[i][f] = v; setFormData(prev => ({ ...prev, familyHistory: u })); };
    const removeFamilyRow = (i) => { if (readOnly) return; setFormData(prev => ({ ...prev, familyHistory: formData.familyHistory.filter((_, idx) => idx !== i) })); };
    const addPolicyRow = () => { if (readOnly) return; setFormData(prev => ({ ...prev, previousPolicies: [...prev.previousPolicies, { policyNo: '', tableTerm: '', sumAssured: '', commencementDate: '' }] })); };
    const updatePolicyRow = (i, f, v) => { if (readOnly) return; const u = [...formData.previousPolicies]; u[i][f] = v; setFormData(prev => ({ ...prev, previousPolicies: u })); };
    const removePolicyRow = (i) => { if (readOnly) return; setFormData(prev => ({ ...prev, previousPolicies: formData.previousPolicies.filter((_, idx) => idx !== i) })); };

    // --- Components ---
    const SummarySection = ({ title, stepId, children }) => (
        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-space)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)' }}>{title}</h4>
                {!readOnly && (
                    <button type="button" onClick={() => setStep(stepId)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <Edit2 size={14} /> Edit
                    </button>
                )}
            </div>
            {children}
        </div>
    );

    const DetailRow = ({ label, value }) => (
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{value || '-'}</span>
        </div>
    );

    // --- Render Steps (same as before, but inputs could be disabled if we were showing them, but we primarily show summary in readOnly) ---
    // (Render functions 1-8 ommitted for brevity as they are not used in ReadOnly mode usually if we jump to 9, but let's keep them for robustness)
    const renderStep1_Personal = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">First Name</label><input name="firstName" className="form-control" value={formData.firstName} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Last Name</label><input name="lastName" className="form-control" value={formData.lastName} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" name="dob" className="form-control" value={formData.dob} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Gender</label><select name="gender" className="form-control" value={formData.gender} onChange={handleChange} disabled={readOnly}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="form-group"><label className="form-label">Marital Status</label><select name="maritalStatus" className="form-control" value={formData.maritalStatus} onChange={handleChange} disabled={readOnly}><option>Single</option><option>Married</option><option>Divorced</option></select></div>
        </div>
    );
    const renderStep2_EduOcc = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Education</label><input name="education" className="form-control" placeholder="Highest Qualification" value={formData.education} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Occupation</label><input name="occupation" className="form-control" value={formData.occupation} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Annual Income</label><input type="number" name="annualIncome" className="form-control" value={formData.annualIncome} onChange={handleChange} disabled={readOnly} /></div>
        </div>
    );
    const renderStep3_Address = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Address Line 1</label><input name="addressLine1" className="form-control" value={formData.addressLine1} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Address Line 2</label><input name="addressLine2" className="form-control" value={formData.addressLine2} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">City</label><input name="city" className="form-control" value={formData.city} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">State</label><input name="state" className="form-control" value={formData.state} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Pincode</label><input name="pincode" type="number" className="form-control" value={formData.pincode} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Mobile No.</label><input name="phone" type="tel" className="form-control" value={formData.phone} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Email</label><input name="email" type="email" className="form-control" value={formData.email} onChange={handleChange} disabled={readOnly} /></div>
        </div>
    );
    const renderStep4_Family = () => (
        <div>
            {formData.familyHistory.map((row, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 3fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                    <select className="form-control" value={row.member} onChange={(e) => updateFamilyRow(index, 'member', e.target.value)} disabled={readOnly}><option>Father</option><option>Mother</option><option>Spouse</option><option>Sibling</option><option>Child</option></select>
                    <select className="form-control" value={row.status} onChange={(e) => updateFamilyRow(index, 'status', e.target.value)} disabled={readOnly}><option>Living</option><option>Deceased</option></select>
                    <input type="number" className="form-control" placeholder="Age" value={row.age} onChange={(e) => updateFamilyRow(index, 'age', e.target.value)} disabled={readOnly} />
                    <input className="form-control" placeholder="Cause" value={row.cause} onChange={(e) => updateFamilyRow(index, 'cause', e.target.value)} disabled={readOnly} />
                    {!readOnly && <button type="button" onClick={() => removeFamilyRow(index)} style={{ color: 'red', border: 'none', background: 'none' }}><Trash size={18} /></button>}
                </div>
            ))}
            {!readOnly && <button type="button" onClick={addFamilyRow} className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)' }}><Plus size={16} /> Add Member</button>}
        </div>
    );
    const renderStep5_Nominee = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Nominee Name</label><input name="nomineeName" className="form-control" value={formData.nomineeName} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Relationship</label><select name="nomineeRelation" className="form-control" value={formData.nomineeRelation} onChange={handleChange} disabled={readOnly}><option>Spouse</option><option>Child</option><option>Parent</option><option>Other</option></select></div>
            <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" name="nomineeDob" className="form-control" value={formData.nomineeDob} onChange={handleChange} required disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Share %</label><input type="number" name="nomineeShare" className="form-control" value={formData.nomineeShare} onChange={handleChange} disabled={readOnly} /></div>
            {isNomineeMinor && (
                <div style={{ gridColumn: 'span 2', padding: '1rem', border: '1px solid var(--accent)', borderRadius: '8px', marginTop: '1rem' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Appointee Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group"><label className="form-label">Appointee Name</label><input name="appointeeName" className="form-control" value={formData.appointeeName} onChange={handleChange} disabled={readOnly} /></div>
                        <div className="form-group"><label className="form-label">Relation</label><input name="appointeeRelation" className="form-control" value={formData.appointeeRelation} onChange={handleChange} disabled={readOnly} /></div>
                    </div>
                </div>
            )}
        </div>
    );
    const renderStep6_PreviousPolicies = () => (
        <div>
            {formData.previousPolicies.map((row, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 3fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                    <input className="form-control" placeholder="Policy No" value={row.policyNo} onChange={(e) => updatePolicyRow(index, 'policyNo', e.target.value)} disabled={readOnly} />
                    <input className="form-control" placeholder="Term" value={row.tableTerm} onChange={(e) => updatePolicyRow(index, 'tableTerm', e.target.value)} disabled={readOnly} />
                    <input className="form-control" placeholder="Sum" value={row.sumAssured} onChange={(e) => updatePolicyRow(index, 'sumAssured', e.target.value)} disabled={readOnly} />
                    <input type="date" className="form-control" value={row.commencementDate} onChange={(e) => updatePolicyRow(index, 'commencementDate', e.target.value)} disabled={readOnly} />
                    {!readOnly && <button type="button" onClick={() => removePolicyRow(index)} style={{ color: 'red', border: 'none', background: 'none' }}><Trash size={18} /></button>}
                </div>
            ))}
            {!readOnly && <button type="button" onClick={addPolicyRow} className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)' }}><Plus size={16} /> Add Policy</button>}
        </div>
    );
    const renderStep7_Bank = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Account No</label><input name="accountNumber" className="form-control" value={formData.accountNumber} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">IFSC</label><input name="ifscCode" className="form-control" value={formData.ifscCode} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Bank Name</label><input name="bankName" className="form-control" value={formData.bankName} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Type</label><select name="accountType" className="form-control" value={formData.accountType} onChange={handleChange} disabled={readOnly}><option>Savings</option><option>Current</option></select></div>
        </div>
    );
    const renderStep8_Medical = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Height (cm)</label><input type="number" name="height" className="form-control" value={formData.height} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Weight (kg)</label><input type="number" name="weight" className="form-control" value={formData.weight} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">ID Mark</label><input name="identificationMark" className="form-control" value={formData.identificationMark} onChange={handleChange} disabled={readOnly} /></div>
            <div className="form-group"><label className="form-label">Illness History</label><select name="historyOfIllness" className="form-control" value={formData.historyOfIllness} onChange={handleChange} disabled={readOnly}><option>No</option><option>Yes</option></select></div>
            {formData.historyOfIllness === 'Yes' && (<div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Details</label><textarea className="form-control" name="detailsOfIllness" value={formData.detailsOfIllness} onChange={handleChange} disabled={readOnly}></textarea></div>)}
        </div>
    );
    const renderStep9_Documents = () => (
        <div>
            {isScanning ? (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '640px', background: 'black', borderRadius: '12px', overflow: 'hidden' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }}></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        <div style={{ position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                            <button onClick={stopCamera} className="btn" style={{ background: '#ef4444', color: 'white' }}>Cancel</button>
                            <button onClick={captureImage} className="btn" style={{ background: 'white', borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}><div style={{ width: '52px', height: '52px', borderRadius: '50%', border: '4px solid black', margin: 'auto' }}></div></button>
                        </div>
                    </div>
                </div>
            ) : (
                !readOnly && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div onClick={() => document.getElementById('file-upload').click()} style={{ border: '2px dashed var(--primary)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(56,189,248,0.05)' }}>
                            <Upload size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} /><h4>Upload</h4><input id="file-upload" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>
                        <div onClick={startCamera} style={{ border: '2px dashed var(--accent)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(245,158,11,0.05)' }}>
                            <Camera size={32} color="var(--accent)" style={{ marginBottom: '1rem' }} /><h4>Scan</h4>
                        </div>
                    </div>
                )
            )}
            {formData.documents.length > 0 ? (
                <div style={{ display: 'grid', rowGap: '0.5rem' }}>
                    {formData.documents.map((doc, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-space)', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><FileText size={20} color="var(--primary)" /><span>{doc.name} <small style={{ color: 'var(--text-muted)' }}>({doc.size})</small></span></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {doc.data && <button onClick={() => setPreviewDoc(doc)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Eye size={18} /></button>}
                                {!readOnly && <button onClick={() => removeDocument(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : readOnly && <p style={{ color: 'var(--text-muted)' }}>No documents attached.</p>}
        </div>
    );

    const renderStep10_Summary = () => (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Check size={48} color="var(--primary)" />
                <h3 style={{ margin: '1rem 0' }}>{readOnly ? 'Application Details' : 'Review Application'}</h3>
                {!readOnly && <p style={{ color: 'var(--text-muted)' }}>Please review all details comprehensively before submission.</p>}
            </div>

            <SummarySection title="1. Personal Details" stepId={1}>
                <DetailRow label="Full Name" value={`${formData.firstName} ${formData.lastName}`} />
                <DetailRow label="DOB" value={formData.dob} />
                <DetailRow label="Gender" value={formData.gender} />
                <DetailRow label="Marital Status" value={formData.maritalStatus} />
            </SummarySection>

            <SummarySection title="2. Edu & Occ" stepId={2}>
                <DetailRow label="Education" value={formData.education} />
                <DetailRow label="Occupation" value={formData.occupation} />
                <DetailRow label="Income" value={formData.annualIncome} />
            </SummarySection>

            <SummarySection title="3. Address & Contact" stepId={3}>
                <DetailRow label="Address" value={`${formData.addressLine1}, ${formData.addressLine2}`} />
                <DetailRow label="City / State" value={`${formData.city}, ${formData.state} - ${formData.pincode}`} />
                <DetailRow label="Mobile" value={formData.phone} />
                <DetailRow label="Email" value={formData.email} />
            </SummarySection>

            <SummarySection title="4. Family History" stepId={4}>
                {formData.familyHistory.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '0.9rem', marginBottom: '0.5rem', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}><th>Member</th><th>Status</th><th>Age</th></tr></thead>
                        <tbody>
                            {formData.familyHistory.map((f, i) => (
                                <tr key={i}><td style={{ padding: '4px 0' }}>{f.member}</td><td>{f.status}</td><td>{f.age}</td></tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No family history added.</p>}
            </SummarySection>

            <SummarySection title="5. Nominee Details" stepId={5}>
                <DetailRow label="Nominee" value={formData.nomineeName} />
                <DetailRow label="Relationship" value={formData.nomineeRelation} />
                <DetailRow label="DOB" value={formData.nomineeDob} />
                <DetailRow label="Share" value={`${formData.nomineeShare}%`} />
                {isNomineeMinor && <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: '4px' }}>
                    <small style={{ color: 'var(--accent)' }}><strong>Appointee:</strong> {formData.appointeeName} ({formData.appointeeRelation})</small>
                </div>}
            </SummarySection>

            <SummarySection title="6. Previous Policies" stepId={6}>
                {formData.previousPolicies.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {formData.previousPolicies.map((p, i) => (
                            <div key={i} style={{ fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <strong>{p.policyNo}</strong> - {p.tableTerm} | SA: {p.sumAssured}
                            </div>
                        ))}
                    </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No previous policies.</p>}
            </SummarySection>

            <SummarySection title="7. Bank Details" stepId={7}>
                <DetailRow label="Bank" value={formData.bankName} />
                <DetailRow label="Account" value={formData.accountNumber} />
                <DetailRow label="IFSC" value={formData.ifscCode} />
            </SummarySection>

            <SummarySection title="8. Medical" stepId={8}>
                <DetailRow label="Height/Weight" value={`${formData.height} cm / ${formData.weight} kg`} />
                <DetailRow label="ID Mark" value={formData.identificationMark} />
                <DetailRow label="History" value={formData.historyOfIllness} />
                {formData.historyOfIllness === 'Yes' && <DetailRow label="Details" value={formData.detailsOfIllness} />}
            </SummarySection>

            <SummarySection title="9. Documents" stepId={9}>
                {formData.documents.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                        {formData.documents.map((d, i) => (
                            <div key={i} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                                <FileText size={16} color="var(--primary)" style={{ marginBottom: '4px' }} />
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                                {d.url ? (
                                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: '4px', display: 'inline-block', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                                        <Eye size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> View
                                    </a>
                                ) : (
                                    d.data && <button type="button" onClick={() => setPreviewDoc(d)} style={{ marginTop: '4px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Eye size={12} /> View</button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No documents attached.</p>}
            </SummarySection>

            {!readOnly && (
                <div style={{ padding: '1rem', background: 'rgba(56,189,248,0.1)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                        <input type="checkbox" required id="declaration" style={{ marginTop: '4px' }} />
                        <label htmlFor="declaration" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                            I hereby declare that the values entered above are correct to the best of my knowledge and belief. I understand that providing false information may result in policy rejection.
                        </label>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="container">
            {previewDoc && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <button onClick={() => setPreviewDoc(null)} style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={32} /></button>
                        {previewDoc.url ? (
                            <iframe src={previewDoc.url} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}></iframe>
                        ) : (
                            previewDoc.type.startsWith('image/') ? <img src={previewDoc.data} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }} /> : <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}><p style={{ color: 'black' }}>Preview unavailable</p></div>
                        )}
                    </div>
                </div>
            )}

            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Stepper Header - ONLY show if NOT readOnly */}
                {!readOnly && (
                    <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '10px', marginBottom: '2rem', gap: '0.5rem' }}>
                        {STEPS.map(s => (
                            <div key={s.id} style={{ minWidth: '60px', opacity: step === s.id ? 1 : step > s.id ? 0.8 : 0.4, textAlign: 'center' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= s.id ? 'var(--primary)' : 'var(--bg-space)', border: '1px solid var(--border)', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>{step > s.id ? <Check size={12} /> : s.id}</div>
                                <div style={{ fontSize: '0.65rem' }}>{s.title}</div>
                            </div>
                        ))}
                    </div>
                )}
                {!readOnly && <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>{STEPS[step - 1].title} {step < 10 ? 'Details' : ''}</h2>}
                {readOnly && <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>Application ID: {formData.firstName} {formData.lastName}</h2>}

                <form onSubmit={handleSubmit}>
                    {/* If readOnly, we normally just show Step 9 (Summary), but let's follow step logic just in case */}
                    {step === 1 && renderStep1_Personal()}
                    {step === 2 && renderStep2_EduOcc()}
                    {step === 3 && renderStep3_Address()}
                    {step === 4 && renderStep4_Family()}
                    {step === 5 && renderStep5_Nominee()}
                    {step === 6 && renderStep6_PreviousPolicies()}
                    {step === 7 && renderStep7_Bank()}
                    {step === 8 && renderStep8_Medical()}
                    {step === 9 && renderStep9_Documents()}
                    {step === 10 && renderStep10_Summary()}

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        {readOnly ? (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ padding: '0.75rem 2rem', background: 'var(--bg-space)', border: '1px solid var(--border)' }}>Close View</button>
                                <button type="button" className="btn btn-primary" onClick={onEdit} style={{ padding: '0.75rem 2rem' }}><Edit2 size={16} style={{ marginRight: '8px' }} /> Edit Application</button>
                            </div>
                        ) : (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    {step === 1 ? <button type="button" className="btn" onClick={onCancel} style={{ color: 'var(--text-muted)' }} disabled={isSaving}>Cancel</button> : <button type="button" className="btn" onClick={prevStep} style={{ background: 'var(--bg-space)', border: '1px solid var(--border)' }} disabled={isSaving}>Back</button>}
                                    <button type="button" className="btn" onClick={handleSaveDraft} style={{ marginLeft: '1rem', background: 'none', color: 'var(--primary)', border: '1px solid var(--primary)' }} disabled={isSaving}>{isSaving ? 'Saving...' : 'Draft'}</button>
                                </div>
                                {step < 10 ? <button type="button" className="btn btn-primary" onClick={nextStep}>Next &rarr;</button> : <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }} disabled={isSaving}>{isSaving ? 'Submitting...' : 'Submit'}</button>}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

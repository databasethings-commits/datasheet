import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'policy-documents';

// Fetch policies by status
export const getPolicies = async (type = 'SUBMITTED') => {
    try {
        const { data, error } = await supabase
            .from('policies')
            .select('*, policy_shares(count)')
            .eq('status', type)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map back to our app structure
        return data.map(row => ({
            ...row.form_data, // Spread the JSON form data
            id: row.id,       // Use UUID from DB
            lastModified: row.updated_at,
            status: row.status,
            ownerId: row.user_id,
            sharedCount: row.policy_shares && row.policy_shares[0] ? row.policy_shares[0].count : 0
        }));
    } catch (err) {
        console.error('Error fetching policies:', err);
        return [];
    }
};

export const getPolicyById = async (policyId) => {
    try {
        const { data, error } = await supabase
            .from('policies')
            .select('*')
            .eq('id', policyId)
            .single();

        if (error) throw error;
        return {
            ...data.form_data,
            id: data.id,
            lastModified: data.updated_at,
            status: data.status,
            ownerId: data.user_id
        };
    } catch (err) {
        console.error('Error fetching policy:', err);
        return null;
    }
};

// Save a policy (Insert or Update)
export const savePolicy = async (policyData, isDraft = false) => {
    try {
        const status = isDraft ? 'DRAFT' : 'SUBMITTED';
        // Cleanup: Remove ID and ownerId from the JSON blob we are about to save
        // ownerId is a helper property we added during fetch, don't save it back to JSON
        const { id, ownerId, ...formData } = policyData;

        // Prepare payload
        const payload = {
            status,
            form_data: formData,
            updated_at: new Date().toISOString()
        };

        // If it's a valid UUID, include it to Upsert (Update or Insert if missing)
        // This ensures if a record was accidentally deleted but the user still has it open, 
        // it gets re-created and assigned to them (via default user_id).
        if (id && id.length > 20) {
            payload.id = id;
        }

        const { data, error } = await supabase
            .from('policies')
            .upsert([payload])
            .select()
            .single();

        if (error) throw error;

        return {
            ...data.form_data,
            id: data.id,
            status: data.status,
            ownerId: data.user_id
        };
    } catch (err) {
        console.error('Error saving policy:', err);
        throw err;
    }
};

export const deletePolicy = async (id, isDraft = false) => {
    try {
        const { error } = await supabase
            .from('policies')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error('Error deleting policy:', err);
    }
};

export const getNotifications = async () => {
    try {
        // Since we filter by email in RLS, this returns only user's notifications
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Fetch notifications error:", err);
        return [];
    }
};

export const markNotificationRead = async (id) => {
    try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) { console.error(err); }
};

export const sharePolicy = async (policyId, emailInput) => {
    const email = emailInput.toLowerCase().trim();
    try {
        const { error } = await supabase
            .from('policy_shares')
            .insert([{ policy_id: policyId, shared_with_email: email }]);

        if (error) {
            if (error.code === '23505') throw new Error('Already shared with this user');
            throw error;
        }

        // Send Notification
        const { data: { user } } = await supabase.auth.getUser();
        const sender = user.email;

        await supabase.from('notifications').insert([{
            recipient_email: email,
            message: `New: ${sender} shared a policy with you.`,
            policy_id: policyId
        }]);

        return true;
    } catch (err) {
        console.error('Error sharing policy:', err);
        throw err;
    }
};

export const getPolicyShares = async (policyId) => {
    try {
        const { data, error } = await supabase
            .from('policy_shares')
            .select('shared_with_email')
            .eq('policy_id', policyId);
        if (error) throw error;
        return data.map(r => r.shared_with_email);
    } catch (err) {
        console.error('Error fetching shares:', err);
        return [];
    }
};

export const removePolicyShare = async (policyId, email) => {
    try {
        const { error } = await supabase
            .from('policy_shares')
            .delete()
            .eq('policy_id', policyId)
            .eq('shared_with_email', email);

        if (error) throw error;
    } catch (err) {
        console.error('Error removing share:', err);
        throw err;
    }
};

export const getCounts = async () => {
    try {
        // We can optimize this with count queries if needed
        const { count: submittedCount } = await supabase
            .from('policies')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'SUBMITTED');

        const { count: draftsCount } = await supabase
            .from('policies')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DRAFT');

        return {
            submitted: submittedCount || 0,
            drafts: draftsCount || 0
        };
    } catch (err) {
        console.error('Error getting counts:', err);
        return { submitted: 0, drafts: 0 };
    }
};

export const uploadFile = async (file, folderName = '') => {
    try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Construct path: folder/timestamp_filename or timestamp_filename
        const fileName = folderName
            ? `${folderName}/${timestamp}_${safeName}`
            : `${timestamp}_${safeName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err) {
        console.error('Error uploading file:', err);
        throw err;
    }
};

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'policy-documents';

// Fetch policies by status
export const getPolicies = async (type = 'SUBMITTED') => {
    try {
        const { data, error } = await supabase
            .from('policies')
            .select('*')
            .eq('status', type)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map back to our app structure (unwrapping formData)
        return data.map(row => ({
            ...row.form_data, // Spread the JSON form data
            id: row.id,       // Use UUID from DB
            lastModified: row.updated_at,
            status: row.status
        }));
    } catch (err) {
        console.error('Error fetching policies:', err);
        return [];
    }
};

// Save a policy (Insert or Update)
export const savePolicy = async (policyData, isDraft = false) => {
    try {
        const status = isDraft ? 'DRAFT' : 'SUBMITTED';
        const { id, ...formData } = policyData;

        const payload = {
            status,
            form_data: formData,
            updated_at: new Date().toISOString()
        };

        let result;

        // If it looks like a UUID (we got it from DB), update it. 
        // Note: New offline drafts might assume numeric ID, but with DB we rely on its UUIDs.
        // For new items, we insert.
        if (id && id.length > 20) { // Simple check for UUID vs timestamp ID
            const { data, error } = await supabase
                .from('policies')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // New entry
            const { data, error } = await supabase
                .from('policies')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return {
            ...result.form_data,
            id: result.id,
            status: result.status
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

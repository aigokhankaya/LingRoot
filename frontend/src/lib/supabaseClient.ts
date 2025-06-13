import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to get user role (example - adjust based on your DB structure)
// Assumes you have a 'profiles' table with 'id' (matching auth.users.id) and 'role' columns
export const getUserRole = async (userId: string): Promise<string | null> => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('users') // Changed from 'profiles' to 'users'
            .select('role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user role:', error.message);
            // Handle specific errors like user not found if needed
            if (error.code === 'PGRST116') { // PostgREST error code for 'Exactly one row expected, but 0 rows found'
                console.warn(`No profile found for user ID: ${userId}`);
                return null;
            }
            return null;
        }

        return data?.role || null;
    } catch (err) {
        console.error('Unexpected error fetching user role:', err);
        return null;
    }
};


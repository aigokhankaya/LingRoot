
'use client';

import { useEffect, useState } from 'react';
import { supabase, getUserRole } from '@/lib/supabaseClient'; // Import getUserRole
import { useRouter } from 'next/navigation';
import { logAdminAction } from '@/lib/logging'; // Import logging function

// Define Content type based on requirements
interface ContentItem { // TODO: Refine based on actual table structure (content_history or requests)
    id: string; // Assuming there's an ID
    user_id: string;
    inputType: string; // text, youtube, spotify, file
    level: string; // A1-C2
    created_at: string;
    mp3_url: string | null;
    vtt_url: string | null;
    status: 'processing' | 'completed' | 'failed';
}

export default function ContentManagementPage() {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'failed'>('all');
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // State for current admin role
    const router = useRouter();

    useEffect(() => {
        const checkRoleAndFetchContent = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Check session and get user role
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session?.user) {
                    throw new Error('Not authenticated');
                }
                const role = await getUserRole(session.user.id);
                setCurrentUserRole(role);

                // 2. Enforce page access based on role
                if (role !== 'super_admin' && role !== 'support_admin') { // Allow both admin types to view content
                    console.warn(`Access Denied: User ${session.user.email} with role '${role}' tried to access content management page.`);
                    throw new Error('Access Denied');
                }

                // 3. Fetch content (if authorized)
                // TODO: Implement actual data fetching from a secure backend endpoint or Supabase function
                // This endpoint MUST verify the caller is an admin.
                console.log("Fetching content (placeholder)... Role:", role, "Filter:", filterStatus);

                // Placeholder Data:
                const placeholderContent: ContentItem[] = [
                    {
                        id: 'c1', user_id: 'uuid-1', inputType: 'text', level: 'B1', status: 'completed',
                        created_at: new Date().toISOString(), mp3_url: 'http://example.com/audio1.mp3', vtt_url: 'http://example.com/caption1.vtt'
                    },
                    {
                        id: 'c2', user_id: 'uuid-2', inputType: 'youtube', level: 'A2', status: 'failed',
                        created_at: new Date(Date.now() - 3600000).toISOString(), mp3_url: null, vtt_url: null
                    },
                    {
                        id: 'c3', user_id: 'uuid-1', inputType: 'file', level: 'C1', status: 'processing',
                        created_at: new Date(Date.now() - 7200000).toISOString(), mp3_url: null, vtt_url: null
                    },
                     {
                        id: 'c4', user_id: 'uuid-3', inputType: 'spotify', level: 'B2', status: 'completed',
                        created_at: new Date(Date.now() - 86400000).toISOString(), mp3_url: 'http://example.com/audio4.mp3', vtt_url: 'http://example.com/caption4.vtt'
                    },
                ];
                await new Promise(res => setTimeout(res, 500)); // Simulate fetch delay

                const filteredContent = filterStatus === 'failed'
                    ? placeholderContent.filter(item => item.status === 'failed')
                    : placeholderContent;

                setContentItems(filteredContent);

            } catch (err: any) {
                console.error("Error in ContentManagementPage useEffect:", err);
                setError(err.message || "Failed to load content data.");
                 if (err.message === 'Not authenticated' || err.message === 'Access Denied') {
                    router.push('/admin/login'); // Redirect unauthorized users
                }
            } finally {
                setLoading(false);
            }
        };

        checkRoleAndFetchContent();
    }, [filterStatus, router]); // Refetch when filter changes or router changes

    const handleDeleteContent = async (contentId: string) => {
        // **RBAC Check 1: Function Level**
        if (currentUserRole !== 'super_admin' && currentUserRole !== 'support_admin') {
            alert('Permission Denied: You do not have permission to delete content.');
            return;
        }

        const contentItem = contentItems.find(item => item.id === contentId);
        if (confirm(`Are you sure you want to delete content item ${contentId}?`)) {
            console.log(`TODO: Call Supabase function or API endpoint to delete content ${contentId}`);
            // **RBAC Check 2: Backend/Function Level (CRITICAL)** - Backend must verify caller is an admin
            try {
                // Simulate API call
                await new Promise(res => setTimeout(res, 500));

                // Log the action
                await logAdminAction('Deleted Content', {
                    targetType: 'content',
                    targetId: contentId,
                    details: { userId: contentItem?.user_id, inputType: contentItem?.inputType, level: contentItem?.level }
                });

                // Update UI (assuming success)
                setContentItems(contentItems.filter(item => item.id !== contentId));
                alert(`Simulated: Content item ${contentId} deleted. Action logged.`);

            } catch (err: any) {
                console.error("Delete Content Error:", err);
                alert(`Failed to delete content: ${err.message}`);
            }
        }
    };

    const handleRegenerateContent = async (contentId: string) => {
        // **RBAC Check 1: Function Level**
        if (currentUserRole !== 'super_admin' && currentUserRole !== 'support_admin') {
            alert('Permission Denied: You do not have permission to regenerate content.');
            return;
        }

        const contentItem = contentItems.find(item => item.id === contentId);
        console.log(`TODO: Call backend endpoint to trigger regeneration process for content item ${contentId}`);
        // **RBAC Check 2: Backend/Function Level (CRITICAL)** - Backend must verify caller is an admin
        try {
            // Simulate API call
            await new Promise(res => setTimeout(res, 1000));

            // Log the action
            await logAdminAction('Regenerated Content', {
                targetType: 'content',
                targetId: contentId,
                details: { userId: contentItem?.user_id, inputType: contentItem?.inputType, level: contentItem?.level }
            });

            // Update UI (optional - maybe change status back to 'processing')
            setContentItems(contentItems.map(item => item.id === contentId ? { ...item, status: 'processing' } : item));
            alert(`Simulated: Regeneration triggered for content item ${contentId}. Action logged.`);

        } catch (err: any) {
            console.error("Regenerate Content Error:", err);
            alert(`Failed to trigger regeneration: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                {/* Adjusted padding */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    {/* Responsive header */}
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 text-center sm:text-left">Content Management</h1>
                    <a href="/admin/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Back to Dashboard</a>
                </div>

                {/* Filter Controls - Responsive */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status:</label>
                    <select
                        id="statusFilter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'failed')}
                        className="border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full sm:w-auto"
                    >
                        <option value="all">All</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                {loading && <div className="text-center py-4">Loading content...</div>}
                {error && <div className="text-center py-4 text-red-500">Error: {error}</div>}

                {!loading && !error && (
                    <div className="overflow-x-auto">
                        {/* Added overflow-x-auto for horizontal scrolling */}
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {/* Responsive Columns */}
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">User ID</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Level</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">Created At</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">MP3</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">VTT</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {contentItems.map((item) => (
                                    <tr key={item.id}>
                                        {/* Responsive Columns */}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell truncate max-w-[100px]">{item.user_id}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.inputType}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">{item.level}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">{new Date(item.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : item.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                                            {item.mp3_url ? (
                                                <a href={item.mp3_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">Link</a>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                                            {item.vtt_url ? (
                                                <a href={item.vtt_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">Link</a>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            {/* Responsive Actions Layout */}
                                            {(currentUserRole === 'super_admin' || currentUserRole === 'support_admin') && (
                                                <div className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2">
                                                    {item.status === 'failed' && (
                                                        <button onClick={() => handleRegenerateContent(item.id)} className="text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/80 text-left md:text-center">Regenerate</button>
                                                    )}
                                                    <button onClick={() => handleDeleteContent(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 text-left md:text-center">Delete</button>
                                                </div>
                                            )}
                                            {!(currentUserRole === 'super_admin' || currentUserRole === 'support_admin') && <span className="text-gray-400">--</span>}
                                        </td>
                                    </tr>
                                ))}
                                {contentItems.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No content items found{filterStatus !== 'all' ? ` with status '${filterStatus}'` : ''}.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}


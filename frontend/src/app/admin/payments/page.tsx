
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is set up
import { useRouter } from 'next/navigation';

// Define Payment type based on requirements
interface PaymentItem { // TODO: Refine based on actual 'payments' table structure
    id: string; // Assuming a payment ID
    user_id: string;
    plan: string; // e.g., 'pro', 'free'
    amount: number;
    paidAt: string; // ISO string date
    invoice_url: string | null;
    // For mismatch check, we might need user's current plan from profiles table
    user_current_plan?: string | null;
}

export default function PaymentManagementPage() {
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMismatches, setShowMismatches] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            setError(null);
            try {
                // TODO: Implement actual data fetching from a secure backend endpoint or Supabase function
                // This needs to query the 'payments' table and potentially join with 'profiles' or 'users'
                // to get the user's current plan for mismatch detection.
                // Example query (needs adjustment, security, and potentially a DB function/view):
                /*
                const { data, error: fetchError } = await supabase
                    .from('payments')
                    .select(`
                        *,
                        profile:profiles ( plan )
                    `)
                    .order('paidAt', { ascending: false });
                if (fetchError) throw fetchError;
                // Process data to match PaymentItem structure, including user_current_plan
                const processedData = data?.map(p => ({ ...p, user_current_plan: p.profile?.plan })) || [];
                setPayments(processedData);
                */

                // Placeholder Data:
                const placeholderPayments: PaymentItem[] = [
                    {
                        id: 'pay_1', user_id: 'uuid-2', plan: 'pro', amount: 10.00, paidAt: new Date(Date.now() - 86400000).toISOString(),
                        invoice_url: 'http://example.com/invoice1.pdf', user_current_plan: 'pro'
                    },
                    {
                        id: 'pay_2', user_id: 'uuid-4', plan: 'pro', amount: 10.00, paidAt: new Date(Date.now() - 172800000).toISOString(),
                        invoice_url: 'http://example.com/invoice2.pdf', user_current_plan: 'free' // Mismatch!
                    },
                    {
                        id: 'pay_3', user_id: 'uuid-1', plan: 'free', amount: 0.00, paidAt: new Date(Date.now() - 259200000).toISOString(),
                        invoice_url: null, user_current_plan: 'free'
                    },
                     {
                        id: 'pay_4', user_id: 'uuid-5', plan: 'pro', amount: 99.00, paidAt: new Date(Date.now() - 345600000).toISOString(),
                        invoice_url: 'http://example.com/invoice4.pdf', user_current_plan: 'pro'
                    },
                ];
                await new Promise(res => setTimeout(res, 500)); // Simulate fetch delay

                setPayments(placeholderPayments);

            } catch (err: any) {
                console.error("Error fetching payment items:", err);
                setError(err.message || "Failed to load payment data.");
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, []); // Fetch on initial load

    const filteredPayments = showMismatches
        ? payments.filter(p => p.plan === 'pro' && p.amount > 0 && p.user_current_plan === 'free')
        : payments;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Payment & Subscription Tracking</h1>
                    <a href="/admin/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Back to Dashboard</a>
                </div>

                {/* Filter Controls */}
                <div className="mb-4 flex items-center">
                    <input
                        type="checkbox"
                        id="mismatchFilter"
                        checked={showMismatches}
                        onChange={(e) => setShowMismatches(e.target.checked)}
                        className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="mismatchFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Show only users who paid for Pro but have Free plan
                    </label>
                </div>

                {loading && <div className="text-center py-4">Loading payments...</div>}
                {error && <div className="text-center py-4 text-red-500">Error: {error}</div>}

                {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paid Plan</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Plan</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paid At</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPayments.map((item) => (
                                    <tr key={item.id} className={`${item.plan === 'pro' && item.amount > 0 && item.user_current_plan === 'free' ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.user_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.plan === 'pro' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                                {item.plan}
                                            </span>
                                        </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.user_current_plan === 'pro' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                                {item.user_current_plan || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${item.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(item.paidAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {item.invoice_url ? (
                                                <a href={item.invoice_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">View Invoice</a>
                                            ) : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {filteredPayments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            {showMismatches ? 'No payment mismatches found.' : 'No payment records found.'}
                                        </td>
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


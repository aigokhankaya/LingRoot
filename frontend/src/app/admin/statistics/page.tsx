
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is set up
import { useRouter } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

// Define data structures for charts (using placeholder data)
interface DailyContentData {
    date: string;
    count: number;
}

interface LevelDistributionData {
    name: string;
    value: number;
}

interface InputTypeData {
    name: string;
    value: number;
}

interface PlanSegmentData {
    name: string;
    count: number;
}

// Placeholder Data Generation
const generatePlaceholderDailyContent = (): DailyContentData[] => {
    const data: DailyContentData[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        data.push({
            date: date.toLocaleDateString('en-CA'), // YYYY-MM-DD format
            count: Math.floor(Math.random() * 50) + 10 // Random count between 10 and 60
        });
    }
    return data;
};

const placeholderLevelData: LevelDistributionData[] = [
    { name: 'A1', value: 15 },
    { name: 'A2', value: 25 },
    { name: 'B1', value: 40 },
    { name: 'B2', value: 30 },
    { name: 'C1', value: 10 },
    { name: 'C2', value: 5 },
];

const placeholderInputTypeData: InputTypeData[] = [
    { name: 'Text', value: 60 },
    { name: 'YouTube', value: 20 },
    { name: 'Spotify', value: 15 },
    { name: 'File', value: 5 },
];

const placeholderPlanData: PlanSegmentData[] = [
    { name: 'Free', count: 80 },
    { name: 'Pro', count: 20 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function StatisticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dailyContent, setDailyContent] = useState<DailyContentData[]>([]);
    const [levelDistribution, setLevelDistribution] = useState<LevelDistributionData[]>([]);
    const [inputTypeDistribution, setInputTypeDistribution] = useState<InputTypeData[]>([]);
    const [planSegmentation, setPlanSegmentation] = useState<PlanSegmentData[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // TODO: Implement actual data fetching from secure backend/Supabase functions
                // Aggregate data from relevant tables (content_history/requests, profiles/users)

                // Using placeholder data for now
                await new Promise(res => setTimeout(res, 500)); // Simulate fetch delay
                setDailyContent(generatePlaceholderDailyContent());
                setLevelDistribution(placeholderLevelData);
                setInputTypeDistribution(placeholderInputTypeData);
                setPlanSegmentation(placeholderPlanData);

            } catch (err: any) {
                console.error("Error fetching statistics:", err);
                setError(err.message || "Failed to load statistics data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Usage Statistics</h1>
                    <a href="/admin/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Back to Dashboard</a>
                </div>

                {loading && <div className="text-center py-10">Loading statistics...</div>}
                {error && <div className="text-center py-10 text-red-500">Error: {error}</div>}

                {!loading && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Daily Content Production Chart */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Daily Content Production (Last 7 Days)</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={dailyContent}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="date" stroke="#999" />
                                    <YAxis stroke="#999" />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#eee' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="count" name="Content Items" stroke="#8884d8" activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Level Distribution Chart */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Content Level Distribution</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={levelDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {levelDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#eee' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Input Type Distribution Chart */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Input Type Distribution</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={inputTypeDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#999" />
                                    <YAxis stroke="#999" />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#eee' }} />
                                    <Bar dataKey="value" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Plan Segmentation */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">User Plan Segmentation</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={planSegmentation} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis type="number" stroke="#999" />
                                    <YAxis type="category" dataKey="name" stroke="#999" width={60} />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#eee' }} />
                                    <Bar dataKey="count" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


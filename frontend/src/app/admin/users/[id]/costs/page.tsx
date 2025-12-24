
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ApiCostDashboard from '@/components/admin/ApiCostDashboard';

export default function UserCostsPage() {
    const params = useParams<{ id: string }>();
    const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setToken(localStorage.getItem('lingroot_token'));
        }
    }, []);

    if (!userId) return <div>Yükleniyor...</div>;

    return (
        <div>
            <h1 className="text-xl font-semibold mb-6">Maliyet Geçmişi</h1>
            <ApiCostDashboard token={token} userId={userId} />
        </div>
    );
}

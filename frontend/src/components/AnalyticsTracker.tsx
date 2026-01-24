'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { AnalyticsHelper } from '@/utils/AnalyticsHelper';

function AnalyticsTrackerContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname) {
            // Construct full URL path
            const queryString = searchParams?.toString();
            const url = queryString ? `${pathname}?${queryString}` : pathname;

            // Log page view event manually for SPA navigation
            // Firebase Analytics 'page_view' otomatik toplanabilir ama Next.js App Router
            // geçişlerinde manuel tetiklemek daha garantidir.
            AnalyticsHelper.logEvent('page_view', {
                page_path: url,
                page_location: typeof window !== 'undefined' ? window.location.href : url,
                page_title: typeof document !== 'undefined' ? document.title : pathname
            });

            // Alternatif olarak screen_view de kullanılabilir
            AnalyticsHelper.logScreenView(pathname, 'Web_Page');
        }
    }, [pathname, searchParams]);

    return null;
}

export const AnalyticsTracker = () => {
    return (
        <Suspense fallback={null}>
            <AnalyticsTrackerContent />
        </Suspense>
    );
};

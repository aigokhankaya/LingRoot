import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '../lib/i18n';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Cookie, Shield, BarChart3, Megaphone, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CookiePreferences {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    timestamp?: string;
}

export const CookieConsent: React.FC = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Default preferences
    const [prefs, setPrefs] = useState<CookiePreferences>({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: true
    });

    useEffect(() => {
        // Safe check for localStorage
        const stored = localStorage.getItem('lingroot_cookie_consent');
        if (!stored) {
            setIsVisible(true);
        } else {
            // Check if it's the old format (string 'true') or new object
            try {
                const parsed = JSON.parse(stored);
                if (parsed === true || parsed === 'true') {
                    // Old format found, show banner to get granular consent
                    setIsVisible(true);
                } else if (parsed && typeof parsed === 'object') {
                    // Valid object found, load it
                    setPrefs(parsed as CookiePreferences);
                }
            } catch (e) {
                // If parse fails (maybe it was a raw string "true"), show banner
                setIsVisible(true);
            }
        }

        const handleOpenSettings = () => setShowSettings(true);
        window.addEventListener('open-cookie-settings', handleOpenSettings);
        return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
    }, []);

    const saveConsent = (newPrefs: CookiePreferences) => {
        const consentData = {
            ...newPrefs,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('lingroot_cookie_consent', JSON.stringify(consentData));
        setPrefs(newPrefs);

        // Analytics Consent Logic
        if (newPrefs.analytics) {
            // Eğer analitik izni verildiyse sayfayı yenilemeden GA'yı aktif etmek için
            // window.location.reload() yapılabilir veya gtag consent update gönderilebilir.
            // Şimdilik _app.tsx'teki useEffect bu değişikliği algılamayacağı için
            // en temiz yöntem sayfayı yenilemek veya event fırlatmak olabilir.
            window.dispatchEvent(new Event('cookie-consent-updated'));
        }

        setIsVisible(false);
        setShowSettings(false);
    };

    const handleAcceptAll = () => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
            preferences: true
        });
    };

    const handleRejectAll = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
            preferences: false
        });
    };

    const handleSavePreferences = () => {
        saveConsent(prefs);
    };

    // Helper to handle switch changes
    const handleSwitchChange = (key: keyof CookiePreferences, e: React.ChangeEvent<HTMLInputElement>) => {
        setPrefs(prev => ({ ...prev, [key]: e.target.checked }));
    };

    // Prevent rendering on server to avoid hydration mismatch regarding localStorage
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    if (!isVisible && !showSettings) return null;

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="fixed bottom-4 left-4 right-4 z-[9999] md:left-8 md:right-auto md:max-w-xl"
                    >
                        <div className="bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-6 md:p-8 dark:bg-gray-900/95 dark:border-gray-800 ring-1 ring-black/5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl hidden sm:block shrink-0">
                                    <Cookie className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <span className="sm:hidden"><Cookie className="w-5 h-5 text-primary" /></span>
                                            {t('cookie_title') || 'Çerez Politikası'}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {t('cookie_intro_text1')} {' '}
                                            <Link href="/cookie-policy" className="text-primary hover:underline font-medium decoration-primary/30 underline-offset-4">
                                                {t('cookie_hero_subtitle') || 'Detaylı Bilgi'}
                                            </Link>
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button onClick={handleAcceptAll} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                                            {t('cookie_accept_all')}
                                        </Button>
                                        <div className="flex gap-3 flex-1">
                                            <Button variant="outline" onClick={handleRejectAll} className="flex-1 border-gray-300 dark:border-gray-700">
                                                {t('cookie_reject_all')}
                                            </Button>
                                            <Button variant="ghost" onClick={() => setShowSettings(true)} className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                {t('cookie_customize')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            {t('cookie_modal_title')}
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {t('cookie_intro_text1')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-6">
                        {/* Necessary */}
                        <div className="flex items-start justify-between space-x-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="flex items-start space-x-3">
                                <Shield className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <label className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100">
                                        {t('cookie_cat_necessary')}
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                                        {t('cookie_cat_necessary_desc')}
                                    </p>
                                </div>
                            </div>
                            <Switch checked={true} disabled className="opacity-50" />
                        </div>

                        {/* Analytics */}
                        <div className="flex items-start justify-between space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex items-start space-x-3">
                                <BarChart3 className={`w-5 h-5 mt-0.5 shrink-0 ${prefs.analytics ? 'text-primary' : 'text-gray-400'}`} />
                                <div>
                                    <label className="text-base font-semibold leading-none text-gray-900 dark:text-gray-100">
                                        {t('cookie_cat_analytics')}
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                                        {t('cookie_cat_analytics_desc')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={prefs.analytics}
                                onChange={(e) => handleSwitchChange('analytics', e)}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {/* Marketing */}
                        <div className="flex items-start justify-between space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex items-start space-x-3">
                                <Megaphone className={`w-5 h-5 mt-0.5 shrink-0 ${prefs.marketing ? 'text-primary' : 'text-gray-400'}`} />
                                <div>
                                    <label className="text-base font-semibold leading-none text-gray-900 dark:text-gray-100">
                                        {t('cookie_cat_marketing')}
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                                        {t('cookie_cat_marketing_desc')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={prefs.marketing}
                                onChange={(e) => handleSwitchChange('marketing', e)}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {/* Preferences */}
                        <div className="flex items-start justify-between space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex items-start space-x-3">
                                <Settings className={`w-5 h-5 mt-0.5 shrink-0 ${prefs.preferences ? 'text-primary' : 'text-gray-400'}`} />
                                <div>
                                    <label className="text-base font-semibold leading-none text-gray-900 dark:text-gray-100">
                                        {t('cookie_cat_preferences')}
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                                        {t('cookie_cat_preferences_desc')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={prefs.preferences}
                                onChange={(e) => handleSwitchChange('preferences', e)}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-background pt-2 pb-2 border-t mt-4">
                        <Button variant="outline" onClick={handleRejectAll} className="mr-auto">
                            {t('cookie_reject_all')}
                        </Button>
                        <Button onClick={handleSavePreferences} className="min-w-[140px]">
                            {t('cookie_save_preferences')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

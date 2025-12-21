// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { useAuth } from '../src/lib/auth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation, useLanguage, Locale } from '../src/lib/i18n';

// shadcn/ui ve diğer kütüphane importları
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import '@fortawesome/fontawesome-free/css/all.min.css';

import { resendVerificationEmail } from "../src/lib/api";
import { initializeGoogleAuth, signInWithGoogle } from "../src/lib/googleAuth";

const App: React.FC = () => {

    const { t, currentLocale } = useTranslation();
    const { changeLanguage, supportedLocales } = useLanguage();
    const language = currentLocale;

    // --- YENİ TASARIMDAN GELEN STATE'LER ---
    const [level, setLevel] = useState(1);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false); // Kayıt modalı için yeni state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobil menü state'i

    // --- ESKİ MANTIKTAN ENTEGRE EDİLEN HOOK'LAR VE STATE'LER ---
    const router = useRouter();
    const { login, loginWithGoogle, isAuthenticated, register } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);

    // --- FORM STATE'LERİ (KONTROLLÜ BİLEŞENLER İÇİN) ---
    const [loginForm, setLoginForm] = useState({ email: '', password: '', rememberMe: false });
    const [registerForm, setRegisterForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: ''
    });

    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    // Kullanıcı zaten giriş yapmışsa welcome sayfasına yönlendir.
    useEffect(() => {
        if (isAuthenticated) {
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const params = new URLSearchParams(search);
            const raw = params.get('next') || '';
            const next = raw ? (() => { try { return decodeURIComponent(raw); } catch { return raw; } })() : '';
            const target = next && next.trim() ? next : '/welcome';

            if (typeof window !== 'undefined' && target.includes('#')) {
                window.location.assign(target);
            } else {
                router.replace(target);
            }
        }
    }, [isAuthenticated, router]);

    // Form input değişikliklerini yöneten fonksiyonlar
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setLoginForm({ ...loginForm, [e.target.name]: value });
    };

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // İsim ve Soyisimi ayırmak için özel mantık
        if (e.target.name === 'fullName') {
            const nameParts = e.target.value.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            setRegisterForm({ ...registerForm, firstName, lastName });
        } else {
            setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
        }
    };

    // --- GİRİŞ VE KAYIT FONKSİYONLARI (ESKİ MANTIK İLE YENİ STATE'LER BİRLEŞTİRİLDİ) ---
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setErrorCode(null); // stale state temizliği
        setResendMessage(null);
        try {
            const result = await login(loginForm.email, loginForm.password, loginForm.rememberMe);
            if (result.success) {
                setIsLoginOpen(false); // Başarılı olunca modalı kapat
                const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                const raw = params.get('next') || '';
                const next = raw ? (() => { try { return decodeURIComponent(raw); } catch { return raw; } })() : '';
                const target = next && next.trim() ? next : '/welcome';
                if (typeof window !== 'undefined' && target.includes('#')) {
                    window.location.assign(target);
                } else {
                    router.replace(target);
                }
            } else {
                setError(result.message || t('login_failed_generic'));
                setErrorCode((result as any).code || null);
            }
        } catch (err: any) {
            setError(err.message || t('login_failed_error'));
        } finally {
            setLoading(false);
        }
    };

    // Aktivasyon e-postasını yeniden gönderme
    const handleResendActivation = async () => {
        if (!loginForm.email) {
            setResendMessage(t('login_email_not_verified_message'));
            return;
        }
        setResendLoading(true);
        setResendMessage(null);
        try {
            const res = await resendVerificationEmail(loginForm.email);
            if (res.success) {
                setResendMessage(t('login_resend_activation_success'));
            } else {
                setResendMessage(res.message || t('unknown_error'));
            }
        } catch (e: any) {
            setResendMessage(e.message || t('unknown_error'));
        } finally {
            setResendLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { firstName, lastName, email, phoneNumber, password } = registerForm;
            const result = await register(firstName, lastName, email, phoneNumber, password);
            if (result.success) {
                setIsRegisterOpen(false); // Başarılı olunca modalı kapat
                const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                const next = params.get('next');
                const target = next && next.trim() ? next : '/welcome';
                router.replace(target);
            } else {
                setError(result.message || t('register_failed_generic'));
            }
        } catch (err: any) {
            setError(err.message || t('register_failed_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            // Google Client ID kontrolü
            const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            if (!clientId || clientId === 'your-google-client-id-here.apps.googleusercontent.com') {
                throw new Error('Google Client ID yapılandırılmamış.');
            }

            await initializeGoogleAuth();
            const { credential } = await signInWithGoogle();
            const result = await loginWithGoogle(credential, loginForm.rememberMe);

            if (result.success) {
                setIsLoginOpen(false);
                await new Promise(resolve => setTimeout(resolve, 100));

                const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                const raw = params.get('next') || '';
                const next = raw ? (() => { try { return decodeURIComponent(raw); } catch { return raw; } })() : '';
                const target = next && next.trim() ? next : '/welcome';
                if (typeof window !== 'undefined' && target.includes('#')) {
                    window.location.assign(target);
                } else {
                    router.replace(target);
                }
            } else {
                setError(result.message || t('login_failed_generic'));
            }
        } catch (err: any) {
            console.error('❌ Google login error:', err);
            setError(err.message || t('login_failed_error'));
        } finally {
            setLoading(false);
        }
    };

    // Data arrays reconstructed with translations
    const howItWorksSteps = [
        { icon: "fas fa-link", title: t('landing_how_step1_title'), description: t('landing_how_step1_desc') },
        { icon: "fas fa-sliders-h", title: t('landing_how_step2_title'), description: t('landing_how_step2_desc') },
        { icon: "fas fa-headphones", title: t('landing_how_step3_title'), description: t('landing_how_step3_desc') }
    ];

    const routineActivities = [
        { icon: "fas fa-walking", title: t('landing_routine_act1_title'), description: t('landing_routine_act1_desc') },
        { icon: "fas fa-dumbbell", title: t('landing_routine_act2_title'), description: t('landing_routine_act2_desc') },
        { icon: "fas fa-car", title: t('landing_routine_act3_title'), description: t('landing_routine_act3_desc') },
        { icon: "fas fa-home", title: t('landing_routine_act4_title'), description: t('landing_routine_act4_desc') }
    ];

    const featuresList = [
        { icon: "fas fa-globe", title: t('landing_features_item1_title'), description: t('landing_features_item1_desc') },
        { icon: "fas fa-user-cog", title: t('landing_features_item2_title'), description: t('landing_features_item2_desc') },
        { icon: "fas fa-headphones-alt", title: t('landing_features_item3_title'), description: t('landing_features_item3_desc') },
        { icon: "fas fa-clock", title: t('landing_features_item4_title'), description: t('landing_features_item4_desc') }
    ];

    const testimonialsUsers = [
        { name: "Emre T.", gender: "male", level: t('landing_testimonials_user1_level'), quote: t('landing_testimonials_user1_quote') },
        { name: "Siti R.", gender: "female", level: t('landing_testimonials_user2_level'), quote: t('landing_testimonials_user2_quote') },
        { name: "Omar H.", gender: "male", level: t('landing_testimonials_user3_level'), quote: t('landing_testimonials_user3_quote') }
    ];

    const ctaBenefits = [
        t('landing_cta_benefit1'),
        t('landing_cta_benefit2'),
        t('landing_cta_benefit3')
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="bg-white/90 border-b border-border backdrop-blur-sm py-3 sticky top-0 z-50">
                <div className="container mx-auto px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Image src="/lingroot-icon.svg" alt="LingRoot Logo" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" />
                        <BrandWordmark className="text-xl md:text-2xl" />
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link href="/about" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t('about')}</Link>
                        <Link href="#nasil-calisir" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t('landing_nav_howItWorks')}</Link>
                        <Link href="#ozellikler" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t('landing_nav_features')}</Link>
                        <Link href="#yorumlar" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t('landing_nav_testimonials')}</Link>
                        <Link href="#blog" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t('landing_nav_blog')}</Link>
                    </div>

                    {/* Desktop Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <select
                            value={language}
                            onChange={(e) => changeLanguage(e.target.value as Locale)}
                            className="appearance-none bg-transparent px-3 py-2 text-gray-600 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        >
                            {supportedLocales.map((locale: Locale) => (
                                <option key={locale} value={locale}>
                                    {t(`language_${locale}`)}
                                </option>
                            ))}
                        </select>

                        {/* GİRİŞ YAP MODALI */}
                        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="!rounded-button whitespace-nowrap">{t('landing_nav_login')}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-center mb-2">{t('login')}</DialogTitle>
                                    <DialogDescription className="text-center">{t('login_description')}</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleLoginSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('email')}</Label>
                                        <Input id="email" name="email" type="email" placeholder={t('email')} value={loginForm.email} onChange={handleLoginChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{t('password')}</Label>
                                        <Input id="password" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} required />
                                    </div>

                                    {/* Beni Hatırla Checkbox */}
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="rememberMe"
                                            name="rememberMe"
                                            type="checkbox"
                                            checked={loginForm.rememberMe}
                                            onChange={handleLoginChange}
                                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                        />
                                        <Label htmlFor="rememberMe" className="text-sm font-medium text-gray-700 cursor-pointer">
                                            {t('login_remember_me')}
                                        </Label>
                                    </div>

                                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                                    {errorCode === 'EMAIL_NOT_VERIFIED' && (
                                        <div className="text-center space-y-2">
                                            <p className="text-sm text-gray-700">
                                                {t('login_email_not_verified_message')}
                                            </p>
                                            <div className="flex justify-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="!rounded-button"
                                                    onClick={handleResendActivation}
                                                    disabled={resendLoading}
                                                >
                                                    {resendLoading ? t('login_resend_activation_loading') : t('login_resend_activation_button')}
                                                </Button>
                                            </div>
                                            {resendMessage && (
                                                <p className="text-xs text-gray-600">{resendMessage}</p>
                                            )}
                                        </div>
                                    )}
                                    {/* Şifremi unuttum */}
                                    <div className="flex justify-end">
                                        <Link href="/forgot-password" className="text-sm text-primary hover:underline">{t('login_forgot_password')}</Link>
                                    </div>
                                    <Button type="submit" className="w-full !rounded-button" disabled={loading}>
                                        {loading ? t('login_button_loading') : t('login_button')}
                                    </Button>

                                    {/* Ayırıcı */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-gray-500">{t('login_or')}</span>
                                        </div>
                                    </div>

                                    {/* Google Login Butonu */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full !rounded-button border-gray-300 hover:bg-gray-50"
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                    >
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        {t('login_google_button')}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* KAYIT OL BUTONU */}
                        <Link href="/register">
                            <Button className="!rounded-button whitespace-nowrap">{t('landing_nav_signup')}</Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        <select
                            value={language}
                            onChange={(e) => changeLanguage(e.target.value as Locale)}
                            className="appearance-none bg-transparent px-2 py-1 text-gray-600 border border-gray-200 rounded-lg cursor-pointer text-xs"
                        >
                            {supportedLocales.map((locale: Locale) => (
                                <option key={locale} value={locale}>
                                    {locale.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="ghost"
                            className="p-2"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200 mobile-menu">
                        <div className="container mx-auto px-4 py-4 space-y-4">
                            <Link href="/about" className="block text-gray-600 hover:text-primary transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('about')}</Link>
                            <Link href="#nasil-calisir" className="block text-gray-600 hover:text-primary transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('landing_nav_howItWorks')}</Link>
                            <Link href="#ozellikler" className="block text-gray-600 hover:text-primary transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('landing_nav_features')}</Link>
                            <Link href="#yorumlar" className="block text-gray-600 hover:text-primary transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('landing_nav_testimonials')}</Link>
                            <Link href="#blog" className="block text-gray-600 hover:text-primary transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('landing_nav_blog')}</Link>

                            <div className="pt-4 border-t border-gray-200 space-y-3">
                                <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full !rounded-button" onClick={() => setIsMobileMenuOpen(false)}>{t('landing_nav_login')}</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold text-center mb-2">{t('login')}</DialogTitle>
                                            <DialogDescription className="text-center">{t('login_description')}</DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile-email">{t('email')}</Label>
                                                <Input id="mobile-email" name="email" type="email" placeholder={t('email')} value={loginForm.email} onChange={handleLoginChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile-password">{t('password')}</Label>
                                                <Input id="mobile-password" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} required />
                                            </div>

                                            {/* Beni Hatırla Checkbox - Mobile */}
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    id="mobile-rememberMe"
                                                    name="rememberMe"
                                                    type="checkbox"
                                                    checked={loginForm.rememberMe}
                                                    onChange={handleLoginChange}
                                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                                />
                                                <Label htmlFor="mobile-rememberMe" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    {t('login_remember_me')}
                                                </Label>
                                            </div>

                                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                                            <Button type="submit" className="w-full !rounded-button" disabled={loading}>
                                                {loading ? t('login_button_loading') : t('login_button')}
                                            </Button>

                                            {/* Ayırıcı - Mobile */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-gray-300" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-2 text-gray-500">{t('login_or')}</span>
                                                </div>
                                            </div>

                                            {/* Google Login Butonu - Mobile */}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full !rounded-button border-gray-300 hover:bg-gray-50"
                                                onClick={handleGoogleLogin}
                                                disabled={loading}
                                            >
                                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                {t('login_google_button')}
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full !rounded-button">{t('landing_nav_signup')}</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-10 pb-12 min-h-0 h-auto bg-gradient-to-b from-background via-primary/5 to-background">
                <div className="container mx-auto px-8">
                    <div className="text-center">
                        <Badge className="mb-4 bg-primary/10 text-primary border-none text-sm hero-badge">{t('landing_hero_badge')}</Badge>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight hero-title max-w-5xl mx-auto">
                            {t('landing_hero_title')}<span className="text-primary">{t('landing_hero_highlight')}</span>
                        </h1>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 leading-relaxed hero-description max-w-4xl mx-auto">
                            {t('landing_hero_desc')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 hero-buttons justify-center">
                            <Link href="/register">
                                <Button className="text-base py-4 px-6 !rounded-button whitespace-nowrap">
                                    <i className="fas fa-rocket mr-2"></i> {t('landing_hero_button_try')}
                                </Button>
                            </Link>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-2 border-primary text-primary hover:bg-primary/10 text-base py-4 px-6 !rounded-button whitespace-nowrap">
                                        <i className="fas fa-play-circle mr-2"></i> {t('landing_hero_button_watch')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-4xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-bold">{t('landing_how_title')}</DialogTitle>
                                        <DialogDescription>
                                            {t('landing_how_desc')}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                        <iframe
                                            src="https://www.youtube.com/embed/12hT5S9QuLA"
                                            className="absolute inset-0 h-full w-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen>
                                        </iframe>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </section>
            {/* Demo Section - Added before How It Works */}
            <section className="pt-10 pb-20 bg-white">
                <div className="container mx-auto px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900 demo-title">{t('landing_demo_title')}</h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto demo-description" >
                            {t('landing_demo_desc')}
                        </p>
                    </div>
                    <div className="bg-muted rounded-xl shadow-xl overflow-hidden mb-2">
                        <div className="grid md:grid-cols-2 gap-0">
                            <div className="p-8 md:p-12 flex flex-col justify-center">
                                <h3 className="text-2xl font-bold mb-6">{t('landing_demo_select')}</h3>
                                <div className="mb-8">
                                    <div className="flex justify-between mb-4">
                                        {levels.map((lvl, index) => (
                                            <div
                                                key={index}
                                                className={`text-sm font-medium cursor-pointer ${index === level ? 'text-primary' : 'text-gray-500'}`}
                                                onClick={() => setLevel(index)}
                                            >
                                                {lvl}
                                            </div>
                                        ))}
                                    </div>
                                    <Slider
                                        defaultValue={[level]}
                                        max={5}
                                        step={1}
                                        onValueChange={(value) => setLevel(value[0])}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted rounded-lg">
                                        <h4 className="font-bold mb-2">{t('landing_demo_original')}</h4>
                                        <p className="text-gray-700">{t('landing_demo_original_desc') || "Lingroot, favori içeriğinizi İngilizce yeterliliğinize göre özelleştirir ve seslendirir. Bu sayede, becerilerinizi doğal bir şekilde geliştirirken ilginç konularla etkileşime geçebilirsiniz."}</p>
                                    </div>
                                    <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                                        <h4 className="font-bold mb-2">{t('landing_demo_your')} ({levels[level]})</h4>
                                        {level === 0 && <p className="text-gray-700">{t('landing_demo_level0')}</p>}
                                        {level === 1 && <p className="text-gray-700">{t('landing_demo_level1')}</p>}
                                        {level === 2 && <p className="text-gray-700">{t('landing_demo_level2')}</p>}
                                        {level === 3 && <p className="text-gray-700">{t('landing_demo_level3')}</p>}
                                        {level === 4 && <p className="text-gray-700">{t('landing_demo_level4')}</p>}
                                        {level === 5 && <p className="text-gray-700">{t('landing_demo_level5')}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="relative overflow-hidden flex justify-center items-center p-1">
                                <div className="relative aspect-video w-full max-w-2xl">
                                    <iframe
                                        src="https://www.youtube.com/embed/12hT5S9QuLA"
                                        className="absolute inset-0 h-full w-full rounded-lg shadow-lg"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen>
                                    </iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* How It Works Section */}
            <section id="nasil-calisir" className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t('landing_how_title')}</h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto">{t('landing_how_desc')}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {howItWorksSteps.map((step, index) => (
                            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col how-it-works-card">
                                <CardHeader className="pb-0 p-0">
                                    <div className="how-it-works-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'selecting content on their device, with multiple media platforms visible on screen. The scene shows YouTube videos, Spotify podcasts, and news articles. Clean, modern interface with a soft blue background and minimalist design.' : index === 1 ? 'close-up of a language level selector interface showing levels from A1 to C2. The design is clean and modern with a soft blue background. The interface shows a slider or dropdown menu being adjusted by a finger, representing language level selection.' : 'relaxing with headphones, enjoying content on their device. The screen shows subtitles in English with a clean interface. The background is a soft blue gradient, and the scene conveys effortless learning through listening.'}&width=400&height=300&seq=step${index + 1}&orientation=landscape`}
                                            alt={step.title}
                                            className=""
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 flex-grow">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <i className={`${step.icon} text-primary text-xl`}></i>
                                    </div>
                                    <CardTitle className="text-2xl mb-2">{index + 1}. {step.title}</CardTitle>
                                    <CardDescription className="text-gray-600 text-base">{step.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Daily Routine Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t('landing_routine_title')}</h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 routine-description">
                            {t('landing_routine_desc')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {routineActivities.map((activity, index) => (
                            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col routine-card">
                                <CardHeader className="pb-0 p-0">
                                    <div className="routine-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'walking in a park with headphones, listening to content on their smartphone. The scene has a bright, airy feel with trees and a path. The person looks relaxed and engaged with what they are listening to, suggesting learning while exercising.' : index === 1 ? 'exercising at home or gym with headphones, watching content on a tablet device nearby. The scene shows someone doing light workout while engaging with content. The environment is bright and motivational with a clean, modern aesthetic.' : index === 2 ? 'driving a car while listening to audio content. The dashboard shows a connected smartphone playing content. The scene is from inside the vehicle with a clean, modern interior and a bright day visible through windows.' : 'doing household chores like cleaning or cooking while listening to content on wireless headphones. The home environment is bright, modern and clean. The person looks engaged with what they are listening to while completing their tasks.'}&width=300&height=200&seq=routine${index + 1}&orientation=landscape`}
                                            alt={activity.title}
                                            className=""
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 flex-grow">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <i className={`${activity.icon} text-primary text-xl`}></i>
                                    </div>
                                    <CardTitle className="text-xl mb-2">{activity.title}</CardTitle>
                                    <CardDescription className="text-gray-600">{activity.description}</CardDescription>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 !rounded-button whitespace-nowrap">
                                        <i className="fas fa-level-up-alt mr-2"></i> {t('landing_routine_button')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Features Section */}
            <section id="ozellikler" className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t('landing_features_title')}</h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-4">
                            {t('landing_features_desc')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {featuresList.map((feature, index) => (
                            <Card key={index} className="border-none shadow-lg overflow-hidden">
                                <div className="grid md:grid-cols-2 gap-0 h-full">
                                    <div className="order-2 md:order-1 p-6 flex flex-col justify-center">
                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                            <i className={`${feature.icon} text-primary text-xl`}></i>
                                        </div>
                                        <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                                        <CardDescription className="text-gray-600">{feature.description}</CardDescription>
                                    </div>
                                    <div className="order-1 md:order-2 h-48 md:h-full overflow-hidden feature-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=${index === 0 ? 'A collection of real-world media content displayed on various devices. The scene shows YouTube videos, podcasts, news articles, and social media content. The display is modern and clean with a soft blue background, emphasizing authentic learning materials.' : index === 1 ? 'A personalized user interface showing content recommendations based on interests and language level. The screen displays customization options and preference settings. The design is clean and modern with a soft blue background, conveying personalization.' : index === 2 ? 'A person relaxing with high-quality headphones, listening to content with visible subtitles on their device. The scene shows someone comfortably learning through listening. The environment is peaceful with a soft blue background.' : 'A split-screen showing a person engaged in daily activities while learning. The scene depicts someone multitasking - perhaps commuting, exercising, or doing chores while listening to content. The design is clean with a soft blue background.'}&width=500&height=300&seq=feature${index + 1}&orientation=landscape`}
                                            alt={feature.title}
                                            className="w-full h-full object-cover object-center"
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Testimonials Section */}
            <section id="yorumlar" className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t('landing_testimonials_title')}</h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-12">
                            {t('landing_testimonials_desc')}
                        </p>
                    </div>
                    <Swiper
                        modules={[Pagination, Autoplay]}
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 5000 }}
                        spaceBetween={30}
                        slidesPerView={1}
                        breakpoints={{
                            640: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 }
                        }}
                        className="pb-12"
                    >
                        {testimonialsUsers.map((testimonial, index) => (
                            <SwiperSlide key={index}>
                                <Card className="h-full border-none shadow-lg">
                                    <CardContent className="p-8">
                                        <div className="flex items-center mb-6">
                                            <Avatar className="h-12 w-12 mr-4">
                                                <AvatarFallback className={testimonial.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}>
                                                    {testimonial.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-bold">{testimonial.name}</h4>
                                                <p className="text-sm text-gray-500">{testimonial.level}</p>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                                        <div className="mt-4 flex">
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                        </div>
                                    </CardContent>
                                </Card>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </section>
            {/* Try It Now Section */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="p-8 md:p-12">
                            <h2 className="text-3xl font-bold mb-6 text-center">{t('landing_trynow_title')}</h2>
                            <div className="mb-8">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder={t('landing_trynow_placeholder')}
                                        className="w-full h-12 pl-12 pr-36 text-base border-2 border-gray-200 focus:border-primary rounded-lg"
                                    />
                                    <i className="fas fa-link absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                        <Link href="/register">
                                            <Button
                                                className="h-10 px-5 !rounded-button whitespace-nowrap"
                                            >
                                                {t('landing_trynow_button')}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-8">
                                {levels.map((lvl, index) => (
                                    <Button
                                        key={index}
                                        variant={index === level ? "default" : "outline"}
                                        className={`flex-grow justify-center !rounded-button whitespace-nowrap ${index === level ? '' : 'border-primary/60 text-primary'}`}
                                        onClick={() => setLevel(index)}
                                    >
                                        {lvl}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-center text-gray-500">
                                {t('landing_trynow_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Extra CTA Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-4xl font-bold mb-6 text-gray-900">
                            {t('landing_cta_title')}
                        </h2>
                        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-8">
                            {t('landing_cta_desc')}
                        </p>
                        <a href="/register">
                            <Button className="text-lg py-6 px-8 !rounded-button whitespace-nowrap">
                                <i className="fas fa-rocket mr-2"></i> {t('landing_cta_button')}
                            </Button>
                        </a>
                        <div className="mt-8 flex justify-center items-center space-x-6">
                            {ctaBenefits.map((benefit, index) => (
                                <div key={index} className="flex items-center">
                                    <i
                                        className="fas fa-check-circle mr-2"
                                        style={{ color: '#22c55e' }}
                                    ></i>
                                    <span className="text-gray-600">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            {/* Footer */}
            <Footer />
        </div>
    );
};

export default App;

'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/common';
import Image from 'next/image';
import type { SelfApp } from '@selfxyz/common';
import OrderBook from './OrderBook';
import { ThemeToggle } from './ThemeToggle';

// Import the QR code component with SSR disabled to prevent document references during server rendering
const SelfQRcodeWrapper = dynamic(
    () => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper),
    { ssr: false }
);

// Verification states
type VerificationState = 'welcome' | 'showing-qr' | 'verified';

// Order form interface
interface OrderForm {
    seller_pubkey: string;
    token: string;
    rate_pyusd_per_inr: string;
    min_pyusd: string;
    max_pyusd: string;
    available_pyusd: string;
    expiry_timestamp: string;
}

function Playground() {
    const [userId, setUserId] = useState<string | null>(null);
    const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
    const [universalLink, setUniversalLink] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [isFetchingToken, setIsFetchingToken] = useState(false);
    const [verificationState, setVerificationState] = useState<VerificationState>('welcome');
    
    // Order form state
    const [orderForm, setOrderForm] = useState<OrderForm>({
        seller_pubkey: '',
        token: 'PYUSD',
        rate_pyusd_per_inr: '',
        min_pyusd: '',
        max_pyusd: '',
        available_pyusd: '',
        expiry_timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 24 hours from now
    });
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [inrRateInput, setInrRateInput] = useState('90'); // Default to 90 INR for 1 PYUSD

    useEffect(() => {
        setUserId(uuidv4());
    }, []);

    // Initialize PYUSD rate based on default INR rate
    useEffect(() => {
        const defaultInrRate = 90;
        const pyusdPerInrRate = (1 / defaultInrRate).toString();
        setOrderForm(prev => ({ ...prev, rate_pyusd_per_inr: pyusdPerInrRate }));
    }, []); // Run once on mount

    const handleSuccess = () => {
        // Verification successful
        setVerificationState('verified');
    };

    const handleVerifyClick = () => {
        setVerificationState('showing-qr');
    };

    useEffect(() => {
        if (userId) {
            const app = new SelfAppBuilder({
                appName: "Self Playground",
                scope: "12345",
                endpoint: "0xAa55A26E92A071562f312A8b557bA2BABb56ab31",
                // endpoint: "https://c622-118-169-75-84.ngrok-free.app/api/verify",
                endpointType: "celo",
                logoBase64: "https://i.imgur.com/Rz8B3s7.png",
                userId: "0x0000000000000000000000000000000000000000",
                userIdType: "hex",
               
                version: 2,
                userDefinedData: "hello from the playground",
                devMode: true,
            } as Partial<SelfApp>).build();

            setSelfApp(app);
            setUniversalLink(getUniversalLink(app));
        }
    }, [userId]);

    const sendPayload = useCallback(async () => {
        try {
            if (!userId || !selfApp) {
                return '';
            }

            const payload = {
                campaign_id: 'self-playground',
                campaign_user_id: userId,
                self_app: JSON.stringify(selfApp)
            };
            
            const response = await fetch('/api/deferredLinking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch token: ${response.status}`);
            }

            const data = await response.json();
            return data.data || '';
        } catch (error) {
            return '';
        }
    }, [userId, selfApp]);

    // Prefetch token when the link is ready to allow single-tap copy+open on mobile
    useEffect(() => {
        let cancelled = false;
        const prefetch = async () => {
            if (!userId || !universalLink) return;
            if (token || isFetchingToken) return;
            setIsFetchingToken(true);
            const t = await sendPayload();
            if (!cancelled) {
                setToken(t || null);
            }
            setIsFetchingToken(false);
        };
        prefetch();
        return () => { cancelled = true; };
    }, [userId, universalLink, token, isFetchingToken, sendPayload]);

    // Also fetch token when moving to QR state
    useEffect(() => {
        let cancelled = false;
        const fetchTokenForQR = async () => {
            if (verificationState !== 'showing-qr') return;
            if (!userId || !universalLink) return;
            if (token || isFetchingToken) return;
            
            setIsFetchingToken(true);
            const t = await sendPayload();
            if (!cancelled) {
                setToken(t || null);
            }
            setIsFetchingToken(false);
        };
        fetchTokenForQR();
        return () => { cancelled = true; };
    }, [verificationState, userId, universalLink, token, isFetchingToken, sendPayload]);

    // TEMPORARY: Force verified state in development to test OrderBook
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            const timer = setTimeout(() => setVerificationState('verified'), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Function to generate random values for nonce and signature
    const generateRandomNonce = () => Math.floor(Math.random() * 1000000).toString();
    
    const generateRandomSignature = () => {
        const chars = '0123456789abcdef';
        let result = '0x';
        for (let i = 0; i < 130; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Handle order submission
    const handleSubmitOrder = async () => {
        if (!orderForm.seller_pubkey || !orderForm.rate_pyusd_per_inr || !orderForm.min_pyusd || 
            !orderForm.max_pyusd || !orderForm.available_pyusd || !orderForm.expiry_timestamp) {
            alert('Please fill in all required fields');
            return;
        }

        setIsSubmittingOrder(true);
        
        try {
            // Prepare the order payload
            const orderPayload = {
                seller_pubkey: orderForm.seller_pubkey,
                chain: "polygon",
                token: orderForm.token,
                rate_pyusd_per_inr: orderForm.rate_pyusd_per_inr,
                min_pyusd: orderForm.min_pyusd,
                max_pyusd: orderForm.max_pyusd,
                available_pyusd: orderForm.available_pyusd,
                fee_pct: "0.001800",
                est_latency_ms: 9000,
                supports_swap: true,
                upi_enabled: true,
                nonce: generateRandomNonce(),
                expiry_timestamp: new Date(orderForm.expiry_timestamp).toISOString(),
                signature: generateRandomSignature()
            };

            console.log('Submitting order:', orderPayload);

            // Submit to the orderbook service
            const response = await fetch('https://pyrex-ethglobal25.onrender.com/offers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderPayload)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Order submitted successfully:', result);
                alert('Order submitted successfully!');
                
                // Reset form
                setOrderForm({
                    seller_pubkey: '',
                    token: 'PYUSD',
                    rate_pyusd_per_inr: '',
                    min_pyusd: '',
                    max_pyusd: '',
                    available_pyusd: '',
                    expiry_timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                });
                setInrRateInput('90'); // Reset to default INR rate
            } else {
                const error = await response.text();
                console.error('Failed to submit order:', error);
                alert('Failed to submit order. Please check the console for details.');
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Error submitting order. Please check your network connection.');
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const openSelfApp = async () => {
        if (!universalLink || !token) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        try {
            await navigator.clipboard.writeText(token);
        } catch (err) {
            prompt("Copy this token manually:", token);
        }
        if (isMobile) {
            location.href = universalLink;
        } else {
            window.open(universalLink, "_blank");
        }
    };

    if (!userId) return null;

    const renderWelcomeState = () => (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 overflow-hidden transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-6 left-6 z-30">
                <ThemeToggle />
            </div>
            
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.25),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-400/30 dark:to-indigo-400/30 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-400/30 dark:to-pink-400/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 dark:from-indigo-400/40 dark:to-purple-400/40 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex-1 flex items-center justify-center px-4 py-8">
                    <div className="text-center space-y-12 max-w-4xl animate-fadeIn">
                        {/* Hero Section */}
                        <div className="space-y-8">
                            {/* Animated Logo */}
                            <div className="relative mx-auto w-32 h-32 animate-float">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl shadow-2xl animate-pulse opacity-20"></div>
                                <div className="relative w-full h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
                                    <svg className="w-16 h-16 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                            </div>
                            
                            {/* Hero Text */}
                            <div className="space-y-6">
                                <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-slate-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent animate-slideUp leading-tight">
                                    Pyrex Trading
                                </h1>
                                <div className="space-y-4 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                                    <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                        Secure • Verified • Decentralized
                                    </p>
                                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                                        Access the next generation trading platform powered by <span className="font-bold text-indigo-600 dark:text-indigo-400">Self</span> cryptographic verification
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Enhanced Security Features Grid */}
                        <div className="grid md:grid-cols-3 gap-8 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                            <div className="group relative bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/90 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-400/10 dark:to-indigo-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Bank-Grade Security</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Military-grade encryption and multi-layer security protocols protect every transaction</p>
                                </div>
                            </div>
                            
                            <div className="group relative bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/90 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-400/10 dark:to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Identity Verified</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Cryptographic identity verification ensures you know exactly who you&apos;re trading with</p>
                                </div>
                            </div>
                            
                            <div className="group relative bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/90 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-400/10 dark:to-pink-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Lightning Fast</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Instant trade execution and settlement with real-time order matching</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Enhanced CTA Section */}
                        <div className="space-y-8 animate-slideUp" style={{ animationDelay: '0.6s' }}>
                            <button
                                onClick={() => {
                                    // Reset token state to force fresh fetch
                                    setToken(null);
                                    setIsFetchingToken(false);
                                    setVerificationState('showing-qr');
                                }}
                                className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-500 hover:-rotate-1 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                                <span className="relative flex items-center space-x-4">
                                    <svg className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <span>Begin Verification</span>
                                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </button>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                                Start your journey to secure, verified trading. Your identity remains private while proving authenticity.
                            </p>
                        </div>
                        
                        {/* Enhanced Trust Indicators */}
                        <div className="flex flex-wrap justify-center items-center gap-8 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
                            <div className="flex items-center space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 dark:border-slate-700/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">256-bit SSL Encryption</span>
                            </div>
                            <div className="flex items-center space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 dark:border-slate-700/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Decentralized Identity</span>
                            </div>
                            <div className="flex items-center space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 dark:border-slate-700/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Zero-Knowledge Proofs</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderQRState = () => (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-indigo-900 dark:to-purple-900 overflow-hidden transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-6 left-6 z-30">
                <ThemeToggle />
            </div>
            
            {/* Enhanced Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.25),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.25),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 dark:from-indigo-400/30 dark:to-purple-400/30 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-400/30 dark:to-pink-400/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
            {/* Enhanced QR Code in top-right corner */}
            <div className="absolute top-6 right-6 z-20 animate-qr-slide">
                <div className="relative group">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    
                    {/* QR Container */}
                    <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-slate-700/50">
                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                                <div className="relative">
                                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                                    <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                                <span className="text-base font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-100 bg-clip-text text-transparent">
                                    Self Verification
                                </span>
                            </div>
                            <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mx-auto rounded-full shadow-lg"></div>
                        </div>
                        
                        {selfApp ? (
                            <div className="relative">
                                <div className="qr-container bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 shadow-inner border border-slate-100 dark:border-slate-300">
                                    <SelfQRcodeWrapper
                                        selfApp={selfApp}
                                        onSuccess={handleSuccess}
                                        darkMode={false}
                                        onError={() => {
                                            console.error('Error generating QR code');
                                        }}
                                    />
                                </div>
                                
                                {/* Enhanced QR Corner Decorations */}
                                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-3 border-t-3 border-indigo-500 rounded-tl-xl shadow-lg"></div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 border-r-3 border-t-3 border-purple-500 rounded-tr-xl shadow-lg"></div>
                                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-3 border-b-3 border-purple-500 rounded-bl-xl shadow-lg"></div>
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-3 border-b-3 border-pink-500 rounded-br-xl shadow-lg"></div>
                            </div>
                        ) : (
                            <div className="w-56 h-56 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center animate-pulse border border-slate-200 dark:border-slate-600">
                                <div className="text-center space-y-4">
                                    <div className="relative mx-auto w-12 h-12">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-spin opacity-20"></div>
                                        <svg className="relative w-12 h-12 text-slate-400 dark:text-slate-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Generating secure QR code...</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6 space-y-4">
                            <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200/50 dark:border-slate-600/50">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">
                                    Session ID: {userId!.substring(0, 8)}...
                                </p>
                            </div>
                            
                            <button
                                onClick={openSelfApp}
                                disabled={!universalLink || !token}
                                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-xl disabled:cursor-not-allowed transition-all duration-500 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl"
                            >
                                {(!token || isFetchingToken) ? (
                                    <span className="flex items-center justify-center space-x-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Preparing secure connection...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center space-x-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span>Open in Self App</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Main content area */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="text-center space-y-10 max-w-2xl animate-fadeIn">
                    {/* Hero Icon */}
                    <div className="relative mx-auto w-24 h-24 animate-float">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl shadow-2xl animate-pulse opacity-20"></div>
                        <div className="relative w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
                            <svg className="w-12 h-12 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                    </div>
                    
                    {/* Enhanced Title Section */}
                    <div className="space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 dark:from-slate-100 dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent">
                            Scan QR Code
                        </h2>
                        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
                            Open the <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Self app</span> and scan the QR code in the top-right corner to verify your identity
                        </p>
                    </div>
                    
                    {/* Enhanced Instructions Card */}
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50 dark:border-slate-700/50 max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-2 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Verification Steps</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">1</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Open your Self mobile app</span>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">2</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Tap the scan button</span>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">3</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Point camera at QR code above</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Security Notice */}
                    <div className="flex items-center justify-center space-x-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30 dark:border-slate-700/30 max-w-fit mx-auto">
                        <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Secure end-to-end encrypted verification</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderVerifiedState = () => (
        <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-indigo-100 dark:from-emerald-900/20 dark:via-slate-900 dark:to-indigo-900/20 overflow-hidden transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-6 left-6 z-30">
                <ThemeToggle />
            </div>
            
            {/* Enhanced Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.25),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.25),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-green-400/20 dark:from-emerald-400/30 dark:to-green-400/30 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 dark:from-indigo-400/30 dark:to-purple-400/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-green-400/30 to-indigo-400/30 dark:from-green-400/40 dark:to-indigo-400/40 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
                {/* Enhanced Success Header */}
                <div className="text-center space-y-12 mb-16 animate-fadeIn">
                    {/* Success Icon with enhanced animations */}
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full shadow-2xl animate-pulse opacity-30"></div>
                        <div className="relative w-full h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20 animate-success-bounce">
                            <svg className="w-16 h-16 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        {/* Success particles */}
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    
                    <div className="space-y-6">
                        <h2 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-indigo-700 dark:from-emerald-400 dark:via-green-400 dark:to-indigo-400 bg-clip-text text-transparent animate-slideUp leading-tight">
                            🎉 Verification Complete!
                        </h2>
                        <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-300 max-w-2xl mx-auto animate-slideUp leading-relaxed" style={{ animationDelay: '0.2s' }}>
                            Welcome to the secure trading environment. Your identity has been cryptographically verified.
                        </p>
                    </div>
                    
                    {/* Enhanced Success Features */}
                    <div className="flex flex-wrap justify-center gap-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                        <div className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 dark:from-emerald-400/10 dark:to-green-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">Identity Verified</span>
                            </div>
                        </div>
                        
                        <div className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-400/10 dark:to-purple-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">Secure Session</span>
                            </div>
                        </div>
                        
                        <div className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-400/10 dark:to-pink-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">Ready to Trade</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Order Book Section */}
                <div className="w-full max-w-7xl animate-scaleIn" style={{ animationDelay: '0.6s' }}>
                    {/* Agent Deployment & Amount Setting Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Agent Deployment Section */}
                        <div className="relative group h-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-8 h-full flex flex-col">
                                {/* Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Deploy Trading Agent</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Launch your automated trading agent</p>
                                    </div>
                                </div>

                                {/* Agent Status */}
                                <div className="mb-2.5">
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200/60 dark:border-slate-600/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Agent Status</span>
                                        </div>
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                                            Ready to Deploy
                                        </span>
                                    </div>
                                </div>

                                {/* Agent Configuration */}
                                <div className="space-y-4 mb-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200/60 dark:border-blue-700/60">
                                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Strategy</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Market Making</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200/60 dark:border-purple-700/60">
                                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Network</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Polygon</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Agent Description */}
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200/60 dark:border-indigo-700/60">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Agent Capabilities</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                            <span>Automated liquidity provision</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Real-time price optimization</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                            <span>Risk management protocols</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deploy Button */}
                                <div className="mt-auto">
                                    <button className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 group">
                                        <div className="flex items-center justify-center gap-3">
                                            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            <span>Deploy Agent</span>
                                            <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Amount Setting Section */}
                        <div className="relative group h-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-8 h-full flex flex-col">
                                {/* Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Create Sell Order</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Set your PYUSD selling parameters</p>
                                    </div>
                                </div>

                                {/* Seller Public Key and Token Selection */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Seller Public Key
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="0x0A89f9b0240aCeae29f6887e38425Aab3B12f0d8"
                                            value={orderForm.seller_pubkey}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, seller_pubkey: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Token
                                        </label>
                                        <select
                                            value={orderForm.token}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, token: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        >
                                            <option value="PYUSD">PYUSD</option>
                                            <option value="USDC">USDC</option>
                                            <option value="USDT">USDT</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Exchange Rate */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Rate (INR per PYUSD)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="90.00"
                                            value={inrRateInput}
                                            onChange={(e) => {
                                                setInrRateInput(e.target.value);
                                                // Calculate PYUSD per INR rate (1/INR_rate)
                                                const inrValue = parseFloat(e.target.value);
                                                if (inrValue && inrValue > 0) {
                                                    const pyusdPerInrRate = (1 / inrValue).toString();
                                                    setOrderForm(prev => ({ ...prev, rate_pyusd_per_inr: pyusdPerInrRate }));
                                                } else {
                                                    setOrderForm(prev => ({ ...prev, rate_pyusd_per_inr: '' }));
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">INR</span>
                                        </div>
                                    </div>
                                    {orderForm.rate_pyusd_per_inr && (
                                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/30 rounded-lg px-3 py-2">
                                            Calculated rate: {parseFloat(orderForm.rate_pyusd_per_inr).toFixed(18)} PYUSD per INR
                                        </div>
                                    )}
                                </div>

                                {/* Min/Max Amount Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Min
                                        </label>
                                        <input
                                            type="number"
                                            step="0.00000001"
                                            placeholder="50.00000000"
                                            value={orderForm.min_pyusd}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, min_pyusd: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Max
                                        </label>
                                        <input
                                            type="number"
                                            step="0.00000001"
                                            placeholder="300.00000000"
                                            value={orderForm.max_pyusd}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, max_pyusd: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Available Amount */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        placeholder="250.00000000"
                                        value={orderForm.available_pyusd}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, available_pyusd: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Order Expiry */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Order Expiry
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={orderForm.expiry_timestamp}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, expiry_timestamp: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="mt-auto">
                                    <button 
                                        onClick={handleSubmitOrder}
                                        disabled={isSubmittingOrder}
                                        className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:via-teal-700 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:scale-100 transition-all duration-200 group disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            {isSubmittingOrder ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    <span>Submitting Order...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    <span>Submit Order</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Order Book Header Section */}
                    <div className="text-center mb-8 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                                    PYUSD/INR Order Book
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Live Market Data • Real-time Order Matching</span>
                        </div>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 mx-auto mt-4 rounded-full shadow-lg"></div>
                    </div>
                    
                    {/* Enhanced Order Book Container */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                        <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 overflow-hidden">
                            <OrderBook />
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Footer */}
                <div className="mt-16 text-center space-y-6 animate-fadeIn" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center justify-center space-x-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-8 py-4 border border-white/30 dark:border-slate-700/30 max-w-fit mx-auto">
                        <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                        <span className="text-lg font-medium text-slate-700 dark:text-slate-300">
                            All transactions secured by Self&apos;s cryptographic verification
                        </span>
                        <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        Your privacy is protected while maintaining full transaction transparency and authenticity
                    </p>
                </div>
            </div>
        </div>
    );

    // Render based on verification state
    if (verificationState === 'welcome') {
        return renderWelcomeState();
    } else if (verificationState === 'showing-qr') {
        return renderQRState();
    } else if (verificationState === 'verified') {
        return renderVerifiedState();
    }

    return null;
}

export default Playground;

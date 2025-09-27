'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/common';
import Image from 'next/image';
import type { SelfApp } from '@selfxyz/common';
import OrderBook from './OrderBook';

// Import the QR code component with SSR disabled to prevent document references during server rendering
const SelfQRcodeWrapper = dynamic(
    () => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper),
    { ssr: false }
);

// Verification states
type VerificationState = 'welcome' | 'showing-qr' | 'verified';

function Playground() {
    const [userId, setUserId] = useState<string | null>(null);
    const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
    const [universalLink, setUniversalLink] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [isFetchingToken, setIsFetchingToken] = useState(false);
    const [verificationState, setVerificationState] = useState<VerificationState>('welcome');

    useEffect(() => {
        setUserId(uuidv4());
    }, []);

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
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
            {/* Enhanced Animated Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.15),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
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
                                <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent animate-slideUp leading-tight">
                                    Pyrex Trading
                                </h1>
                                <div className="space-y-4 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                                    <p className="text-2xl md:text-3xl font-medium text-slate-700 leading-relaxed">
                                        Secure • Verified • Decentralized
                                    </p>
                                    <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                                        Access the next generation trading platform powered by <span className="font-bold text-indigo-600">Self</span> cryptographic verification
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Enhanced Security Features Grid */}
                        <div className="grid md:grid-cols-3 gap-8 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                            <div className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 hover:bg-white/80 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">Bank-Grade Security</h3>
                                    <p className="text-slate-600 leading-relaxed">Military-grade encryption and multi-layer security protocols protect every transaction</p>
                                </div>
                            </div>
                            
                            <div className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 hover:bg-white/80 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">Identity Verified</h3>
                                    <p className="text-slate-600 leading-relaxed">Cryptographic identity verification ensures you know exactly who you&apos;re trading with</p>
                                </div>
                            </div>
                            
                            <div className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 hover:bg-white/80 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
                                    <p className="text-slate-600 leading-relaxed">Instant trade execution and settlement with real-time order matching</p>
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
                            
                            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                                Start your journey to secure, verified trading. Your identity remains private while proving authenticity.
                            </p>
                        </div>
                        
                        {/* Enhanced Trust Indicators */}
                        <div className="flex flex-wrap justify-center items-center gap-8 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
                            <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700">256-bit SSL Encryption</span>
                            </div>
                            <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700">Decentralized Identity</span>
                            </div>
                            <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-sm font-medium text-slate-700">Zero-Knowledge Proofs</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderQRState = () => (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 overflow-hidden">
            {/* Enhanced Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
            {/* Enhanced QR Code in top-right corner */}
            <div className="absolute top-6 right-6 z-20 animate-qr-slide">
                <div className="relative group">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    
                    {/* QR Container */}
                    <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                                <div className="relative">
                                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                                    <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                                </div>
                                <span className="text-base font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                                    Self Verification
                                </span>
                            </div>
                            <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mx-auto rounded-full shadow-lg"></div>
                        </div>
                        
                        {selfApp ? (
                            <div className="relative">
                                <div className="qr-container bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 shadow-inner border border-slate-100">
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
                            <div className="w-56 h-56 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center animate-pulse border border-slate-200">
                                <div className="text-center space-y-4">
                                    <div className="relative mx-auto w-12 h-12">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-spin opacity-20"></div>
                                        <svg className="relative w-12 h-12 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">Generating secure QR code...</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6 space-y-4">
                            <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200/50">
                                <p className="text-xs font-medium text-slate-600 text-center">
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
                        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                            Scan QR Code
                        </h2>
                        <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl mx-auto">
                            Open the <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Self app</span> and scan the QR code in the top-right corner to verify your identity
                        </p>
                    </div>
                    
                    {/* Enhanced Instructions Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50 max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-2 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Verification Steps</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">1</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 font-medium">Open your Self mobile app</span>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">2</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 font-medium">Tap the scan button</span>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 group">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">3</div>
                                <div className="flex-1 pt-1">
                                    <span className="text-slate-700 font-medium">Point camera at QR code above</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Security Notice */}
                    <div className="flex items-center justify-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30 max-w-fit mx-auto">
                        <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                        <span className="text-sm font-medium text-slate-700">Secure end-to-end encrypted verification</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderVerifiedState = () => (
        <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-indigo-100 overflow-hidden">
            {/* Enhanced Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
            
            {/* Floating Elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-green-400/30 to-indigo-400/30 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
            
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
                        <h2 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-indigo-700 bg-clip-text text-transparent animate-slideUp leading-tight">
                            🎉 Verification Complete!
                        </h2>
                        <p className="text-2xl md:text-3xl font-medium text-slate-700 max-w-2xl mx-auto animate-slideUp leading-relaxed" style={{ animationDelay: '0.2s' }}>
                            Welcome to the secure trading environment. Your identity has been cryptographically verified.
                        </p>
                    </div>
                    
                    {/* Enhanced Success Features */}
                    <div className="flex flex-wrap justify-center gap-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                        <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900">Identity Verified</span>
                            </div>
                        </div>
                        
                        <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900">Secure Session</span>
                            </div>
                        </div>
                        
                        <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-xl border border-white/50 hover:bg-white/90 transition-all duration-300 hover:scale-105">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-900">Ready to Trade</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Order Book Section */}
                <div className="w-full max-w-7xl animate-scaleIn" style={{ animationDelay: '0.6s' }}>
                    {/* Order Book Header */}
                    <div className="text-center mb-10">
                        <div className="space-y-4">
                            <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                                PYUSD/INR Order Book
                            </h3>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                                Real-time trading opportunities from verified sellers in our secure marketplace
                            </p>
                        </div>
                        <div className="flex items-center justify-center mt-6">
                            <div className="w-32 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full shadow-lg"></div>
                        </div>
                    </div>
                    
                    {/* Enhanced Order Book Container */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                            <OrderBook />
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Footer */}
                <div className="mt-16 text-center space-y-6 animate-fadeIn" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center justify-center space-x-4 bg-white/50 backdrop-blur-sm rounded-full px-8 py-4 border border-white/30 max-w-fit mx-auto">
                        <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                        <span className="text-lg font-medium text-slate-700">
                            All transactions secured by Self&apos;s cryptographic verification
                        </span>
                        <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                    
                    <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
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

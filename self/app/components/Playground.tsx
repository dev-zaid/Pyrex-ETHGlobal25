'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/common';
import Image from 'next/image';
import type { SelfApp } from '@selfxyz/common';

// Import the QR code component with SSR disabled to prevent document references during server rendering
const SelfQRcodeWrapper = dynamic(
    () => import('@selfxyz/qrcode').then((mod) => mod.SelfQRcodeWrapper),
    { ssr: false }
);

function Playground() {
    const [userId, setUserId] = useState<string | null>(null);
    const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
    const [universalLink, setUniversalLink] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [isFetchingToken, setIsFetchingToken] = useState(false);

    useEffect(() => {
        setUserId(uuidv4());
    }, []);

    const handleSuccess = async (data?: any) => {
        console.log('Verification successful', data);
        // If we get a tx hash from the data, use it
        if (data?.txHash) {
            console.log("txHash", data.txHash);
        }
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

            console.log("app", app);
            setSelfApp(app);
            console.log("selfApp built:", app);
            setUniversalLink(getUniversalLink(app));
        }
    }, [userId]);

    const sendPayload = async () => {
        try {
            const response = await fetch('/api/deferredLinking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    campaign_id: 'self-playground',
                    campaign_user_id: userId,
                    self_app: JSON.stringify(selfApp)
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch token: ${response.status}`);
            }

            const data = await response.json();
            return data.data || '';
        } catch (error) {
            console.error("Error fetching token:", error);
            return '';
        }
    };

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
    }, [userId, universalLink]);

    const openSelfApp = async () => {
        if (!universalLink || !token) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        try {
            await navigator.clipboard.writeText(token);
            console.log("Token copied via navigator.clipboard");
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            prompt("Copy this token manually:", token);
        }
        if (isMobile) {
            location.href = universalLink;
        } else {
            window.open(universalLink, "_blank");
        }
    };

    if (!userId) return null;

    return (
        <div className="App flex flex-col min-h-screen bg-white text-black" suppressHydrationWarning>
            <nav className="w-full bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between">
                <div className="flex items-center">
                    <div className="mr-8">
                        <Image
                            width={32}
                            height={32}
                            src="/self.svg"
                            alt="Self Logo"
                            className="h-8 w-8"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <a
                        href="https://github.com/selfxyz/self"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-900 text-white px-4 py-2 rounded-md flex items-center hover:bg-gray-800 transition-colors"
                    >
                        <span className="mr-2">Star on Github</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                        </svg>
                    </a>
                    <a
                        className="flex items-center justify-center gap-2 hover:underline hover:underline-offset-4"
                        href="https://self.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Go to self.xyz →
                    </a>
                </div>
            </nav>
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                <div className="w-full max-w-4xl flex flex-col items-center justify-center">
                    {selfApp ? (
                        <SelfQRcodeWrapper
                            selfApp={selfApp}
                            onSuccess={handleSuccess}
                            darkMode={false}
                            onError={() => {
                                console.error('Error generating QR code');
                            }}
                        />
                    ) : (
                        <p>Loading QR Code...</p>
                    )}
                    <p className="mt-4 text-sm text-gray-700">
                        User ID: {userId!.substring(0, 8)}...
                    </p>
                    <button
                        onClick={openSelfApp}
                        disabled={!universalLink || !token}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        {(!token || isFetchingToken) ? 'Preparing…' : 'Open in Self App'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Playground;

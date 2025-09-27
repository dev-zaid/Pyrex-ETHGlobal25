'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Offer {
  id: string;
  seller_pubkey: string;
  chain: string;
  token: string;
  rate_pyusd_per_inr: string;
  min_pyusd: string;
  max_pyusd: string;
  available_pyusd: string;
  fee_usd: string;
  fee_pct: string;
  est_latency_ms: number;
  supports_swap: boolean;
  upi_enabled: boolean;
  status: string;
  nonce: string;
  expiry_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

interface Metrics {
  offers: {
    total: number;
    active: number;
    cancelled: number;
    active_liquidity_pyusd: number;
    last_updated: string | null;
  };
  reservations: {
    total: number;
    pending: number;
    committed: number;
    released: number;
    last_updated: string | null;
  };
  service: {
    timestamp: string;
  };
}

export default function OrderBook() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'fulfilled'>('all');
  const [selectedAmounts, setSelectedAmounts] = useState<{ [key: string]: string }>({});

  const fetchOffers = useCallback(async () => {
    try {
      console.log('🔄 Fetching offers...');
      
      // Add limit parameter to get all offers (default might be 4)
      const response = await fetch('https://pyrex-ethglobal25.onrender.com/offers?limit=100');
      const data = await response.json();
      
      console.log('📦 Raw offers data:', data);
      
      // Handle different API response formats
      if (Array.isArray(data)) {
        // Direct array format
        setOffers(data);
        console.log(`✅ SUCCESS: Loaded ${data.length} offers!`, data);
      } else if (data && Array.isArray(data.offers)) {
        // Nested format: {offers: [...], count: N}
        setOffers(data.offers);
        console.log(`✅ SUCCESS: Loaded ${data.offers.length} offers from nested format!`, data.offers);
      } else {
        console.warn('⚠️ Unexpected data format:', data);
        setOffers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching offers:', error);
      setOffers([]);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      console.log('📊 Fetching metrics...');
      
      const response = await fetch('https://pyrex-ethglobal25.onrender.com/admin/metrics');
      const data = await response.json();
      
      console.log('📊 Raw metrics data:', data);
      setMetrics(data);
    } catch (error) {
      console.error('❌ Error fetching metrics:', error);
      setMetrics(null);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 OrderBook useEffect triggered');
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([fetchOffers(), fetchMetrics()]);
        console.log('✅ All data loaded successfully');
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Failed to load order book data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const interval = setInterval(() => {
      console.log('⏰ Interval triggered - refreshing data');
      fetchOffers();
      fetchMetrics();
    }, 5000); // Refresh every 5 seconds
    
    return () => {
      console.log('🧹 Cleaning up interval');
      clearInterval(interval);
    };
  }, [fetchOffers, fetchMetrics]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Loading Order Book</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fetching latest market data...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeOffers = offers.filter(offer => offer.status === 'active');
  const totalVolume = offers.reduce((sum, offer) => sum + parseFloat(offer.available_pyusd), 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Stats Cards Section */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Volume</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalVolume.toFixed(2)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">PYUSD</div>
            </div>
            
            <div className="bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Active Orders</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeOffers.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Live Offers</div>
            </div>
            
            {metrics && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white col-span-2 lg:col-span-1">
                <div className="text-xs font-medium text-blue-100 uppercase tracking-wide">Total Liquidity</div>
                <div className="text-2xl font-bold">{metrics.offers.active_liquidity_pyusd.toFixed(2)}</div>
                <div className="text-xs text-blue-200">PYUSD Available</div>
              </div>
            )}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
        <div className="border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-700/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'all'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10z" />
                </svg>
                <span>All Orders</span>
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                  {offers.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'open'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Open Orders</span>
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                  {activeOffers.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('fulfilled')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'fulfilled'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Fulfilled</span>
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                  {metrics?.reservations.committed || 0}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white dark:bg-slate-800">
          <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {activeTab === 'all' && 'All Market Orders'}
                  {activeTab === 'open' && 'Available Orders'}  
                  {activeTab === 'fulfilled' && 'Order History'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'all' && 'Complete order book with all available offers'}
                  {activeTab === 'open' && 'Ready for immediate execution'}  
                  {activeTab === 'fulfilled' && 'Successfully completed transactions'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Data • Updates every 5s</span>
                </div>
                
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        
          {(activeTab === 'all' || activeTab === 'open') && (
            <div className="overflow-hidden">
              {(activeTab === 'all' ? offers : activeOffers).length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Orders Available</h4>
                  <p className="text-slate-500 dark:text-slate-400">Check back soon for new trading opportunities</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-700/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Seller
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Exchange Rate
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Available
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Range
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Fee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Speed
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Features
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40 dark:divide-slate-700/40">
                      {(activeTab === 'all' ? offers : activeOffers).map((offer, index) => (
                        <tr key={offer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-all duration-150 group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                                {offer.seller_pubkey.slice(2, 4).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {offer.seller_pubkey.slice(0, 6)}...{offer.seller_pubkey.slice(-4)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Verified Seller
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                              ₹{parseFloat(offer.rate_pyusd_per_inr).toFixed(4)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">per PYUSD</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {parseFloat(offer.available_pyusd).toFixed(2)}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">PYUSD</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                              {parseFloat(offer.min_pyusd).toFixed(1)} - {parseFloat(offer.max_pyusd).toFixed(1)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">PYUSD range</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              {parseFloat(offer.fee_pct).toFixed(2)}%
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              ~{Math.round(offer.est_latency_ms / 1000)}s
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {offer.upi_enabled && (
                                <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                                  🇮🇳 UPI
                                </div>
                              )}
                              {offer.supports_swap && (
                                <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                  ⚡ Swap
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'fulfilled' && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">Transaction History</h4>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {metrics?.reservations.committed || 0} orders have been successfully completed and settled
              </p>
              
              {metrics && (
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{metrics.reservations.total}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.reservations.committed}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">Completed</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.reservations.pending}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Pending</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

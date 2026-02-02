/**
 * @fileoverview Loyalty Card Component
 *
 * Displays customer loyalty status with points, tier, and redemption options
 */

import { useState, useEffect } from 'react';
import { Award, Gift, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from '../stores/toastStore';

export default function LoyaltyCard({ customerId, onPointsRedeemed }) {
    const [loading, setLoading] = useState(true);
    const [loyalty, setLoyalty] = useState(null);
    const [program, setProgram] = useState(null);
    const [redeemPoints, setRedeemPoints] = useState('');
    const [showRedeemDialog, setShowRedeemDialog] = useState(false);

    useEffect(() => {
        if (customerId) {
            loadLoyalty();
        }
    }, [customerId]);

    const loadLoyalty = async () => {
        try {
            const data = await api.loyalty.getCustomerLoyalty(customerId);
            setLoyalty(data);
            setProgram(data.program);
        } catch (error) {
            console.error('Failed to load loyalty:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        const points = parseInt(redeemPoints);

        if (!points || points <= 0) {
            toast.error('Please enter a valid number of points');
            return;
        }

        if (points < program.minPointsToRedeem) {
            toast.error(`Minimum ${program.minPointsToRedeem} points required`);
            return;
        }

        if (points > loyalty.points) {
            toast.error('Insufficient points balance');
            return;
        }

        if (points > program.maxPointsPerTransaction) {
            toast.error(`Maximum ${program.maxPointsPerTransaction} points per transaction`);
            return;
        }

        try {
            const result = await api.loyalty.redeemPoints(customerId, points);

            // Calculate discount amount
            const discount = result.discountAmount || (points / program.pointsPerUnit);

            toast.success(`Redeemed ${points} points for $${discount.toFixed(2)} discount`);

            // Update loyalty state
            setLoyalty(result.loyalty);
            setRedeemPoints('');
            setShowRedeemDialog(false);

            // Notify parent component
            if (onPointsRedeemed) {
                onPointsRedeemed(discount, points);
            }
        } catch (error) {
            console.error('Failed to redeem points:', error);
            toast.error(error.message || 'Failed to redeem points');
        }
    };

    const getTierColor = (tier) => {
        const colors = {
            bronze: 'bg-orange-100 text-orange-800 border-orange-300',
            silver: 'bg-gray-100 text-gray-800 border-gray-300',
            gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            platinum: 'bg-purple-100 text-purple-800 border-purple-300'
        };
        return colors[tier] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getTierGradient = (tier) => {
        const gradients = {
            bronze: 'from-orange-400 to-orange-600',
            silver: 'from-gray-400 to-gray-600',
            gold: 'from-yellow-400 to-yellow-600',
            platinum: 'from-purple-400 to-purple-600'
        };
        return gradients[tier] || 'from-gray-400 to-gray-600';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!loyalty || !program) {
        return null;
    }

    const maxDiscount = Math.floor(loyalty.points / program.pointsPerUnit);
    const nextTierSpending = program.tiers[getNextTier(loyalty.tier)]?.minSpending;
    const spendingToNextTier = nextTierSpending ? nextTierSpending - loyalty.lifetimeSpending : 0;

    return (
        <div className={`bg-gradient-to-br ${getTierGradient(loyalty.tier)} rounded-lg shadow-lg p-6 text-white`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    <span className="font-semibold text-lg">{program.name}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(loyalty.tier)} border`}>
                    {loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)}
                </div>
            </div>

            {/* Points Balance */}
            <div className="mb-4">
                <div className="text-3xl font-bold mb-1">
                    {loyalty.points.toLocaleString()} <span className="text-lg">points</span>
                </div>
                <div className="text-sm opacity-90">
                    Worth up to ${maxDiscount.toFixed(2)} off
                </div>
            </div>

            {/* Tier Progress */}
            {spendingToNextTier > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1 opacity-90">
                        <span>Progress to {getNextTier(loyalty.tier)}</span>
                        <span>${spendingToNextTier.toFixed(0)} to go</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
                        <div
                            className="bg-white rounded-full h-2 transition-all"
                            style={{
                                width: `${Math.min(100, (loyalty.lifetimeSpending / nextTierSpending) * 100)}%`
                            }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-white bg-opacity-20 rounded p-3">
                    <div className="opacity-90 mb-1">Lifetime Points</div>
                    <div className="font-bold">{loyalty.lifetimePoints.toLocaleString()}</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded p-3">
                    <div className="opacity-90 mb-1">Lifetime Spending</div>
                    <div className="font-bold">${loyalty.lifetimeSpending.toFixed(0)}</div>
                </div>
            </div>

            {/* Tier Multiplier */}
            {loyalty.tierMultiplier > 1 && (
                <div className="bg-white bg-opacity-20 rounded p-3 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">
                        Earning <strong>{loyalty.tierMultiplier}x</strong> points on purchases
                    </span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {loyalty.points >= program.minPointsToRedeem ? (
                    <button
                        onClick={() => setShowRedeemDialog(true)}
                        className="w-full bg-white text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                    >
                        <Gift className="w-5 h-5" />
                        Redeem Points
                    </button>
                ) : (
                    <div className="bg-white bg-opacity-20 rounded p-3 flex items-start gap-2 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>
                            Earn {program.minPointsToRedeem - loyalty.points} more points to redeem rewards
                        </span>
                    </div>
                )}
            </div>

            {/* Redeem Dialog */}
            {showRedeemDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Redeem Points
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Points to Redeem
                            </label>
                            <input
                                type="number"
                                value={redeemPoints}
                                onChange={(e) => setRedeemPoints(e.target.value)}
                                min={program.minPointsToRedeem}
                                max={Math.min(loyalty.points, program.maxPointsPerTransaction)}
                                step={program.pointsPerUnit}
                                placeholder={`Min: ${program.minPointsToRedeem}`}
                                className="w-full px-4 py-2 border rounded-lg text-gray-900 dark:text-white dark:bg-gray-700"
                            />
                            {redeemPoints && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    Discount: ${(parseInt(redeemPoints) / program.pointsPerUnit).toFixed(2)}
                                </p>
                            )}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-4 text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex justify-between mb-1">
                                <span>Available Points:</span>
                                <span className="font-medium">{loyalty.points}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Minimum Required:</span>
                                <span className="font-medium">{program.minPointsToRedeem}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Max per Transaction:</span>
                                <span className="font-medium">{program.maxPointsPerTransaction}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRedeemDialog(false);
                                    setRedeemPoints('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRedeem}
                                disabled={!redeemPoints || parseInt(redeemPoints) < program.minPointsToRedeem}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Redeem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper function to get next tier
function getNextTier(currentTier) {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex < tiers.length - 1) {
        return tiers[currentIndex + 1];
    }
    return null;
}

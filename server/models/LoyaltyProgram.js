/**
 * @fileoverview Loyalty Program Model
 *
 * Stores loyalty program configuration per store
 */

import mongoose from 'mongoose';

const loyaltyProgramSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        unique: true // One program per store
    },
    name: {
        type: String,
        required: true,
        default: 'Rewards Program'
    },
    description: {
        type: String,
        default: 'Earn points on every purchase!'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Points configuration
    pointsPerDollar: {
        type: Number,
        default: 1,
        min: 0
    },
    pointsPerUnit: {
        type: Number,
        default: 10, // 10 points = $1 discount
        min: 1
    },
    minPointsToRedeem: {
        type: Number,
        default: 100,
        min: 0
    },
    maxPointsPerTransaction: {
        type: Number,
        default: 1000, // Max points that can be redeemed at once
        min: 0
    },
    // Expiration
    pointsExpirationDays: {
        type: Number,
        default: 365, // Points expire after 1 year
        min: 0 // 0 = never expire
    },
    // Tiers
    tiers: {
        bronze: {
            name: { type: String, default: 'Bronze' },
            minSpending: { type: Number, default: 0 },
            multiplier: { type: Number, default: 1 },
            benefits: [String]
        },
        silver: {
            name: { type: String, default: 'Silver' },
            minSpending: { type: Number, default: 500 },
            multiplier: { type: Number, default: 1.5 },
            benefits: [String]
        },
        gold: {
            name: { type: String, default: 'Gold' },
            minSpending: { type: Number, default: 1000 },
            multiplier: { type: Number, default: 2 },
            benefits: [String]
        },
        platinum: {
            name: { type: String, default: 'Platinum' },
            minSpending: { type: Number, default: 5000 },
            multiplier: { type: Number, default: 3 },
            benefits: [String]
        }
    },
    // Special rewards
    birthdayBonus: {
        enabled: { type: Boolean, default: true },
        points: { type: Number, default: 100 }
    },
    referralBonus: {
        enabled: { type: Boolean, default: true },
        referrerPoints: { type: Number, default: 500 },
        referredPoints: { type: Number, default: 200 }
    },
    // Settings
    settings: {
        allowNegativeBalance: { type: Boolean, default: false },
        autoApplyDiscount: { type: Boolean, default: false },
        notifyOnEarn: { type: Boolean, default: true },
        notifyOnExpire: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Calculate points for a purchase amount
loyaltyProgramSchema.methods.calculatePoints = function(amount, tierMultiplier = 1) {
    return Math.floor(amount * this.pointsPerDollar * tierMultiplier);
};

// Calculate discount value for points
loyaltyProgramSchema.methods.calculateDiscount = function(points) {
    return points / this.pointsPerUnit;
};

// Check if points amount can be redeemed
loyaltyProgramSchema.methods.canRedeem = function(points) {
    return points >= this.minPointsToRedeem;
};

// Get tier based on lifetime spending
loyaltyProgramSchema.methods.getTierForSpending = function(lifetimeSpending) {
    if (lifetimeSpending >= this.tiers.platinum.minSpending) {
        return { name: 'platinum', ...this.tiers.platinum };
    } else if (lifetimeSpending >= this.tiers.gold.minSpending) {
        return { name: 'gold', ...this.tiers.gold };
    } else if (lifetimeSpending >= this.tiers.silver.minSpending) {
        return { name: 'silver', ...this.tiers.silver };
    } else {
        return { name: 'bronze', ...this.tiers.bronze };
    }
};

// Index for store lookup
loyaltyProgramSchema.index({ storeId: 1 });

const LoyaltyProgram = mongoose.model('LoyaltyProgram', loyaltyProgramSchema);

export default LoyaltyProgram;

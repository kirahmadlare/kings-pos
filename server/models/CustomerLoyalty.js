/**
 * @fileoverview Customer Loyalty Model
 *
 * Tracks loyalty points and tier for each customer
 */

import mongoose from 'mongoose';

const customerLoyaltySchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoyaltyProgram',
        required: true
    },
    // Points
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimePoints: {
        type: Number,
        default: 0,
        min: 0
    },
    lifetimeSpending: {
        type: Number,
        default: 0,
        min: 0
    },
    // Tier
    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze'
    },
    tierMultiplier: {
        type: Number,
        default: 1
    },
    // Dates
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastActivityAt: {
        type: Date,
        default: Date.now
    },
    lastTierUpgradeAt: {
        type: Date
    },
    // Birthday reward
    birthdayRewardClaimed: {
        type: Boolean,
        default: false
    },
    lastBirthdayRewardAt: {
        type: Date
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for customer + store (unique)
customerLoyaltySchema.index({ customerId: 1, storeId: 1 }, { unique: true });
customerLoyaltySchema.index({ storeId: 1, tier: 1 });
customerLoyaltySchema.index({ storeId: 1, points: -1 });

// Method to earn points
customerLoyaltySchema.methods.earnPoints = function(amount) {
    this.points += amount;
    this.lifetimePoints += amount;
    this.lastActivityAt = new Date();
};

// Method to redeem points
customerLoyaltySchema.methods.redeemPoints = function(amount) {
    if (this.points < amount) {
        throw new Error('Insufficient points');
    }
    this.points -= amount;
    this.lastActivityAt = new Date();
};

// Method to add spending
customerLoyaltySchema.methods.addSpending = function(amount) {
    this.lifetimeSpending += amount;
};

// Method to update tier
customerLoyaltySchema.methods.updateTier = function(newTier, multiplier) {
    if (this.tier !== newTier) {
        this.tier = newTier;
        this.tierMultiplier = multiplier;
        this.lastTierUpgradeAt = new Date();
    }
};

// Method to check if birthday reward can be claimed
customerLoyaltySchema.methods.canClaimBirthdayReward = function() {
    if (this.birthdayRewardClaimed) {
        // Check if it's a new year
        const lastClaim = this.lastBirthdayRewardAt;
        if (lastClaim) {
            const now = new Date();
            return now.getFullYear() > lastClaim.getFullYear();
        }
    }
    return !this.birthdayRewardClaimed;
};

// Method to claim birthday reward
customerLoyaltySchema.methods.claimBirthdayReward = function() {
    this.birthdayRewardClaimed = true;
    this.lastBirthdayRewardAt = new Date();
};

const CustomerLoyalty = mongoose.model('CustomerLoyalty', customerLoyaltySchema);

export default CustomerLoyalty;

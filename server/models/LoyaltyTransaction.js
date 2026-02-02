/**
 * @fileoverview Loyalty Transaction Model
 *
 * Tracks all loyalty points transactions (earn/redeem)
 */

import mongoose from 'mongoose';

const loyaltyTransactionSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerLoyaltyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerLoyalty',
        required: true
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    // Transaction details
    type: {
        type: String,
        enum: ['earn', 'redeem', 'expire', 'adjust', 'bonus', 'birthday', 'referral'],
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    balanceBefore: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    // For redemptions
    discountAmount: {
        type: Number,
        default: 0
    },
    // Description
    description: {
        type: String
    },
    notes: {
        type: String
    },
    // Expiration
    expiresAt: {
        type: Date
    },
    // Metadata
    metadata: {
        tier: String,
        tierMultiplier: Number,
        purchaseAmount: Number,
        reason: String
    }
}, {
    timestamps: true
});

// Indexes for queries
loyaltyTransactionSchema.index({ customerId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ storeId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ customerLoyaltyId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ saleId: 1 });
loyaltyTransactionSchema.index({ type: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ expiresAt: 1 }, { sparse: true });

// Virtual for formatted description
loyaltyTransactionSchema.virtual('formattedDescription').get(function() {
    switch (this.type) {
        case 'earn':
            return `Earned ${this.points} points from purchase`;
        case 'redeem':
            return `Redeemed ${this.points} points for $${this.discountAmount.toFixed(2)} discount`;
        case 'expire':
            return `${this.points} points expired`;
        case 'bonus':
            return `Bonus: ${this.description || 'Special reward'}`;
        case 'birthday':
            return `Birthday reward: ${this.points} points`;
        case 'referral':
            return `Referral bonus: ${this.points} points`;
        case 'adjust':
            return `Manual adjustment: ${this.description || 'Points adjusted'}`;
        default:
            return this.description || 'Loyalty transaction';
    }
});

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

export default LoyaltyTransaction;

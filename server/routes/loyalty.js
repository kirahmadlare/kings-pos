/**
 * @fileoverview Loyalty Program Routes
 *
 * Handles loyalty program configuration, customer loyalty status,
 * point transactions, and loyalty analytics
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { cacheMiddleware, TTL } from '../middleware/cache.js';
import { LoyaltyProgram, CustomerLoyalty, LoyaltyTransaction } from '../models/index.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import cacheService from '../services/cacheService.js';

const router = express.Router();

// ==================== LOYALTY PROGRAM CONFIGURATION ====================

/**
 * GET /api/loyalty/program
 * Get loyalty program configuration for current store
 */
router.get('/program',
    authenticate,
    cacheMiddleware({ ttl: TTL.LONG, keyGenerator: (req) => `loyalty:program:${req.storeId}` }),
    asyncHandler(async (req, res) => {
        let program = await LoyaltyProgram.findOne({ storeId: req.storeId });

        // Create default program if none exists
        if (!program) {
            program = await LoyaltyProgram.create({
                storeId: req.storeId,
                name: 'Rewards Program',
                description: 'Earn points on every purchase!'
            });
        }

        res.json(program);
    })
);

/**
 * POST /api/loyalty/program
 * Create or update loyalty program configuration
 */
router.post('/program',
    authenticate,
    asyncHandler(async (req, res) => {
        const { name, description, pointsPerDollar, pointsPerUnit, minPointsToRedeem,
                maxPointsPerTransaction, pointsExpirationDays, tiers, birthdayBonus,
                referralBonus, settings, isActive } = req.body;

        let program = await LoyaltyProgram.findOne({ storeId: req.storeId });

        if (program) {
            // Update existing program
            Object.assign(program, {
                name: name || program.name,
                description: description || program.description,
                pointsPerDollar: pointsPerDollar ?? program.pointsPerDollar,
                pointsPerUnit: pointsPerUnit ?? program.pointsPerUnit,
                minPointsToRedeem: minPointsToRedeem ?? program.minPointsToRedeem,
                maxPointsPerTransaction: maxPointsPerTransaction ?? program.maxPointsPerTransaction,
                pointsExpirationDays: pointsExpirationDays ?? program.pointsExpirationDays,
                tiers: tiers || program.tiers,
                birthdayBonus: birthdayBonus || program.birthdayBonus,
                referralBonus: referralBonus || program.referralBonus,
                settings: settings || program.settings,
                isActive: isActive ?? program.isActive
            });

            await program.save();
        } else {
            // Create new program
            program = await LoyaltyProgram.create({
                storeId: req.storeId,
                name, description, pointsPerDollar, pointsPerUnit,
                minPointsToRedeem, maxPointsPerTransaction, pointsExpirationDays,
                tiers, birthdayBonus, referralBonus, settings, isActive
            });
        }

        // Invalidate cache
        await cacheService.invalidate(`loyalty:program:${req.storeId}`);

        res.json(program);
    })
);

// ==================== CUSTOMER LOYALTY STATUS ====================

/**
 * GET /api/loyalty/customer/:customerId
 * Get customer's loyalty status
 */
router.get('/customer/:customerId',
    authenticate,
    cacheMiddleware({ ttl: TTL.SHORT, keyGenerator: (req) => `loyalty:customer:${req.params.customerId}` }),
    asyncHandler(async (req, res) => {
        const { customerId } = req.params;

        // Get program first
        const program = await LoyaltyProgram.findOne({ storeId: req.storeId });
        if (!program || !program.isActive) {
            throw new ValidationError('Loyalty program is not active for this store');
        }

        let loyalty = await CustomerLoyalty.findOne({
            customerId,
            storeId: req.storeId
        }).populate('customerId', 'firstName lastName phone email');

        // Create loyalty record if doesn't exist
        if (!loyalty) {
            loyalty = await CustomerLoyalty.create({
                customerId,
                storeId: req.storeId,
                programId: program._id,
                points: 0,
                lifetimePoints: 0,
                lifetimeSpending: 0,
                tier: 'bronze',
                tierMultiplier: 1
            });

            await loyalty.populate('customerId', 'firstName lastName phone email');
        }

        // Include program details for context
        const response = {
            ...loyalty.toObject(),
            program: {
                name: program.name,
                pointsPerDollar: program.pointsPerDollar,
                pointsPerUnit: program.pointsPerUnit,
                minPointsToRedeem: program.minPointsToRedeem,
                tiers: program.tiers
            }
        };

        res.json(response);
    })
);

/**
 * GET /api/loyalty/customers
 * Get all loyalty customers for store with filtering
 */
router.get('/customers',
    authenticate,
    asyncHandler(async (req, res) => {
        const { tier, minPoints, sortBy = 'points', order = 'desc', page = 1, limit = 50 } = req.query;

        const query = { storeId: req.storeId, isActive: true };

        if (tier) query.tier = tier;
        if (minPoints) query.points = { $gte: parseInt(minPoints) };

        const skip = (page - 1) * limit;
        const sortOrder = order === 'desc' ? -1 : 1;

        const [customers, total] = await Promise.all([
            CustomerLoyalty.find(query)
                .populate('customerId', 'firstName lastName phone email')
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(parseInt(limit)),
            CustomerLoyalty.countDocuments(query)
        ]);

        res.json({
            customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    })
);

// ==================== POINT TRANSACTIONS ====================

/**
 * POST /api/loyalty/earn
 * Earn points from a purchase
 */
router.post('/earn',
    authenticate,
    asyncHandler(async (req, res) => {
        const { customerId, saleId, purchaseAmount } = req.body;

        if (!customerId || !purchaseAmount) {
            throw new ValidationError('customerId and purchaseAmount are required');
        }

        // Get program
        const program = await LoyaltyProgram.findOne({ storeId: req.storeId });
        if (!program || !program.isActive) {
            throw new ValidationError('Loyalty program is not active');
        }

        // Get or create customer loyalty
        let loyalty = await CustomerLoyalty.findOne({ customerId, storeId: req.storeId });
        if (!loyalty) {
            loyalty = await CustomerLoyalty.create({
                customerId,
                storeId: req.storeId,
                programId: program._id,
                points: 0,
                lifetimePoints: 0,
                lifetimeSpending: 0,
                tier: 'bronze',
                tierMultiplier: 1
            });
        }

        // Calculate points
        const pointsEarned = program.calculatePoints(purchaseAmount, loyalty.tierMultiplier);
        const balanceBefore = loyalty.points;

        // Update loyalty
        loyalty.earnPoints(pointsEarned);
        loyalty.addSpending(purchaseAmount);

        // Check for tier upgrade
        const newTier = program.getTierForSpending(loyalty.lifetimeSpending);
        if (newTier.name !== loyalty.tier) {
            loyalty.updateTier(newTier.name, newTier.multiplier);
        }

        await loyalty.save();

        // Create transaction
        const transaction = await LoyaltyTransaction.create({
            customerId,
            customerLoyaltyId: loyalty._id,
            storeId: req.storeId,
            saleId,
            type: 'earn',
            points: pointsEarned,
            balanceBefore,
            balanceAfter: loyalty.points,
            metadata: {
                tier: loyalty.tier,
                tierMultiplier: loyalty.tierMultiplier,
                purchaseAmount
            }
        });

        // Set expiration date if configured
        if (program.pointsExpirationDays > 0) {
            transaction.expiresAt = new Date(Date.now() + program.pointsExpirationDays * 24 * 60 * 60 * 1000);
            await transaction.save();
        }

        // Invalidate cache
        await cacheService.invalidate(`loyalty:customer:${customerId}`);

        res.json({
            loyalty,
            transaction,
            message: `Earned ${pointsEarned} points! Current tier: ${loyalty.tier}`
        });
    })
);

/**
 * POST /api/loyalty/redeem
 * Redeem points for discount
 */
router.post('/redeem',
    authenticate,
    asyncHandler(async (req, res) => {
        const { customerId, points, saleId } = req.body;

        if (!customerId || !points) {
            throw new ValidationError('customerId and points are required');
        }

        // Get program
        const program = await LoyaltyProgram.findOne({ storeId: req.storeId });
        if (!program || !program.isActive) {
            throw new ValidationError('Loyalty program is not active');
        }

        // Validate points amount
        if (points < program.minPointsToRedeem) {
            throw new ValidationError(`Minimum ${program.minPointsToRedeem} points required to redeem`);
        }

        if (points > program.maxPointsPerTransaction) {
            throw new ValidationError(`Maximum ${program.maxPointsPerTransaction} points can be redeemed per transaction`);
        }

        // Get customer loyalty
        const loyalty = await CustomerLoyalty.findOne({ customerId, storeId: req.storeId });
        if (!loyalty) {
            throw new NotFoundError('Customer loyalty record not found');
        }

        // Check sufficient balance
        if (loyalty.points < points) {
            throw new ValidationError('Insufficient points balance');
        }

        // Calculate discount
        const discountAmount = program.calculateDiscount(points);
        const balanceBefore = loyalty.points;

        // Redeem points
        loyalty.redeemPoints(points);
        await loyalty.save();

        // Create transaction
        const transaction = await LoyaltyTransaction.create({
            customerId,
            customerLoyaltyId: loyalty._id,
            storeId: req.storeId,
            saleId,
            type: 'redeem',
            points: -points, // Negative for redemption
            balanceBefore,
            balanceAfter: loyalty.points,
            discountAmount,
            description: `Redeemed ${points} points for $${discountAmount.toFixed(2)} discount`
        });

        // Invalidate cache
        await cacheService.invalidate(`loyalty:customer:${customerId}`);

        res.json({
            loyalty,
            transaction,
            discountAmount,
            message: `Redeemed ${points} points for $${discountAmount.toFixed(2)} discount`
        });
    })
);

/**
 * POST /api/loyalty/adjust
 * Manual points adjustment (admin/owner only)
 */
router.post('/adjust',
    authenticate,
    asyncHandler(async (req, res) => {
        const { customerId, points, reason } = req.body;

        if (!customerId || points === undefined) {
            throw new ValidationError('customerId and points are required');
        }

        const loyalty = await CustomerLoyalty.findOne({ customerId, storeId: req.storeId });
        if (!loyalty) {
            throw new NotFoundError('Customer loyalty record not found');
        }

        const balanceBefore = loyalty.points;

        // Apply adjustment
        if (points > 0) {
            loyalty.earnPoints(points);
        } else {
            loyalty.redeemPoints(Math.abs(points));
        }

        await loyalty.save();

        // Create transaction
        const transaction = await LoyaltyTransaction.create({
            customerId,
            customerLoyaltyId: loyalty._id,
            storeId: req.storeId,
            type: 'adjust',
            points,
            balanceBefore,
            balanceAfter: loyalty.points,
            description: reason || 'Manual adjustment',
            metadata: { reason }
        });

        // Invalidate cache
        await cacheService.invalidate(`loyalty:customer:${customerId}`);

        res.json({
            loyalty,
            transaction,
            message: `Adjusted points by ${points}`
        });
    })
);

/**
 * POST /api/loyalty/birthday
 * Claim birthday reward
 */
router.post('/birthday',
    authenticate,
    asyncHandler(async (req, res) => {
        const { customerId } = req.body;

        if (!customerId) {
            throw new ValidationError('customerId is required');
        }

        // Get program
        const program = await LoyaltyProgram.findOne({ storeId: req.storeId });
        if (!program || !program.isActive || !program.birthdayBonus.enabled) {
            throw new ValidationError('Birthday rewards are not enabled');
        }

        const loyalty = await CustomerLoyalty.findOne({ customerId, storeId: req.storeId });
        if (!loyalty) {
            throw new NotFoundError('Customer loyalty record not found');
        }

        // Check if can claim
        if (!loyalty.canClaimBirthdayReward()) {
            throw new ValidationError('Birthday reward already claimed this year');
        }

        const balanceBefore = loyalty.points;
        const points = program.birthdayBonus.points;

        // Award points
        loyalty.earnPoints(points);
        loyalty.claimBirthdayReward();
        await loyalty.save();

        // Create transaction
        const transaction = await LoyaltyTransaction.create({
            customerId,
            customerLoyaltyId: loyalty._id,
            storeId: req.storeId,
            type: 'birthday',
            points,
            balanceBefore,
            balanceAfter: loyalty.points,
            description: `Birthday reward: ${points} points`
        });

        // Invalidate cache
        await cacheService.invalidate(`loyalty:customer:${customerId}`);

        res.json({
            loyalty,
            transaction,
            message: `Happy Birthday! ${points} points added to your account`
        });
    })
);

// ==================== TRANSACTION HISTORY ====================

/**
 * GET /api/loyalty/transactions/:customerId
 * Get transaction history for a customer
 */
router.get('/transactions/:customerId',
    authenticate,
    asyncHandler(async (req, res) => {
        const { customerId } = req.params;
        const { type, startDate, endDate, page = 1, limit = 50 } = req.query;

        const query = {
            customerId,
            storeId: req.storeId
        };

        if (type) query.type = type;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            LoyaltyTransaction.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            LoyaltyTransaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    })
);

// ==================== ANALYTICS ====================

/**
 * GET /api/loyalty/stats
 * Get loyalty program statistics
 */
router.get('/stats',
    authenticate,
    cacheMiddleware({ ttl: TTL.MEDIUM, keyGenerator: (req) => `loyalty:stats:${req.storeId}` }),
    asyncHandler(async (req, res) => {
        const [
            totalMembers,
            activeMembers,
            totalPointsIssued,
            totalPointsRedeemed,
            tierBreakdown,
            recentTransactions
        ] = await Promise.all([
            CustomerLoyalty.countDocuments({ storeId: req.storeId }),
            CustomerLoyalty.countDocuments({ storeId: req.storeId, isActive: true }),
            LoyaltyTransaction.aggregate([
                { $match: { storeId: req.storeId, type: 'earn' } },
                { $group: { _id: null, total: { $sum: '$points' } } }
            ]),
            LoyaltyTransaction.aggregate([
                { $match: { storeId: req.storeId, type: 'redeem' } },
                { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
            ]),
            CustomerLoyalty.aggregate([
                { $match: { storeId: req.storeId } },
                { $group: { _id: '$tier', count: { $sum: 1 }, avgPoints: { $avg: '$points' } } }
            ]),
            LoyaltyTransaction.find({ storeId: req.storeId })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('customerId', 'firstName lastName')
        ]);

        const stats = {
            overview: {
                totalMembers,
                activeMembers,
                totalPointsIssued: totalPointsIssued[0]?.total || 0,
                totalPointsRedeemed: totalPointsRedeemed[0]?.total || 0,
                redemptionRate: totalPointsIssued[0]?.total
                    ? ((totalPointsRedeemed[0]?.total || 0) / totalPointsIssued[0].total * 100).toFixed(2)
                    : 0
            },
            tiers: tierBreakdown.reduce((acc, tier) => {
                acc[tier._id] = {
                    count: tier.count,
                    avgPoints: Math.round(tier.avgPoints)
                };
                return acc;
            }, {}),
            recentActivity: recentTransactions
        };

        res.json(stats);
    })
);

/**
 * GET /api/loyalty/top-customers
 * Get top loyalty customers
 */
router.get('/top-customers',
    authenticate,
    asyncHandler(async (req, res) => {
        const { limit = 10, sortBy = 'points' } = req.query;

        const customers = await CustomerLoyalty.find({ storeId: req.storeId, isActive: true })
            .populate('customerId', 'firstName lastName phone email')
            .sort({ [sortBy]: -1 })
            .limit(parseInt(limit));

        res.json(customers);
    })
);

export default router;

/**
 * @fileoverview Customer Portal Routes
 *
 * API endpoints for customer self-service portal
 */

import express from 'express';
import { Customer, Sale, Credit } from '../models/index.js';
import {
    authenticateCustomer,
    generateOTP,
    storeOTP,
    verifyOTP,
    sendOTP,
    generateCustomerToken
} from '../middleware/customerAuth.js';

const router = express.Router();

/**
 * POST /api/customer-portal/request-otp
 * Request OTP for login
 */
router.post('/request-otp', async (req, res) => {
    try {
        const { identifier } = req.body; // email or phone

        if (!identifier) {
            return res.status(400).json({ error: 'Email or phone number required' });
        }

        // Find customer by email or phone
        const customer = await Customer.findOne({
            $or: [
                { email: identifier },
                { phone: identifier }
            ]
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Generate OTP
        const otp = generateOTP();

        // Store OTP
        storeOTP(identifier, otp);

        // Send OTP (email or SMS based on identifier)
        const method = identifier.includes('@') ? 'email' : 'sms';
        await sendOTP(identifier, otp, method);

        res.json({
            message: 'OTP sent successfully',
            method,
            // In development, include OTP for testing
            ...(process.env.NODE_ENV === 'development' && { otp })
        });
    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

/**
 * POST /api/customer-portal/verify-otp
 * Verify OTP and login
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { identifier, otp } = req.body;

        if (!identifier || !otp) {
            return res.status(400).json({ error: 'Identifier and OTP required' });
        }

        // Verify OTP
        const isValid = verifyOTP(identifier, otp);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        // Get customer
        const customer = await Customer.findOne({
            $or: [
                { email: identifier },
                { phone: identifier }
            ]
        }).populate('storeId', 'name');

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Generate token
        const token = generateCustomerToken(customer);

        res.json({
            token,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                loyaltyPoints: customer.loyaltyPoints,
                totalSpent: customer.totalSpent,
                storeName: customer.storeId?.name
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

/**
 * GET /api/customer-portal/profile
 * Get customer profile
 */
router.get('/profile', authenticateCustomer, async (req, res) => {
    try {
        const customer = await Customer.findById(req.customerId)
            .populate('storeId', 'name address phone email');

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            loyaltyPoints: customer.loyaltyPoints,
            totalSpent: customer.totalSpent,
            purchaseCount: customer.purchaseCount,
            vipStatus: customer.vipStatus,
            joinedDate: customer.createdAt,
            store: customer.storeId
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PUT /api/customer-portal/profile
 * Update customer profile
 */
router.put('/profile', authenticateCustomer, async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;

        const customer = await Customer.findById(req.customerId);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Update allowed fields
        if (name) customer.name = name;
        if (email) customer.email = email;
        if (phone) customer.phone = phone;
        if (address) customer.address = address;

        await customer.save();

        res.json({
            message: 'Profile updated successfully',
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * GET /api/customer-portal/orders
 * Get customer order history
 */
router.get('/orders', authenticateCustomer, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const query = {
            customerId: req.customerId,
            status: { $ne: 'voided' }
        };

        if (status) {
            query.status = status;
        }

        const sales = await Sale.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('employeeId', 'name')
            .select('-__v');

        const total = await Sale.countDocuments(query);

        res.json({
            orders: sales,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

/**
 * GET /api/customer-portal/orders/:id
 * Get order details
 */
router.get('/orders/:id', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;

        const sale = await Sale.findOne({
            _id: id,
            customerId: req.customerId
        })
            .populate('employeeId', 'name')
            .populate('items.productId', 'name sku');

        if (!sale) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(sale);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * GET /api/customer-portal/credits
 * Get customer credit balance and history
 */
router.get('/credits', authenticateCustomer, async (req, res) => {
    try {
        const credits = await Credit.find({
            customerId: req.customerId
        })
            .sort({ createdAt: -1 })
            .populate('saleId', 'total createdAt');

        const totalBalance = credits.reduce((sum, credit) => sum + credit.balance, 0);
        const totalAmount = credits.reduce((sum, credit) => sum + credit.amount, 0);
        const totalPaid = credits.reduce((sum, credit) => sum + credit.paidAmount, 0);

        res.json({
            totalBalance,
            totalAmount,
            totalPaid,
            credits: credits.map(c => ({
                id: c._id,
                amount: c.amount,
                balance: c.balance,
                paidAmount: c.paidAmount,
                status: c.status,
                dueDate: c.dueDate,
                createdAt: c.createdAt,
                sale: c.saleId,
                payments: c.payments
            }))
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ error: 'Failed to fetch credits' });
    }
});

/**
 * POST /api/customer-portal/credits/:id/pay
 * Make a payment on credit
 */
router.post('/credits/:id/pay', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, paymentMethod, reference } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        const credit = await Credit.findOne({
            _id: id,
            customerId: req.customerId
        });

        if (!credit) {
            return res.status(404).json({ error: 'Credit not found' });
        }

        if (credit.status === 'paid') {
            return res.status(400).json({ error: 'Credit already paid' });
        }

        if (amount > credit.balance) {
            return res.status(400).json({ error: 'Payment amount exceeds balance' });
        }

        // Record payment
        credit.payments.push({
            amount,
            method: paymentMethod || 'online',
            date: new Date(),
            reference: reference || `PORTAL-${Date.now()}`
        });

        credit.paidAmount += amount;
        credit.balance -= amount;

        if (credit.balance === 0) {
            credit.status = 'paid';
        } else {
            credit.status = 'partial';
        }

        await credit.save();

        res.json({
            message: 'Payment recorded successfully',
            credit: {
                id: credit._id,
                balance: credit.balance,
                paidAmount: credit.paidAmount,
                status: credit.status
            }
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

/**
 * GET /api/customer-portal/stats
 * Get customer statistics
 */
router.get('/stats', authenticateCustomer, async (req, res) => {
    try {
        const customer = await Customer.findById(req.customerId);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Get recent orders count
        const recentOrders = await Sale.countDocuments({
            customerId: req.customerId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: 'completed'
        });

        // Get pending credits
        const pendingCredits = await Credit.aggregate([
            {
                $match: {
                    customerId: customer._id,
                    status: { $in: ['pending', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$balance' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            totalSpent: customer.totalSpent || 0,
            purchaseCount: customer.purchaseCount || 0,
            loyaltyPoints: customer.loyaltyPoints || 0,
            vipStatus: customer.vipStatus || false,
            recentOrders,
            pendingCredits: {
                balance: pendingCredits[0]?.totalBalance || 0,
                count: pendingCredits[0]?.count || 0
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;

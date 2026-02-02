/**
 * @fileoverview Loyalty Points Plugin Example
 *
 * Awards loyalty points on sales and provides points management
 */

export default {
    name: 'loyalty-points',
    version: '1.0.0',
    author: 'King\'s POS',
    description: 'Award loyalty points based on purchase amount',

    /**
     * Plugin initialization
     */
    async onInstall(api) {
        api.log('info', 'Installing Loyalty Points plugin');

        // Create loyalty points table
        await api.createTable('points', {
            customerId: {
                type: 'ObjectId',
                ref: 'Customer',
                required: true
            },
            points: {
                type: Number,
                default: 0
            },
            transactions: [{
                amount: Number,
                saleId: String,
                type: { type: String, enum: ['earned', 'redeemed'] },
                date: Date
            }]
        });

        // Set default configuration
        await api.setConfig('pointsPerDollar', 1);
        await api.setConfig('redemptionRate', 100); // 100 points = $1

        api.log('info', 'Loyalty Points plugin installed successfully');
    },

    /**
     * Called when plugin is activated
     */
    async onActivate(api) {
        api.log('info', 'Loyalty Points plugin activated');
    },

    /**
     * Called when plugin is deactivated
     */
    async onDeactivate(api) {
        api.log('info', 'Loyalty Points plugin deactivated');
    },

    /**
     * Called on plugin uninstall
     */
    async onUninstall(api) {
        api.log('info', 'Uninstalling Loyalty Points plugin');
        // Cleanup can be done here
    },

    /**
     * Hook handlers
     */
    hooks: {
        /**
         * Award points when sale is completed
         */
        async 'sale.created'(api, sale) {
            if (sale.status !== 'completed' || !sale.customerId) {
                return; // Only award points for completed sales with customers
            }

            const pointsPerDollar = api.getConfig('pointsPerDollar') || 1;
            const pointsEarned = Math.floor(sale.total * pointsPerDollar);

            // Get or create points record
            const pointsRecord = await api.getData(`customer_${sale.customerId}_points`) || {
                customerId: sale.customerId,
                points: 0,
                transactions: []
            };

            // Add points
            pointsRecord.points += pointsEarned;
            pointsRecord.transactions.push({
                amount: pointsEarned,
                saleId: sale._id.toString(),
                type: 'earned',
                date: new Date()
            });

            // Save
            await api.setData(`customer_${sale.customerId}_points`, pointsRecord);

            // Notify customer
            api.emit('points-earned', {
                customerId: sale.customerId,
                points: pointsEarned,
                newBalance: pointsRecord.points
            });

            api.log('info', `Awarded ${pointsEarned} points to customer ${sale.customerId}`);
        }
    },

    /**
     * Custom API routes
     */
    routes: [
        {
            method: 'GET',
            path: '/points/:customerId',
            handler: 'getCustomerPoints'
        },
        {
            method: 'POST',
            path: '/points/:customerId/redeem',
            handler: 'redeemPoints'
        }
    ],

    /**
     * Route handlers
     */
    async getCustomerPoints(api, req, res) {
        const { customerId } = req.params;

        const pointsRecord = await api.getData(`customer_${customerId}_points`) || {
            customerId,
            points: 0,
            transactions: []
        };

        return pointsRecord;
    },

    async redeemPoints(api, req, res) {
        const { customerId } = req.params;
        const { points } = req.body;

        if (!points || points <= 0) {
            return res.status(400).json({ error: 'Invalid points amount' });
        }

        const pointsRecord = await api.getData(`customer_${customerId}_points`);

        if (!pointsRecord || pointsRecord.points < points) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Redeem points
        pointsRecord.points -= points;
        pointsRecord.transactions.push({
            amount: -points,
            type: 'redeemed',
            date: new Date()
        });

        await api.setData(`customer_${customerId}_points`, pointsRecord);

        // Calculate discount value
        const redemptionRate = api.getConfig('redemptionRate') || 100;
        const discountValue = points / redemptionRate;

        api.emit('points-redeemed', {
            customerId,
            points,
            discountValue,
            newBalance: pointsRecord.points
        });

        return {
            success: true,
            pointsRedeemed: points,
            discountValue,
            newBalance: pointsRecord.points
        };
    },

    /**
     * UI Components
     */
    components: {
        'POS.AfterCheckout': function LoyaltyPointsDisplay(props) {
            // This would be a React component
            // For now, just return component definition
            return {
                name: 'LoyaltyPointsDisplay',
                props: ['sale', 'customer'],
                render: 'Display points earned after checkout'
            };
        },

        'Customer.Profile': function PointsBalance(props) {
            return {
                name: 'PointsBalance',
                props: ['customer'],
                render: 'Display customer loyalty points balance'
            };
        }
    }
};

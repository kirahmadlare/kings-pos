/**
 * @fileoverview Plugin Routes
 *
 * API endpoints for plugin management
 */

import express from 'express';
import Plugin from '../models/Plugin.js';
import pluginManager from '../plugins/PluginManager.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/plugins
 * Get all installed plugins
 */
router.get('/', async (req, res) => {
    try {
        const { storeId, organizationId } = req;
        const { category, status } = req.query;

        const query = {
            $or: [
                { storeId },
                { organizationId }
            ]
        };

        if (category) query.category = category;
        if (status) query.status = status;

        const plugins = await Plugin.find(query)
            .sort({ installedAt: -1 })
            .populate('installedBy', 'name email');

        res.json(plugins);
    } catch (error) {
        console.error('Get plugins error:', error);
        res.status(500).json({ error: 'Failed to fetch plugins' });
    }
});

/**
 * GET /api/plugins/marketplace
 * Get available plugins from marketplace
 */
router.get('/marketplace', async (req, res) => {
    try {
        // TODO: Implement actual marketplace integration
        // For now, return sample plugins
        const marketplacePlugins = [
            {
                pluginId: 'stripe-payments',
                name: 'Stripe Payments',
                version: '1.0.0',
                author: 'King\'s POS',
                description: 'Accept credit card payments via Stripe',
                category: 'payment',
                icon: 'https://stripe.com/favicon.ico',
                price: 0,
                rating: 4.8,
                downloads: 1250,
                tags: ['payment', 'stripe', 'credit-card']
            },
            {
                pluginId: 'mailchimp-sync',
                name: 'Mailchimp Sync',
                version: '1.2.0',
                author: 'Third Party',
                description: 'Sync customers to Mailchimp automatically',
                category: 'integration',
                icon: 'https://mailchimp.com/favicon.ico',
                price: 9.99,
                rating: 4.5,
                downloads: 850,
                tags: ['email', 'marketing', 'integration']
            },
            {
                pluginId: 'advanced-analytics',
                name: 'Advanced Analytics',
                version: '2.0.0',
                author: 'Analytics Co',
                description: 'Enhanced analytics and reporting capabilities',
                category: 'analytics',
                icon: '📊',
                price: 19.99,
                rating: 4.9,
                downloads: 2100,
                tags: ['analytics', 'reports', 'insights']
            }
        ];

        res.json(marketplacePlugins);
    } catch (error) {
        console.error('Get marketplace error:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace plugins' });
    }
});

/**
 * GET /api/plugins/ui-components/:injectionPoint
 * Get UI components for an injection point
 */
router.get('/ui-components/:injectionPoint', async (req, res) => {
    try {
        const { injectionPoint } = req.params;
        const { storeId, organizationId } = req;

        const context = { storeId, organizationId };
        const components = pluginManager.getUIComponents(injectionPoint, context);

        // Return serializable data
        const componentData = components.map(c => ({
            pluginId: c.pluginId,
            pluginName: c.plugin.name,
            component: c.component.name || 'Component'
        }));

        res.json(componentData);
    } catch (error) {
        console.error('Get UI components error:', error);
        res.status(500).json({ error: 'Failed to fetch UI components' });
    }
});

/**
 * GET /api/plugins/:id
 * Get plugin details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId } = req;

        const plugin = await Plugin.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }]
        }).populate('installedBy', 'name email');

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        res.json(plugin);
    } catch (error) {
        console.error('Get plugin error:', error);
        res.status(500).json({ error: 'Failed to fetch plugin' });
    }
});

/**
 * POST /api/plugins/install
 * Install a new plugin
 */
router.post('/install', async (req, res) => {
    try {
        const { storeId, organizationId, userId } = req;
        const pluginData = req.body;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can install plugins' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        const plugin = await pluginManager.install({
            ...pluginData,
            storeId,
            organizationId,
            userId
        }, context);

        res.status(201).json(plugin);
    } catch (error) {
        console.error('Install plugin error:', error);
        res.status(500).json({ error: error.message || 'Failed to install plugin' });
    }
});

/**
 * POST /api/plugins/:id/activate
 * Activate a plugin
 */
router.post('/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId, userId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can activate plugins' });
        }

        const plugin = await Plugin.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }]
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        const activated = await pluginManager.activate(plugin.pluginId, context);

        res.json(activated);
    } catch (error) {
        console.error('Activate plugin error:', error);
        res.status(500).json({ error: error.message || 'Failed to activate plugin' });
    }
});

/**
 * POST /api/plugins/:id/deactivate
 * Deactivate a plugin
 */
router.post('/:id/deactivate', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId, userId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can deactivate plugins' });
        }

        const plugin = await Plugin.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }]
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        const deactivated = await pluginManager.deactivate(plugin.pluginId, context);

        res.json(deactivated);
    } catch (error) {
        console.error('Deactivate plugin error:', error);
        res.status(500).json({ error: error.message || 'Failed to deactivate plugin' });
    }
});

/**
 * DELETE /api/plugins/:id
 * Uninstall a plugin
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId, userId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can uninstall plugins' });
        }

        const plugin = await Plugin.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }]
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        await pluginManager.uninstall(plugin.pluginId, context);

        res.json({ message: 'Plugin uninstalled successfully' });
    } catch (error) {
        console.error('Uninstall plugin error:', error);
        res.status(500).json({ error: error.message || 'Failed to uninstall plugin' });
    }
});

/**
 * PUT /api/plugins/:id/config
 * Update plugin configuration
 */
router.put('/:id/config', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;
        const config = req.body;

        const plugin = await Plugin.findOne({ _id: id, storeId });

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        const updated = await pluginManager.updateConfig(plugin.pluginId, storeId, config);

        res.json(updated);
    } catch (error) {
        console.error('Update plugin config error:', error);
        res.status(500).json({ error: 'Failed to update plugin configuration' });
    }
});

/**
 * GET /api/plugins/:id/stats
 * Get plugin statistics
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;

        const plugin = await Plugin.findOne({ _id: id, storeId });

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        const stats = await pluginManager.getPluginStats(plugin.pluginId, storeId);

        res.json(stats);
    } catch (error) {
        console.error('Get plugin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch plugin statistics' });
    }
});

/**
 * Catch-all for plugin custom routes
 * Must be last route
 */
router.all('/:pluginId/api/*', async (req, res) => {
    try {
        const { pluginId } = req.params;
        const routePath = `/api/plugins/${pluginId}${req.path.split(`/${pluginId}`)[1]}`;

        await pluginManager.executeRoute(req, res, routePath);
    } catch (error) {
        console.error('Execute plugin route error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

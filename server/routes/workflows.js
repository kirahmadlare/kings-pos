/**
 * @fileoverview Workflow Routes
 *
 * API endpoints for workflow management and execution
 */

import express from 'express';
import Workflow from '../models/Workflow.js';
import workflowEngine from '../services/workflowEngine.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/workflows
 * Get all workflows
 */
router.get('/', async (req, res) => {
    try {
        const { storeId, organizationId } = req;
        const { triggerType, isActive } = req.query;

        const query = {
            $or: [
                { storeId },
                { organizationId }
            ],
            isDeleted: false
        };

        if (triggerType) query['trigger.type'] = triggerType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const workflows = await Workflow.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(workflows);
    } catch (error) {
        console.error('Get workflows error:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

/**
 * GET /api/workflows/:id
 * Get workflow by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId } = req;

        const workflow = await Workflow.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }],
            isDeleted: false
        }).populate('createdBy', 'name email');

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        res.json(workflow);
    } catch (error) {
        console.error('Get workflow error:', error);
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', async (req, res) => {
    try {
        const { storeId, organizationId, userId } = req;
        const workflowData = req.body;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can create workflows' });
        }

        const workflow = await Workflow.create({
            ...workflowData,
            storeId,
            organizationId,
            createdBy: userId
        });

        res.status(201).json(workflow);
    } catch (error) {
        console.error('Create workflow error:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;
        const updates = req.body;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can update workflows' });
        }

        const workflow = await Workflow.findOne({
            _id: id,
            storeId,
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Update workflow
        Object.assign(workflow, updates);
        workflow.version += 1;
        await workflow.save();

        res.json(workflow);
    } catch (error) {
        console.error('Update workflow error:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can delete workflows' });
        }

        const workflow = await Workflow.findOne({
            _id: id,
            storeId,
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        workflow.isDeleted = true;
        workflow.isActive = false;
        await workflow.save();

        res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        console.error('Delete workflow error:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});

/**
 * POST /api/workflows/:id/activate
 * Activate a workflow
 */
router.post('/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can activate workflows' });
        }

        const workflow = await Workflow.findOne({
            _id: id,
            storeId,
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        await workflow.activate();

        res.json(workflow);
    } catch (error) {
        console.error('Activate workflow error:', error);
        res.status(500).json({ error: 'Failed to activate workflow' });
    }
});

/**
 * POST /api/workflows/:id/deactivate
 * Deactivate a workflow
 */
router.post('/:id/deactivate', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId } = req;

        // Check if user is owner/admin
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can deactivate workflows' });
        }

        const workflow = await Workflow.findOne({
            _id: id,
            storeId,
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        await workflow.deactivate();

        res.json(workflow);
    } catch (error) {
        console.error('Deactivate workflow error:', error);
        res.status(500).json({ error: 'Failed to deactivate workflow' });
    }
});

/**
 * POST /api/workflows/:id/test
 * Test a workflow with sample data
 */
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId, userId } = req;
        const testData = req.body;

        const workflow = await Workflow.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }],
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        // Execute workflow
        await workflowEngine.executeWorkflow(workflow, testData, context);

        res.json({ message: 'Workflow test completed successfully' });
    } catch (error) {
        console.error('Test workflow error:', error);
        res.status(500).json({ error: error.message || 'Failed to test workflow' });
    }
});

/**
 * POST /api/workflows/:id/trigger
 * Manually trigger a workflow
 */
router.post('/:id/trigger', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId, userId } = req;
        const triggerData = req.body;

        const workflow = await Workflow.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }],
            isActive: true,
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found or not active' });
        }

        const context = {
            storeId,
            organizationId,
            userId,
            io: req.app.get('io')
        };

        // Execute workflow asynchronously
        workflowEngine.executeWorkflow(workflow, triggerData, context).catch(error => {
            console.error('Error executing workflow:', error);
        });

        res.json({ message: 'Workflow triggered successfully' });
    } catch (error) {
        console.error('Trigger workflow error:', error);
        res.status(500).json({ error: 'Failed to trigger workflow' });
    }
});

/**
 * GET /api/workflows/:id/stats
 * Get workflow execution statistics
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { storeId, organizationId } = req;

        const workflow = await Workflow.findOne({
            _id: id,
            $or: [{ storeId }, { organizationId }],
            isDeleted: false
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        res.json({
            totalExecutions: workflow.stats.totalExecutions,
            successfulExecutions: workflow.stats.successfulExecutions,
            failedExecutions: workflow.stats.failedExecutions,
            successRate: workflow.stats.totalExecutions > 0
                ? (workflow.stats.successfulExecutions / workflow.stats.totalExecutions * 100).toFixed(2)
                : 0,
            lastExecutedAt: workflow.stats.lastExecutedAt,
            lastError: workflow.stats.lastError
        });
    } catch (error) {
        console.error('Get workflow stats error:', error);
        res.status(500).json({ error: 'Failed to fetch workflow statistics' });
    }
});

/**
 * GET /api/workflows/triggers/available
 * Get list of available trigger types
 */
router.get('/triggers/available', async (req, res) => {
    try {
        const triggerTypes = [
            {
                type: 'sale.created',
                label: 'Sale Created',
                description: 'Triggered when a new sale is created',
                availableFields: ['total', 'items', 'customerId', 'employeeId', 'status']
            },
            {
                type: 'sale.completed',
                label: 'Sale Completed',
                description: 'Triggered when a sale is completed',
                availableFields: ['total', 'items', 'customerId', 'employeeId', 'paymentMethod']
            },
            {
                type: 'product.low_stock',
                label: 'Low Stock Alert',
                description: 'Triggered when product quantity falls below threshold',
                availableFields: ['name', 'sku', 'quantity', 'lowStockThreshold']
            },
            {
                type: 'customer.created',
                label: 'New Customer',
                description: 'Triggered when a new customer is created',
                availableFields: ['name', 'email', 'phone']
            },
            {
                type: 'customer.vip',
                label: 'VIP Customer',
                description: 'Triggered when customer spending crosses VIP threshold',
                availableFields: ['name', 'email', 'totalSpent', 'purchaseCount']
            },
            {
                type: 'manual',
                label: 'Manual Trigger',
                description: 'Manually triggered workflow',
                availableFields: []
            },
            {
                type: 'schedule',
                label: 'Scheduled',
                description: 'Runs on a schedule',
                availableFields: []
            }
        ];

        res.json(triggerTypes);
    } catch (error) {
        console.error('Get trigger types error:', error);
        res.status(500).json({ error: 'Failed to fetch trigger types' });
    }
});

export default router;

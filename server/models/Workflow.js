/**
 * @fileoverview Workflow Model
 *
 * Represents automated business process workflows
 */

import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
    // Basic info
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },

    // Trigger configuration
    trigger: {
        type: {
            type: String,
            enum: [
                'sale.created',
                'sale.completed',
                'sale.voided',
                'product.created',
                'product.updated',
                'product.low_stock',
                'customer.created',
                'customer.vip',
                'employee.clock_in',
                'employee.clock_out',
                'inventory.low',
                'credit.overdue',
                'manual',
                'schedule'
            ],
            required: true
        },
        // Conditions for trigger to fire
        conditions: [{
            field: String,       // e.g., 'total', 'quantity', 'totalSpent'
            operator: {
                type: String,
                enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'contains', 'not_contains', 'in', 'not_in']
            },
            value: mongoose.Schema.Types.Mixed
        }],
        // Schedule for scheduled workflows
        schedule: {
            type: {
                type: String,
                enum: ['daily', 'weekly', 'monthly', 'cron']
            },
            time: String,        // HH:mm format
            dayOfWeek: Number,   // 0-6 for weekly
            dayOfMonth: Number,  // 1-31 for monthly
            cronExpression: String,
            nextRun: Date
        }
    },

    // Actions to perform
    actions: [{
        type: {
            type: String,
            enum: ['email', 'notification', 'webhook', 'update', 'create', 'approval', 'delay', 'condition'],
            required: true
        },
        // Action configuration
        config: {
            // For email action
            to: [String],        // Email addresses or field references
            subject: String,
            body: String,
            template: String,

            // For notification action
            userId: String,      // Or field reference
            message: String,
            title: String,
            priority: String,

            // For webhook action
            url: String,
            method: String,
            headers: mongoose.Schema.Types.Mixed,
            body: mongoose.Schema.Types.Mixed,

            // For update action
            entity: String,      // 'sale', 'product', 'customer', etc.
            entityId: String,    // ID or field reference
            updates: mongoose.Schema.Types.Mixed,

            // For create action
            entityType: String,
            data: mongoose.Schema.Types.Mixed,

            // For approval action
            approvers: [String], // User IDs
            requiredApprovals: Number,
            timeout: Number,     // Minutes

            // For delay action
            duration: Number,    // Milliseconds

            // For condition action
            condition: {
                field: String,
                operator: String,
                value: mongoose.Schema.Types.Mixed
            },
            thenActions: [mongoose.Schema.Types.Mixed],  // Actions if true
            elseActions: [mongoose.Schema.Types.Mixed]   // Actions if false
        },
        // Action order
        order: {
            type: Number,
            default: 0
        },
        // Continue on error
        continueOnError: {
            type: Boolean,
            default: false
        }
    }],

    // Workflow status
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },

    // Execution tracking
    stats: {
        totalExecutions: {
            type: Number,
            default: 0
        },
        successfulExecutions: {
            type: Number,
            default: 0
        },
        failedExecutions: {
            type: Number,
            default: 0
        },
        lastExecutedAt: Date,
        lastError: {
            message: String,
            timestamp: Date,
            details: mongoose.Schema.Types.Mixed
        }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tags: [String],
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes
workflowSchema.index({ storeId: 1, isActive: 1, isDeleted: 1 });
workflowSchema.index({ organizationId: 1, isActive: 1 });
workflowSchema.index({ 'trigger.type': 1, isActive: 1 });
workflowSchema.index({ 'trigger.schedule.nextRun': 1, isActive: 1 });

// Methods
workflowSchema.methods.activate = function() {
    this.isActive = true;
    return this.save();
};

workflowSchema.methods.deactivate = function() {
    this.isActive = false;
    return this.save();
};

workflowSchema.methods.recordExecution = function(success, error = null) {
    this.stats.totalExecutions += 1;

    if (success) {
        this.stats.successfulExecutions += 1;
    } else {
        this.stats.failedExecutions += 1;
        if (error) {
            this.stats.lastError = {
                message: error.message,
                timestamp: new Date(),
                details: error.stack
            };
        }
    }

    this.stats.lastExecutedAt = new Date();
    return this.save();
};

workflowSchema.methods.checkTriggerConditions = function(data) {
    if (!this.trigger.conditions || this.trigger.conditions.length === 0) {
        return true; // No conditions, always trigger
    }

    // Check all conditions (AND logic)
    return this.trigger.conditions.every(condition => {
        const fieldValue = getNestedValue(data, condition.field);
        return evaluateCondition(fieldValue, condition.operator, condition.value);
    });
};

workflowSchema.methods.calculateNextRun = function() {
    if (!this.trigger.schedule) return null;

    const now = new Date();
    const schedule = this.trigger.schedule;

    switch (schedule.type) {
        case 'daily':
            return getNextDailyRun(now, schedule.time);
        case 'weekly':
            return getNextWeeklyRun(now, schedule.time, schedule.dayOfWeek);
        case 'monthly':
            return getNextMonthlyRun(now, schedule.time, schedule.dayOfMonth);
        case 'cron':
            // TODO: Implement cron parsing
            return null;
        default:
            return null;
    }
};

// Statics
workflowSchema.statics.getActiveWorkflows = function(storeId, triggerType) {
    const query = {
        storeId,
        isActive: true,
        isDeleted: false
    };

    if (triggerType) {
        query['trigger.type'] = triggerType;
    }

    return this.find(query).sort({ createdAt: -1 });
};

workflowSchema.statics.getScheduledWorkflows = function() {
    const now = new Date();

    return this.find({
        isActive: true,
        isDeleted: false,
        'trigger.type': 'schedule',
        'trigger.schedule.nextRun': { $lte: now }
    });
};

// Helper functions
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function evaluateCondition(fieldValue, operator, targetValue) {
    switch (operator) {
        case 'equals':
            return fieldValue == targetValue;
        case 'not_equals':
            return fieldValue != targetValue;
        case 'greater_than':
            return fieldValue > targetValue;
        case 'less_than':
            return fieldValue < targetValue;
        case 'greater_or_equal':
            return fieldValue >= targetValue;
        case 'less_or_equal':
            return fieldValue <= targetValue;
        case 'contains':
            return String(fieldValue).includes(String(targetValue));
        case 'not_contains':
            return !String(fieldValue).includes(String(targetValue));
        case 'in':
            return Array.isArray(targetValue) && targetValue.includes(fieldValue);
        case 'not_in':
            return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
        default:
            return false;
    }
}

function getNextDailyRun(now, time) {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }

    return next;
}

function getNextWeeklyRun(now, time, dayOfWeek) {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    const currentDay = now.getDay();
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;

    if (daysUntilTarget === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
    } else {
        next.setDate(next.getDate() + daysUntilTarget);
    }

    return next;
}

function getNextMonthlyRun(now, time, dayOfMonth) {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(dayOfMonth);

    if (next <= now) {
        next.setMonth(next.getMonth() + 1);
    }

    return next;
}

// Pre-save hook to calculate next run for scheduled workflows
workflowSchema.pre('save', function(next) {
    if (this.trigger.type === 'schedule' && this.isActive) {
        this.trigger.schedule.nextRun = this.calculateNextRun();
    }
    next();
});

const Workflow = mongoose.model('Workflow', workflowSchema);

export default Workflow;

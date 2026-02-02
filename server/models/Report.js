/**
 * @fileoverview Report Model
 *
 * Saved report definitions for custom and scheduled reports
 */

import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    // Report owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },

    // Report type
    reportType: {
        type: String,
        enum: ['sales', 'inventory', 'customers', 'employees', 'custom'],
        required: true
    },

    // Report configuration
    config: {
        // Data sources
        dataSources: [{
            type: String, // 'sales', 'products', 'customers', etc.
            fields: [String] // Fields to include
        }],

        // Filters
        filters: {
            dateRange: {
                type: { type: String, enum: ['custom', 'today', 'week', 'month', 'quarter', 'year'] },
                startDate: Date,
                endDate: Date
            },
            storeIds: [mongoose.Schema.Types.ObjectId],
            categories: [String],
            customFilters: mongoose.Schema.Types.Mixed
        },

        // Grouping
        groupBy: [String], // Fields to group by (e.g., 'date', 'store', 'category')

        // Sorting
        sortBy: String,
        sortOrder: { type: String, enum: ['asc', 'desc'], default: 'desc' },

        // Aggregations
        metrics: [{
            name: String,
            field: String,
            operation: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max'] }
        }],

        // Visualization
        chartType: {
            type: String,
            enum: ['table', 'line', 'bar', 'pie', 'area', 'scatter']
        }
    },

    // Schedule settings
    schedule: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'custom']
        },
        dayOfWeek: Number, // 0-6 for weekly
        dayOfMonth: Number, // 1-31 for monthly
        time: String, // HH:MM format
        recipients: [String], // Email addresses
        format: {
            type: String,
            enum: ['pdf', 'excel', 'csv'],
            default: 'pdf'
        },
        lastRun: Date,
        nextRun: Date
    },

    // Report metadata
    isFavorite: {
        type: Boolean,
        default: false
    },

    isPublic: {
        type: Boolean,
        default: false
    },

    tags: [String],

    // Stats
    runCount: {
        type: Number,
        default: 0
    },

    lastRunAt: Date,

    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
reportSchema.index({ userId: 1, isActive: 1 });
reportSchema.index({ organizationId: 1, isActive: 1 });
reportSchema.index({ storeId: 1, isActive: 1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ isFavorite: 1 });
reportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });

// Methods
reportSchema.methods.updateRunStats = function() {
    this.runCount += 1;
    this.lastRunAt = new Date();
};

reportSchema.methods.calculateNextRun = function() {
    if (!this.schedule.enabled) return null;

    const now = new Date();
    const [hours, minutes] = (this.schedule.time || '09:00').split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (this.schedule.frequency) {
        case 'daily':
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            break;

        case 'weekly':
            const targetDay = this.schedule.dayOfWeek || 0;
            const currentDay = nextRun.getDay();
            let daysToAdd = (targetDay - currentDay + 7) % 7;
            if (daysToAdd === 0 && nextRun <= now) {
                daysToAdd = 7;
            }
            nextRun.setDate(nextRun.getDate() + daysToAdd);
            break;

        case 'monthly':
            const targetDate = this.schedule.dayOfMonth || 1;
            nextRun.setDate(targetDate);
            if (nextRun <= now) {
                nextRun.setMonth(nextRun.getMonth() + 1);
            }
            break;
    }

    return nextRun;
};

// Pre-save hook to calculate next run
reportSchema.pre('save', function(next) {
    if (this.schedule.enabled && this.isModified('schedule')) {
        this.schedule.nextRun = this.calculateNextRun();
    }
    next();
});

const Report = mongoose.model('Report', reportSchema);

export default Report;

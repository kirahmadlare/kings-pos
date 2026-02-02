/**
 * @fileoverview Store Group Model
 *
 * Logical grouping of stores within an organization
 * Used for regional management, franchise groups, departments, etc.
 */

import mongoose from 'mongoose';

const storeGroupSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
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

    // Group type
    type: {
        type: String,
        enum: ['region', 'franchise', 'department', 'brand', 'custom'],
        default: 'region'
    },

    // Group manager
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Parent group (for nested hierarchies)
    parentGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreGroup'
    },

    // Group-specific settings
    settings: {
        // Budget for the group
        budget: {
            monthly: Number,
            quarterly: Number,
            yearly: Number
        },

        // Performance targets
        targets: {
            monthlySales: Number,
            monthlyTransactions: Number,
            customerSatisfaction: Number
        }
    },

    // Group metadata
    metadata: {
        color: String, // For UI visualization
        icon: String,
        tags: [String]
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
storeGroupSchema.index({ organizationId: 1, isActive: 1 });
storeGroupSchema.index({ organizationId: 1, type: 1 });
storeGroupSchema.index({ managerId: 1 });
storeGroupSchema.index({ parentGroupId: 1 });

// Virtual for store count
storeGroupSchema.virtual('storeCount', {
    ref: 'Store',
    localField: '_id',
    foreignField: 'groupId',
    count: true
});

// Methods
storeGroupSchema.methods.getFullPath = async function() {
    // Get full hierarchical path (e.g., "North America > Northeast > New York")
    const path = [this.name];
    let current = this;

    while (current.parentGroupId) {
        current = await this.model('StoreGroup').findById(current.parentGroupId);
        if (current) {
            path.unshift(current.name);
        } else {
            break;
        }
    }

    return path.join(' > ');
};

const StoreGroup = mongoose.model('StoreGroup', storeGroupSchema);

export default StoreGroup;

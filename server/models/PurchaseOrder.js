/**
 * @fileoverview Purchase Order Model
 *
 * Manages purchase orders for inventory replenishment
 */

import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    costPrice: {
        type: Number,
        required: true,
        min: 0
    },
    receivedQuantity: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: String
});

const purchaseOrderSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    supplierName: {
        type: String,
        required: true
    },
    items: [purchaseOrderItemSchema],
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'],
        default: 'draft',
        index: true
    },
    totalCost: {
        type: Number,
        default: 0,
        min: 0
    },
    expectedDate: {
        type: Date
    },
    orderedDate: {
        type: Date
    },
    receivedDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Pre-save hook to calculate total cost
purchaseOrderSchema.pre('save', function(next) {
    if (this.items && this.items.length > 0) {
        this.totalCost = this.items.reduce((sum, item) => {
            return sum + (item.quantity * item.costPrice);
        }, 0);
    }
    next();
});

// Generate order number
purchaseOrderSchema.statics.generateOrderNumber = async function() {
    const count = await this.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const number = (count + 1).toString().padStart(5, '0');
    return `PO${year}${month}${number}`;
};

// Methods
purchaseOrderSchema.methods.approve = function(userId) {
    this.status = 'approved';
    this.approvedBy = userId;
    return this.save();
};

purchaseOrderSchema.methods.placeOrder = function() {
    this.status = 'ordered';
    this.orderedDate = new Date();
    return this.save();
};

purchaseOrderSchema.methods.receiveItems = function(receivedItems, userId) {
    receivedItems.forEach(received => {
        const item = this.items.id(received.itemId);
        if (item) {
            item.receivedQuantity += received.quantity;
        }
    });

    // Check if fully received
    const fullyReceived = this.items.every(item => item.receivedQuantity >= item.quantity);
    const partiallyReceived = this.items.some(item => item.receivedQuantity > 0);

    if (fullyReceived) {
        this.status = 'received';
        this.receivedDate = new Date();
    } else if (partiallyReceived) {
        this.status = 'partially_received';
    }

    this.receivedBy = userId;
    return this.save();
};

purchaseOrderSchema.methods.cancel = function() {
    if (['draft', 'pending', 'approved'].includes(this.status)) {
        this.status = 'cancelled';
        return this.save();
    }
    throw new Error('Cannot cancel order in current status');
};

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;

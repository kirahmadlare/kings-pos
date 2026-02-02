/**
 * @fileoverview Supplier Model
 *
 * Represents suppliers for purchase orders and inventory management
 */

import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    taxId: {
        type: String,
        trim: true
    },
    paymentTerms: {
        type: String,
        enum: ['net-15', 'net-30', 'net-45', 'net-60', 'cod', 'prepaid', 'custom'],
        default: 'net-30'
    },
    paymentTermsCustom: {
        type: String,
        trim: true
    },
    leadTimeDays: {
        type: Number,
        default: 7,
        min: 0
    },
    minimumOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    tags: [String],
    // Statistics
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    lastOrderDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes
supplierSchema.index({ storeId: 1, name: 1 });
supplierSchema.index({ storeId: 1, isActive: 1 });
supplierSchema.index({ storeId: 1, email: 1 });

// Virtual for full address
supplierSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.zipCode,
        this.address.country
    ].filter(Boolean);
    return parts.join(', ');
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

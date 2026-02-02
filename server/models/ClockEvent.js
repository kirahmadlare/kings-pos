/**
 * @fileoverview Clock Event Model
 * 
 * Tracks actual clock in/out times and shift performance
 */

import mongoose from 'mongoose';

const clockEventSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift'
    },
    clockIn: {
        type: Date,
        required: true,
        default: Date.now
    },
    clockOut: {
        type: Date
    },
    // Shift summary (calculated at clock out)
    salesCount: {
        type: Number,
        default: 0
    },
    salesTotal: {
        type: Number,
        default: 0
    },
    itemsSold: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for optimized queries
// 1. Active clock events (no clockOut)
clockEventSchema.index({ storeId: 1, clockOut: 1 });

// 2. Employee's active shift
clockEventSchema.index({ storeId: 1, employeeId: 1, clockOut: 1 });

// 3. Clock events by date range
clockEventSchema.index({ storeId: 1, clockIn: -1 });

// 4. Shift reference lookup
clockEventSchema.index({ storeId: 1, shiftId: 1 });

// 5. Employee performance reports
clockEventSchema.index({ storeId: 1, employeeId: 1, clockIn: -1 });

// 6. High sales shifts
clockEventSchema.index({ storeId: 1, salesTotal: -1, clockIn: -1 });

// Calculate shift duration in hours
clockEventSchema.methods.getDuration = function () {
    if (!this.clockOut) return 0;
    return (this.clockOut - this.clockIn) / (1000 * 60 * 60);
};

const ClockEvent = mongoose.model('ClockEvent', clockEventSchema);

export default ClockEvent;

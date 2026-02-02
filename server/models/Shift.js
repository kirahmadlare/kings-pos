/**
 * @fileoverview Shift Model
 * 
 * Represents scheduled work shifts and clock events
 */

import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
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
    date: {
        type: String, // YYYY-MM-DD format
        required: true
    },
    startTime: {
        type: String, // HH:MM format
        required: true
    },
    endTime: {
        type: String, // HH:MM format
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for optimized queries
// 1. Shifts by date (daily schedule view)
shiftSchema.index({ storeId: 1, date: 1, startTime: 1 });

// 2. Employee's shifts
shiftSchema.index({ storeId: 1, employeeId: 1, date: -1 });

// 3. Shift status tracking
shiftSchema.index({ storeId: 1, status: 1, date: 1 });

// 4. Upcoming shifts (scheduled, not started)
shiftSchema.index({ storeId: 1, status: 1, date: 1, startTime: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;

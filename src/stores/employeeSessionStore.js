/**
 * @fileoverview Employee Session Store
 * 
 * Manages the currently active employee session for POS operations.
 * Separate from auth store - this tracks which employee is using the terminal.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import db from '../db';

export const useEmployeeSession = create(
    persist(
        (set, get) => ({
            // Current active employee on the POS terminal
            currentEmployee: null,
            // Current clock event (if clocked in)
            currentClockEvent: null,
            // Loading state
            isLoading: false,
            // Error message
            error: null,

            /**
             * Login employee with PIN
             */
            loginWithPIN: async (pin, storeId) => {
                set({ isLoading: true, error: null });

                try {
                    // Find employee by PIN
                    const employee = await db.employees
                        .where('storeId')
                        .equals(storeId)
                        .filter(e => e.pin === pin && e.isActive !== false)
                        .first();

                    if (!employee) {
                        throw new Error('Invalid PIN');
                    }

                    // Check if already clocked in
                    const existingClockEvent = await db.clockEvents
                        .where('storeId')
                        .equals(storeId)
                        .filter(e => e.employeeId === employee.id && !e.clockOut)
                        .first();

                    set({
                        currentEmployee: employee,
                        currentClockEvent: existingClockEvent || null,
                        isLoading: false,
                        error: null
                    });

                    return { success: true, employee, needsClockIn: !existingClockEvent };
                } catch (error) {
                    set({ error: error.message, isLoading: false });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Clock in the current employee
             */
            clockIn: async (storeId) => {
                const { currentEmployee } = get();
                if (!currentEmployee) return { success: false, error: 'No employee logged in' };

                try {
                    const clockEventId = await db.clockEvents.add({
                        storeId,
                        employeeId: currentEmployee.id,
                        clockIn: new Date().toISOString(),
                        clockOut: null,
                        salesCount: 0,
                        salesTotal: 0,
                        createdAt: new Date().toISOString()
                    });

                    const clockEvent = await db.clockEvents.get(clockEventId);
                    set({ currentClockEvent: clockEvent });

                    return { success: true, clockEvent };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            /**
             * Clock out the current employee
             */
            clockOut: async () => {
                const { currentClockEvent } = get();
                if (!currentClockEvent) return { success: false, error: 'Not clocked in' };

                try {
                    await db.clockEvents.update(currentClockEvent.id, {
                        clockOut: new Date().toISOString()
                    });

                    set({ currentClockEvent: null, currentEmployee: null });
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            /**
             * Verify PIN for the current employee (for logout/switch security)
             */
            verifyPIN: async (pin) => {
                const { currentEmployee } = get();
                if (!currentEmployee) return { success: false, error: 'No employee logged in' };

                if (currentEmployee.pin === pin) {
                    return { success: true };
                } else {
                    return { success: false, error: 'Incorrect PIN' };
                }
            },

            /**
             * Switch to a different employee (for shared terminals)
             * Now requires PIN verification - called after verifyPIN succeeds
             * Also clocks out the employee if they were clocked in
             */
            switchEmployee: async () => {
                const { currentClockEvent } = get();

                // Clock out if currently clocked in
                if (currentClockEvent) {
                    try {
                        await db.clockEvents.update(currentClockEvent.id, {
                            clockOut: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error('Failed to clock out:', error);
                    }
                }

                // Clear the session
                set({ currentEmployee: null, currentClockEvent: null, error: null });
            },

            /**
             * Record a sale for the current shift
             */
            recordSale: async (saleTotal) => {
                const { currentClockEvent } = get();
                if (!currentClockEvent) return;

                try {
                    await db.clockEvents.update(currentClockEvent.id, {
                        salesCount: (currentClockEvent.salesCount || 0) + 1,
                        salesTotal: (currentClockEvent.salesTotal || 0) + saleTotal
                    });

                    // Update local state
                    const updated = await db.clockEvents.get(currentClockEvent.id);
                    set({ currentClockEvent: updated });
                } catch (error) {
                    console.error('Failed to record sale:', error);
                }
            },

            /**
             * Clear error
             */
            clearError: () => set({ error: null })
        }),
        {
            name: 'pos-employee-session',
            partialize: (state) => ({
                currentEmployee: state.currentEmployee,
                currentClockEvent: state.currentClockEvent
            })
        }
    )
);

export default useEmployeeSession;

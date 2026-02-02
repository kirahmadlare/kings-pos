/**
 * @fileoverview Workflow Engine
 *
 * Executes workflows with support for various action types
 */

import Workflow from '../models/Workflow.js';
import { Sale, Product, Customer, Employee, Store, User } from '../models/index.js';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class WorkflowEngine {
    constructor() {
        this.executionQueue = [];
        this.isProcessing = false;
        this.emailTransporter = null;
        this.initializeEmailTransporter();
    }

    /**
     * Initialize email transporter
     */
    initializeEmailTransporter() {
        try {
            // Handle both CommonJS and ES module exports
            const createTransporter = nodemailer.createTransporter || nodemailer.default?.createTransporter;

            if (!createTransporter) {
                logger.warn('Email transporter not available (nodemailer not configured)');
                return;
            }

            this.emailTransporter = createTransporter({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            logger.info('Email transporter initialized');
        } catch (error) {
            logger.warn('Failed to initialize email transporter (email workflows will be disabled):', error.message);
        }
    }

    /**
     * Trigger workflows for an event
     */
    async trigger(eventType, data, context) {
        try {
            // Find active workflows for this trigger type
            const workflows = await Workflow.getActiveWorkflows(context.storeId, eventType);

            logger.info(`Found ${workflows.length} workflows for ${eventType}`);

            for (const workflow of workflows) {
                // Check trigger conditions
                if (!workflow.checkTriggerConditions(data)) {
                    logger.debug(`Workflow ${workflow.name} conditions not met`);
                    continue;
                }

                // Execute workflow
                this.executeWorkflow(workflow, data, context).catch(error => {
                    logger.error(`Error executing workflow ${workflow.name}:`, error);
                });
            }
        } catch (error) {
            logger.error('Error triggering workflows:', error);
        }
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(workflow, triggerData, context) {
        logger.info(`Executing workflow: ${workflow.name}`);

        try {
            // Sort actions by order
            const actions = workflow.actions.sort((a, b) => a.order - b.order);

            // Execute actions sequentially
            for (const action of actions) {
                try {
                    await this.executeAction(action, triggerData, context, workflow);
                } catch (error) {
                    logger.error(`Error executing action ${action.type}:`, error);

                    if (!action.continueOnError) {
                        throw error; // Stop workflow execution
                    }
                }
            }

            // Record successful execution
            await workflow.recordExecution(true);
            logger.info(`Workflow ${workflow.name} completed successfully`);
        } catch (error) {
            // Record failed execution
            await workflow.recordExecution(false, error);
            logger.error(`Workflow ${workflow.name} failed:`, error);
            throw error;
        }
    }

    /**
     * Execute a single action
     */
    async executeAction(action, triggerData, context, workflow) {
        logger.debug(`Executing action: ${action.type}`);

        switch (action.type) {
            case 'email':
                return await this.executeEmailAction(action, triggerData, context);
            case 'notification':
                return await this.executeNotificationAction(action, triggerData, context);
            case 'webhook':
                return await this.executeWebhookAction(action, triggerData, context);
            case 'update':
                return await this.executeUpdateAction(action, triggerData, context);
            case 'create':
                return await this.executeCreateAction(action, triggerData, context);
            case 'approval':
                return await this.executeApprovalAction(action, triggerData, context, workflow);
            case 'delay':
                return await this.executeDelayAction(action);
            case 'condition':
                return await this.executeConditionAction(action, triggerData, context, workflow);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Execute email action
     */
    async executeEmailAction(action, triggerData, context) {
        if (!this.emailTransporter) {
            throw new Error('Email transporter not configured');
        }

        const { to, subject, body } = action.config;

        // Replace variables in subject and body
        const processedSubject = this.replaceVariables(subject, triggerData, context);
        const processedBody = this.replaceVariables(body, triggerData, context);

        // Process recipient addresses
        const recipients = Array.isArray(to) ? to : [to];
        const processedRecipients = recipients.map(recipient =>
            this.replaceVariables(recipient, triggerData, context)
        );

        await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: processedRecipients.join(', '),
            subject: processedSubject,
            html: processedBody
        });

        logger.info(`Email sent to ${processedRecipients.join(', ')}`);
    }

    /**
     * Execute notification action
     */
    async executeNotificationAction(action, triggerData, context) {
        const { userId, title, message, priority } = action.config;

        // Get user ID
        const targetUserId = this.replaceVariables(userId, triggerData, context);
        const processedTitle = this.replaceVariables(title, triggerData, context);
        const processedMessage = this.replaceVariables(message, triggerData, context);

        // Emit notification via Socket.io
        if (context.io) {
            context.io.to(`user:${targetUserId}`).emit('notification', {
                title: processedTitle,
                message: processedMessage,
                priority: priority || 'normal',
                timestamp: new Date(),
                source: 'workflow'
            });
        }

        logger.info(`Notification sent to user ${targetUserId}`);
    }

    /**
     * Execute webhook action
     */
    async executeWebhookAction(action, triggerData, context) {
        const { url, method, headers, body } = action.config;

        const processedUrl = this.replaceVariables(url, triggerData, context);
        const processedBody = body ? this.replaceVariables(JSON.stringify(body), triggerData, context) : null;

        const fetch = (await import('node-fetch')).default;

        const response = await fetch(processedUrl, {
            method: method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: processedBody,
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
        }

        logger.info(`Webhook called: ${processedUrl}`);
    }

    /**
     * Execute update action
     */
    async executeUpdateAction(action, triggerData, context) {
        const { entity, entityId, updates } = action.config;

        const Model = this.getModel(entity);
        const processedId = this.replaceVariables(entityId, triggerData, context);

        // Process updates
        const processedUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            processedUpdates[key] = this.replaceVariables(value, triggerData, context);
        }

        await Model.findByIdAndUpdate(processedId, processedUpdates);

        logger.info(`Updated ${entity} ${processedId}`);
    }

    /**
     * Execute create action
     */
    async executeCreateAction(action, triggerData, context) {
        const { entityType, data } = action.config;

        const Model = this.getModel(entityType);

        // Process data
        const processedData = {};
        for (const [key, value] of Object.entries(data)) {
            processedData[key] = this.replaceVariables(value, triggerData, context);
        }

        // Add storeId
        processedData.storeId = context.storeId;

        const created = await Model.create(processedData);

        logger.info(`Created ${entityType} ${created._id}`);
    }

    /**
     * Execute approval action
     */
    async executeApprovalAction(action, triggerData, context, workflow) {
        const { approvers, requiredApprovals, timeout } = action.config;

        // TODO: Implement approval workflow
        // This would require a separate Approval model and UI
        logger.info('Approval action not yet implemented');
    }

    /**
     * Execute delay action
     */
    async executeDelayAction(action) {
        const { duration } = action.config;

        await new Promise(resolve => setTimeout(resolve, duration));

        logger.info(`Delayed for ${duration}ms`);
    }

    /**
     * Execute condition action
     */
    async executeConditionAction(action, triggerData, context, workflow) {
        const { condition, thenActions, elseActions } = action.config;

        const fieldValue = this.getNestedValue(triggerData, condition.field);
        const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);

        const actionsToExecute = conditionMet ? thenActions : elseActions;

        if (actionsToExecute && actionsToExecute.length > 0) {
            for (const subAction of actionsToExecute) {
                await this.executeAction(subAction, triggerData, context, workflow);
            }
        }

        logger.info(`Condition evaluated: ${conditionMet}`);
    }

    /**
     * Replace variables in string with actual values
     */
    replaceVariables(template, data, context) {
        if (typeof template !== 'string') {
            return template;
        }

        let result = template;

        // Replace {{data.field}} with actual values
        result = result.replace(/\{\{data\.([^}]+)\}\}/g, (match, path) => {
            return this.getNestedValue(data, path) || match;
        });

        // Replace {{context.field}} with context values
        result = result.replace(/\{\{context\.([^}]+)\}\}/g, (match, path) => {
            return this.getNestedValue(context, path) || match;
        });

        return result;
    }

    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Evaluate condition
     */
    evaluateCondition(fieldValue, operator, targetValue) {
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
            default:
                return false;
        }
    }

    /**
     * Get model by entity type
     */
    getModel(entityType) {
        const models = {
            sale: Sale,
            product: Product,
            customer: Customer,
            employee: Employee,
            store: Store,
            user: User
        };

        const Model = models[entityType.toLowerCase()];

        if (!Model) {
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        return Model;
    }

    /**
     * Process scheduled workflows
     */
    async processScheduledWorkflows(context) {
        try {
            const workflows = await Workflow.getScheduledWorkflows();

            logger.info(`Processing ${workflows.length} scheduled workflows`);

            for (const workflow of workflows) {
                try {
                    await this.executeWorkflow(workflow, {}, context);

                    // Update next run time
                    workflow.trigger.schedule.nextRun = workflow.calculateNextRun();
                    await workflow.save();
                } catch (error) {
                    logger.error(`Error processing scheduled workflow ${workflow.name}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error processing scheduled workflows:', error);
        }
    }
}

// Singleton instance
const workflowEngine = new WorkflowEngine();

export default workflowEngine;

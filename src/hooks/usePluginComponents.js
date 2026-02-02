/**
 * @fileoverview Use Plugin Components Hook
 *
 * Hook for loading plugin components at specific injection points
 */

import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import pluginLoader from '../services/pluginLoader';

/**
 * Hook to load plugin components for an injection point
 *
 * @param {string} injectionPoint - The injection point identifier (e.g., 'POS.AfterCheckout')
 * @param {object} props - Props to pass to plugin components
 * @returns {object} { components, loading, error }
 */
export function usePluginComponents(injectionPoint, props = {}) {
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadComponents();
    }, [injectionPoint]);

    const loadComponents = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch components for this injection point
            const componentData = await apiRequest(`/plugins/ui-components/${injectionPoint}`);

            if (!componentData || componentData.length === 0) {
                setComponents([]);
                setLoading(false);
                return;
            }

            // Load components
            const loadedComponents = [];

            for (const data of componentData) {
                try {
                    // In a real implementation, you would load the component from a URL
                    // For now, we'll create a placeholder component
                    const PlaceholderComponent = ({ ...componentProps }) => {
                        return (
                            <div style={{
                                padding: '1rem',
                                margin: '1rem 0',
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px dashed rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <strong>{data.pluginName}</strong>
                                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                    {data.component} Component
                                </div>
                            </div>
                        );
                    };

                    loadedComponents.push({
                        pluginId: data.pluginId,
                        pluginName: data.pluginName,
                        Component: PlaceholderComponent
                    });
                } catch (err) {
                    console.error(`Failed to load component from plugin ${data.pluginId}:`, err);
                }
            }

            setComponents(loadedComponents);
        } catch (err) {
            console.error('Failed to load plugin components:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { components, loading, error };
}

/**
 * Component for rendering plugin components at an injection point
 */
export function PluginComponentsRenderer({ injectionPoint, ...props }) {
    const { components, loading, error } = usePluginComponents(injectionPoint, props);

    if (loading) {
        return null; // Don't show loading state for plugin components
    }

    if (error) {
        console.error('Plugin components error:', error);
        return null; // Fail silently
    }

    if (components.length === 0) {
        return null;
    }

    return (
        <div className="plugin-components-container">
            {components.map((item, index) => (
                <item.Component key={`${item.pluginId}-${index}`} {...props} />
            ))}
        </div>
    );
}

export default usePluginComponents;

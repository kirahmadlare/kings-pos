/**
 * @fileoverview Plugin Loader Service
 *
 * Handles dynamic loading of plugin components and scripts
 */

class PluginLoader {
    constructor() {
        this.loadedPlugins = new Map();
        this.componentCache = new Map();
    }

    /**
     * Load a plugin script dynamically
     */
    async loadPlugin(pluginId, scriptUrl) {
        if (this.loadedPlugins.has(pluginId)) {
            return this.loadedPlugins.get(pluginId);
        }

        try {
            // Create script element
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;

            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            // Get plugin from global namespace
            const plugin = window[`Plugin_${pluginId}`];

            if (!plugin) {
                throw new Error(`Plugin ${pluginId} did not register itself`);
            }

            this.loadedPlugins.set(pluginId, plugin);
            console.log(`✓ Loaded plugin: ${pluginId}`);

            return plugin;
        } catch (error) {
            console.error(`Failed to load plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Get a component from a plugin
     */
    async getComponent(pluginId, componentName) {
        const cacheKey = `${pluginId}:${componentName}`;

        if (this.componentCache.has(cacheKey)) {
            return this.componentCache.get(cacheKey);
        }

        const plugin = this.loadedPlugins.get(pluginId);

        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not loaded`);
        }

        const component = plugin.components?.[componentName];

        if (!component) {
            throw new Error(`Component ${componentName} not found in plugin ${pluginId}`);
        }

        this.componentCache.set(cacheKey, component);
        return component;
    }

    /**
     * Unload a plugin
     */
    unloadPlugin(pluginId) {
        this.loadedPlugins.delete(pluginId);

        // Clear component cache for this plugin
        for (const [key] of this.componentCache.entries()) {
            if (key.startsWith(`${pluginId}:`)) {
                this.componentCache.delete(key);
            }
        }

        console.log(`✓ Unloaded plugin: ${pluginId}`);
    }

    /**
     * Get all loaded plugins
     */
    getLoadedPlugins() {
        return Array.from(this.loadedPlugins.keys());
    }
}

// Singleton instance
const pluginLoader = new PluginLoader();

export default pluginLoader;

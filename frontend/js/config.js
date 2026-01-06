// Configuration file for different environments
const config = {
    // Development environment (localhost)
    development: {
        apiBaseUrl: 'http://localhost:3000/api',
        environment: 'development'
    },
    
    // Production environment (your deployed backend)
    production: {
        // En Render, el frontend y backend están en el mismo dominio, así que usamos la URL actual
        apiBaseUrl: `${window.location.origin}/api`, 
        environment: 'production'
    }
};

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1';

// Export the appropriate configuration
const currentConfig = isProduction ? config.production : config.development;

// Global configuration object
window.APP_CONFIG = currentConfig;

console.log('App running in:', currentConfig.environment);
console.log('API Base URL:', currentConfig.apiBaseUrl);

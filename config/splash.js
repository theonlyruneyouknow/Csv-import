// Splash page configuration
module.exports = {
    company: {
        name: 'TSC Management System',
        tagline: 'Streamline Your Business Operations',
        description: 'Welcome to TSC\'s comprehensive purchase order management system. Efficiently manage your orders, track inventory, and collaborate with your team in a secure, user-friendly environment.',
        supportEmail: 'support@tsc.com',
        founded: 2023
    },
    
    features: [
        {
            icon: 'chart-line',
            title: 'Real-time Tracking',
            description: 'Monitor your purchase orders and inventory in real-time'
        },
        {
            icon: 'users',
            title: 'Team Collaboration',
            description: 'Work together seamlessly with role-based access control'
        },
        {
            icon: 'shield-alt',
            title: 'Secure & Reliable',
            description: 'Enterprise-grade security with comprehensive audit trails'
        }
    ],
    
    messages: {
        welcome: 'Welcome to TSC Management System! Please sign in to get started.',
        logoutSuccess: 'You have been logged out successfully. Thank you for using TSC Management System!',
        alreadyLoggedOut: 'You are already logged out.',
        pageNotFound: 'The page you requested was not found. Here\'s what you can do from here:'
    },
    
    theme: {
        primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        secondaryGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        successGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        accentColor: '#ffd700'
    }
};

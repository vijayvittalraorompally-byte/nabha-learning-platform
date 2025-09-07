
// Real-time functionality using Supabase
class RealTimeManager {
    constructor() {
        this.subscriptions = new Map();
        this.isConnected = false;
        this.init();
    }

    async init() {
        try {
            // Update user online status
            await this.updateOnlineStatus(true);
            
            // Set up periodic heartbeat
            this.startHeartbeat();
            
            // Listen for auth changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    this.cleanup();
                }
            });

            // Set up real-time subscriptions
            this.setupSubscriptions();
            
            this.isConnected = true;
        } catch (error) {
            console.error('Real-time initialization failed:', error);
        }
    }

    async updateOnlineStatus(isOnline) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                await supabaseClient
                    .from('users')
                    .update({ 
                        is_online: isOnline, 
                        last_active: new Date().toISOString() 
                    })
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Failed to update online status:', error);
        }
    }

    startHeartbeat() {
        setInterval(() => {
            this.updateOnlineStatus(true);
        }, 30000); // Update every 30 seconds
    }

    setupSubscriptions() {
        // Subscribe to student activity for teachers
        this.subscribeToStudentActivity();

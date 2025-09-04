// Authentication functions
class Auth {
    constructor() {
        this.user = null;
        this.init();
    }
    
    async init() {
        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            this.user = user;
            this.redirectToDashboard();
        }
    }
    
    async signUp(email, password, userData) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
            });
            
            if (error) throw error;
            
            // Insert additional user data
            if (data.user) {
                const { error: insertError } = await supabaseClient
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: email,
                        name: userData.name,
                        role: userData.role,
                        school_name: userData.school_name,
                        grade_level: userData.grade_level || null,
                        language_preference: userData.language_preference || 'punjabi'
                    });
                
                if (insertError) throw insertError;
            }
            
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) throw error;
            
            this.user = data.user;
            this.redirectToDashboard();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            this.user = null;
            window.location.href = 'index.html';
        }
    }
    
    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }
    
    async getUserProfile() {
        if (!this.user) return null;
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', this.user.id)
            .single();
        
        return error ? null : data;
    }
}

// Initialize auth
const auth = new Auth();
window.auth = auth;

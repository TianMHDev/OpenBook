// ============================================================================
// API SERVICE - Centralized API communication
// ============================================================================

class ApiService {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get authorization headers
     * @returns {Object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Update token
     * @param {string} token - JWT token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * Clear token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * Make HTTP request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ============================================================================
    // AUTHENTICATION ENDPOINTS
    // ============================================================================

    /**
     * User registration
     * @param {Object} userData - User registration data
     * @returns {Promise} Registration result
     */
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    /**
     * User login
     * @param {Object} credentials - Login credentials
     * @returns {Promise} Login result
     */
    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.success && data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }

    /**
     * Get current user info
     * @returns {Promise} User data
     */
    async getCurrentUser() {
        return this.request('/auth/me');
    }

    /**
     * User logout
     */
    logout() {
        this.clearToken();
        window.location.href = '/login';
    }

    // ============================================================================
    // USER ENDPOINTS
    // ============================================================================

    /**
     * Get user profile
     * @returns {Promise} User profile data
     */
    async getUserProfile() {
        return this.request('/users/profile');
    }

    /**
     * Update user profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise} Update result
     */
    async updateUserProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    /**
     * Get user dashboard data
     * @returns {Promise} Dashboard data
     */
    async getUserDashboard() {
        return this.request('/users/dashboard');
    }

    /**
     * Get students (teachers only)
     * @returns {Promise} Students list
     */
    async getStudents() {
        return this.request('/users/students');
    }

    /**
     * Get specific student details
     * @param {number} studentId - Student ID
     * @returns {Promise} Student details
     */
    async getStudentDetails(studentId) {
        return this.request(`/users/students/${studentId}`);
    }

    // ============================================================================
    // BOOK ENDPOINTS
    // ============================================================================

    /**
     * Get books catalog
     * @param {Object} filters - Search and filter options
     * @returns {Promise} Books data
     */
    async getBooks(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return this.request(`/books?${queryParams}`);
    }

    /**
     * Get specific book details
     * @param {number} bookId - Book ID
     * @returns {Promise} Book details
     */
    async getBook(bookId) {
        return this.request(`/books/${bookId}`);
    }

    /**
     * Get available genres
     * @returns {Promise} Genres list
     */
    async getGenres() {
        return this.request('/books/genres');
    }

    /**
     * Get user's favorite books
     * @returns {Promise} Favorites list
     */
    async getFavorites() {
        return this.request('/books/user/favorites');
    }

    /**
     * Add book to favorites
     * @param {number} bookId - Book ID
     * @returns {Promise} Operation result
     */
    async addToFavorites(bookId) {
        return this.request(`/books/user/favorites/${bookId}`, {
            method: 'POST'
        });
    }

    /**
     * Remove book from favorites
     * @param {number} bookId - Book ID
     * @returns {Promise} Operation result
     */
    async removeFromFavorites(bookId) {
        return this.request(`/books/user/favorites/${bookId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get user's reading list
     * @returns {Promise} Reading list
     */
    async getReadingList() {
        return this.request('/books/user/reading');
    }

    /**
     * Add book to reading list
     * @param {number} bookId - Book ID
     * @param {string} status - Reading status
     * @returns {Promise} Operation result
     */
    async addToReadingList(bookId, status = 'reading') {
        return this.request(`/books/user/reading/${bookId}`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    // ============================================================================
    // TEACHER ENDPOINTS
    // ============================================================================

    /**
     * Get teacher dashboard data
     * @returns {Promise} Teacher dashboard data
     */
    async getTeacherDashboard() {
        return this.request('/teacher/dashboard');
    }

    /**
     * Get teacher's students
     * @returns {Promise} Students list
     */
    async getTeacherStudents() {
        return this.request('/teacher/students');
    }

    /**
     * Get teacher's catalog
     * @param {Object} filters - Search and filter options
     * @returns {Promise} Catalog data
     */
    async getTeacherCatalog(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return this.request(`/teacher/catalog?${queryParams}`);
    }

    /**
     * Get teacher's favorites
     * @returns {Promise} Favorites list
     */
    async getTeacherFavorites() {
        return this.request('/teacher/favorites');
    }

    /**
     * Add book to teacher's favorites
     * @param {number} bookId - Book ID
     * @returns {Promise} Operation result
     */
    async addToTeacherFavorites(bookId) {
        return this.request(`/teacher/favorites/${bookId}`, {
            method: 'POST'
        });
    }

    /**
     * Remove book from teacher's favorites
     * @param {number} bookId - Book ID
     * @returns {Promise} Operation result
     */
    async removeFromTeacherFavorites(bookId) {
        return this.request(`/teacher/favorites/${bookId}`, {
            method: 'DELETE'
        });
    }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;

require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const multer = require('multer');
const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images and videos are allowed!'));
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'hostel-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(flash());

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Global variables middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    // Get site settings
    const settings = db.prepare('SELECT * FROM settings LIMIT 1').get();
    res.locals.settings = settings || { site_name: 'HostelHub', site_tagline: 'Find Your Perfect Stay' };

    next();
});

// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error', 'Please login to continue');
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Access denied');
    res.redirect('/');
};

// ============ PUBLIC ROUTES ============

// Home page
app.get('/', (req, res) => {
    const featuredHostels = db.prepare(`
        SELECT * FROM hostels WHERE featured = 1 ORDER BY created_at DESC LIMIT 6
    `).all();

    const stats = {
        totalHostels: db.prepare('SELECT COUNT(*) as count FROM hostels').get().count,
        availableRooms: db.prepare('SELECT SUM(rooms) as total FROM hostels WHERE status = ?').get('available').total || 0,
        happyGuests: db.prepare('SELECT COUNT(*) as count FROM reservations WHERE status = ?').get('confirmed').count
    };

    res.render('pages/home', {
        title: 'Home',
        featuredHostels,
        stats
    });
});

// All hostels page
app.get('/hostels', (req, res) => {
    const { search, location, minPrice, maxPrice, status } = req.query;

    let query = 'SELECT * FROM hostels WHERE 1=1';
    const params = [];

    if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (location) {
        query += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }
    if (minPrice) {
        query += ' AND price >= ?';
        params.push(minPrice);
    }
    if (maxPrice) {
        query += ' AND price <= ?';
        params.push(maxPrice);
    }
    if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY featured DESC, created_at DESC';

    const hostels = db.prepare(query).all(...params);

    // Get unique locations for filter
    const locations = db.prepare('SELECT DISTINCT location FROM hostels').all();

    res.render('pages/hostels', {
        title: 'All Hostels',
        hostels,
        locations,
        filters: req.query
    });
});

// Single hostel details
app.get('/hostel/:id', (req, res) => {
    const hostel = db.prepare('SELECT * FROM hostels WHERE id = ?').get(req.params.id);

    if (!hostel) {
        req.flash('error', 'Hostel not found');
        return res.redirect('/hostels');
    }

    // Parse JSON fields
    hostel.amenities = JSON.parse(hostel.amenities || '[]');
    hostel.images = JSON.parse(hostel.images || '[]');
    hostel.videos = JSON.parse(hostel.videos || '[]');

    // Get similar hostels
    const similarHostels = db.prepare(`
        SELECT * FROM hostels 
        WHERE id != ? AND location LIKE ? 
        ORDER BY RANDOM() LIMIT 3
    `).all(hostel.id, `%${hostel.location.split(',')[0]}%`);

    res.render('pages/hostel-detail', {
        title: hostel.name,
        hostel,
        similarHostels
    });
});

// Reservation page
app.get('/reserve/:id', (req, res) => {
    const hostel = db.prepare('SELECT * FROM hostels WHERE id = ?').get(req.params.id);

    if (!hostel) {
        req.flash('error', 'Hostel not found');
        return res.redirect('/hostels');
    }

    if (hostel.status === 'booked') {
        req.flash('error', 'This hostel is currently not available');
        return res.redirect(`/hostel/${hostel.id}`);
    }

    res.render('pages/reserve', {
        title: `Reserve ${hostel.name}`,
        hostel
    });
});

// Submit reservation
app.post('/reserve/:id', async (req, res) => {
    const hostel = db.prepare('SELECT * FROM hostels WHERE id = ?').get(req.params.id);

    if (!hostel || hostel.status === 'booked') {
        req.flash('error', 'This hostel is not available');
        return res.redirect('/hostels');
    }

    const { guest_name, guest_email, guest_phone, check_in, check_out, guests, message } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO reservations (hostel_id, user_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            hostel.id,
            req.session.user?.id || null,
            guest_name,
            guest_email,
            guest_phone,
            check_in,
            check_out,
            guests || 1,
            message || ''
        );

        // Send email notification (if configured)
        try {
            const { sendReservationNotification } = require('./services/email');
            await sendReservationNotification({
                reservationId: result.lastInsertRowid,
                hostelName: hostel.name,
                guestName: guest_name,
                guestEmail: guest_email,
                guestPhone: guest_phone,
                checkIn: check_in,
                checkOut: check_out
            });
        } catch (emailError) {
            console.log('Email notification failed:', emailError.message);
        }

        req.flash('success', 'Reservation submitted successfully! Please proceed to payment.');
        res.redirect(`/confirmation/${result.lastInsertRowid}`);

    } catch (error) {
        console.error('Reservation error:', error);
        req.flash('error', 'Failed to submit reservation. Please try again.');
        res.redirect(`/reserve/${hostel.id}`);
    }
});

// Confirmation page
app.get('/confirmation/:id', (req, res) => {
    const reservation = db.prepare(`
        SELECT r.*, h.name as hostel_name, h.price, h.location
        FROM reservations r
        JOIN hostels h ON r.hostel_id = h.id
        WHERE r.id = ?
    `).get(req.params.id);

    if (!reservation) {
        req.flash('error', 'Reservation not found');
        return res.redirect('/');
    }

    const paymentInfo = db.prepare('SELECT * FROM payment_info WHERE is_active = 1 LIMIT 1').get();

    res.render('pages/confirmation', {
        title: 'Booking Confirmation',
        reservation,
        paymentInfo
    });
});

// Payment info page
app.get('/payment-info', (req, res) => {
    const paymentInfo = db.prepare('SELECT * FROM payment_info WHERE is_active = 1 LIMIT 1').get();

    res.render('pages/payment-info', {
        title: 'Payment Information',
        paymentInfo
    });
});

// About page
app.get('/about', (req, res) => {
    res.render('pages/about', { title: 'About Us' });
});

// Contact page
app.get('/contact', (req, res) => {
    res.render('pages/contact', { title: 'Contact Us' });
});

// ============ AUTH ROUTES ============

// Login page
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/');
    }
    res.render('pages/login', { title: 'Login', layout: 'layouts/auth' });
});

// Login submit
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const bcrypt = require('bcryptjs');

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/login');
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect(user.role === 'admin' ? '/admin' : '/');
});

// Register page
app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('pages/register', { title: 'Register', layout: 'layouts/auth' });
});

// Register submit
app.post('/register', (req, res) => {
    const { name, email, phone, password, confirm_password } = req.body;
    const bcrypt = require('bcryptjs');

    // Validation
    if (password !== confirm_password) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/register');
    }

    // Check if email exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
        req.flash('error', 'Email already registered');
        return res.redirect('/register');
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);

        db.prepare(`
            INSERT INTO users (name, email, phone, password, role)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, email, phone || '', hashedPassword, 'user');

        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/login');

    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/register');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// User profile
app.get('/profile', isAuthenticated, (req, res) => {
    const reservations = db.prepare(`
        SELECT r.*, h.name as hostel_name, h.location, h.price
        FROM reservations r
        JOIN hostels h ON r.hostel_id = h.id
        WHERE r.user_id = ? OR r.guest_email = ?
        ORDER BY r.created_at DESC
    `).all(req.session.user.id, req.session.user.email);

    res.render('pages/profile', {
        title: 'My Profile',
        reservations
    });
});

// ============ ADMIN ROUTES ============

// Admin dashboard
app.get('/admin', isAdmin, (req, res) => {
    const stats = {
        totalHostels: db.prepare('SELECT COUNT(*) as count FROM hostels').get().count,
        totalReservations: db.prepare('SELECT COUNT(*) as count FROM reservations').get().count,
        pendingReservations: db.prepare('SELECT COUNT(*) as count FROM reservations WHERE status = ?').get('pending').count,
        totalUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count,
        availableHostels: db.prepare('SELECT COUNT(*) as count FROM hostels WHERE status = ?').get('available').count,
        bookedHostels: db.prepare('SELECT COUNT(*) as count FROM hostels WHERE status = ?').get('booked').count
    };

    const recentReservations = db.prepare(`
        SELECT r.*, h.name as hostel_name, u.name as user_name
        FROM reservations r
        JOIN hostels h ON r.hostel_id = h.id
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC LIMIT 5
    `).all();

    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        layout: 'layouts/admin',
        stats,
        recentReservations
    });
});

// Admin - Manage hostels
app.get('/admin/hostels', isAdmin, (req, res) => {
    const hostels = db.prepare('SELECT * FROM hostels ORDER BY created_at DESC').all();

    res.render('admin/hostels', {
        title: 'Manage Hostels',
        layout: 'layouts/admin',
        hostels
    });
});

// Admin - Add hostel form
app.get('/admin/hostels/new', isAdmin, (req, res) => {
    res.render('admin/hostel-form', {
        title: 'Add New Hostel',
        layout: 'layouts/admin',
        hostel: null
    });
});

// Admin - Add hostel submit
app.post('/admin/hostels', isAdmin, upload.array('files', 10), (req, res) => {
    const { name, description, location, address, price, amenities, rooms, status, featured } = req.body;

    const images = [];
    const videos = [];

    if (req.files) {
        req.files.forEach(file => {
            const filePath = '/uploads/' + file.filename;
            if (file.mimetype.startsWith('video/')) {
                videos.push(filePath);
            } else {
                images.push(filePath);
            }
        });
    }

    try {
        db.prepare(`
            INSERT INTO hostels (name, description, location, address, price, amenities, images, videos, rooms, status, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            description,
            location,
            address || '',
            parseFloat(price),
            JSON.stringify(amenities ? amenities.split(',').map(a => a.trim()) : []),
            JSON.stringify(images),
            JSON.stringify(videos),
            parseInt(rooms) || 1,
            status || 'available',
            featured ? 1 : 0
        );

        req.flash('success', 'Hostel added successfully!');
        res.redirect('/admin/hostels');

    } catch (error) {
        console.error('Add hostel error:', error);
        req.flash('error', 'Failed to add hostel');
        res.redirect('/admin/hostels/new');
    }
});

// Admin - Edit hostel form
app.get('/admin/hostels/edit/:id', isAdmin, (req, res) => {
    const hostel = db.prepare('SELECT * FROM hostels WHERE id = ?').get(req.params.id);

    if (!hostel) {
        req.flash('error', 'Hostel not found');
        return res.redirect('/admin/hostels');
    }

    hostel.amenities = JSON.parse(hostel.amenities || '[]');
    hostel.images = JSON.parse(hostel.images || '[]');
    hostel.videos = JSON.parse(hostel.videos || '[]');

    res.render('admin/hostel-form', {
        title: 'Edit Hostel',
        layout: 'layouts/admin',
        hostel
    });
});

// Admin - Update hostel
app.post('/admin/hostels/edit/:id', isAdmin, upload.array('files', 10), (req, res) => {
    const hostel = db.prepare('SELECT * FROM hostels WHERE id = ?').get(req.params.id);

    if (!hostel) {
        req.flash('error', 'Hostel not found');
        return res.redirect('/admin/hostels');
    }

    const { name, description, location, address, price, amenities, rooms, status, featured, remove_images, remove_videos } = req.body;

    let images = JSON.parse(hostel.images || '[]');
    let videos = JSON.parse(hostel.videos || '[]');

    // Remove selected files
    if (remove_images) {
        const toRemove = Array.isArray(remove_images) ? remove_images : [remove_images];
        images = images.filter(img => !toRemove.includes(img));
    }
    if (remove_videos) {
        const toRemove = Array.isArray(remove_videos) ? remove_videos : [remove_videos];
        videos = videos.filter(vid => !toRemove.includes(vid));
    }

    // Add new files
    if (req.files) {
        req.files.forEach(file => {
            const filePath = '/uploads/' + file.filename;
            if (file.mimetype.startsWith('video/')) {
                videos.push(filePath);
            } else {
                images.push(filePath);
            }
        });
    }

    try {
        db.prepare(`
            UPDATE hostels SET 
                name = ?, description = ?, location = ?, address = ?, 
                price = ?, amenities = ?, images = ?, videos = ?,
                rooms = ?, status = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name,
            description,
            location,
            address || '',
            parseFloat(price),
            JSON.stringify(amenities ? amenities.split(',').map(a => a.trim()) : []),
            JSON.stringify(images),
            JSON.stringify(videos),
            parseInt(rooms) || 1,
            status || 'available',
            featured ? 1 : 0,
            req.params.id
        );

        req.flash('success', 'Hostel updated successfully!');
        res.redirect('/admin/hostels');

    } catch (error) {
        console.error('Update hostel error:', error);
        req.flash('error', 'Failed to update hostel');
        res.redirect(`/admin/hostels/edit/${req.params.id}`);
    }
});

// Admin - Delete hostel
app.post('/admin/hostels/delete/:id', isAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM hostels WHERE id = ?').run(req.params.id);
        req.flash('success', 'Hostel deleted successfully!');
    } catch (error) {
        console.error('Delete hostel error:', error);
        req.flash('error', 'Failed to delete hostel');
    }
    res.redirect('/admin/hostels');
});

// Admin - Toggle hostel status
app.post('/admin/hostels/toggle-status/:id', isAdmin, (req, res) => {
    const hostel = db.prepare('SELECT status FROM hostels WHERE id = ?').get(req.params.id);

    if (hostel) {
        const newStatus = hostel.status === 'available' ? 'booked' : 'available';
        db.prepare('UPDATE hostels SET status = ? WHERE id = ?').run(newStatus, req.params.id);
        req.flash('success', `Hostel marked as ${newStatus}`);
    }

    res.redirect('/admin/hostels');
});

// Admin - Reservations
app.get('/admin/reservations', isAdmin, (req, res) => {
    const { status, search } = req.query;

    let query = `
        SELECT r.*, h.name as hostel_name, h.location, u.name as user_name
        FROM reservations r
        JOIN hostels h ON r.hostel_id = h.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
        query += ' AND r.status = ?';
        params.push(status);
    }
    if (search) {
        query += ' AND (r.guest_name LIKE ? OR r.guest_email LIKE ? OR h.name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.created_at DESC';

    const reservations = db.prepare(query).all(...params);

    res.render('admin/reservations', {
        title: 'Manage Reservations',
        layout: 'layouts/admin',
        reservations,
        filters: req.query
    });
});

// Admin - Update reservation status
app.post('/admin/reservations/status/:id', isAdmin, (req, res) => {
    const { status } = req.body;

    try {
        db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
        req.flash('success', 'Reservation status updated!');
    } catch (error) {
        req.flash('error', 'Failed to update status');
    }

    res.redirect('/admin/reservations');
});

// Admin - Delete reservation
app.post('/admin/reservations/delete/:id', isAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
        req.flash('success', 'Reservation deleted!');
    } catch (error) {
        req.flash('error', 'Failed to delete reservation');
    }
    res.redirect('/admin/reservations');
});

// Admin - Users
app.get('/admin/users', isAdmin, (req, res) => {
    const users = db.prepare(`
        SELECT u.*, 
            (SELECT COUNT(*) FROM reservations WHERE user_id = u.id OR guest_email = u.email) as reservation_count
        FROM users 
        WHERE role = 'user'
        ORDER BY created_at DESC
    `).all();

    res.render('admin/users', {
        title: 'Manage Users',
        layout: 'layouts/admin',
        users
    });
});

// Admin - Delete user
app.post('/admin/users/delete/:id', isAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ? AND role != ?').run(req.params.id, 'admin');
        req.flash('success', 'User deleted!');
    } catch (error) {
        req.flash('error', 'Failed to delete user');
    }
    res.redirect('/admin/users');
});

// Admin - Settings
app.get('/admin/settings', isAdmin, (req, res) => {
    const settings = db.prepare('SELECT * FROM settings LIMIT 1').get();
    const paymentInfo = db.prepare('SELECT * FROM payment_info LIMIT 1').get();

    res.render('admin/settings', {
        title: 'Settings',
        layout: 'layouts/admin',
        siteSettings: settings,
        paymentInfo
    });
});

// Admin - Update settings
app.post('/admin/settings', isAdmin, (req, res) => {
    const {
        site_name, site_tagline, contact_email, contact_phone, contact_address, about_text,
        bank_name, account_number, account_name, momo_provider, momo_number, momo_name, instructions
    } = req.body;

    try {
        // Update site settings
        db.prepare(`
            UPDATE settings SET
                site_name = ?, site_tagline = ?, contact_email = ?, 
                contact_phone = ?, contact_address = ?, about_text = ?
        `).run(site_name, site_tagline, contact_email, contact_phone, contact_address, about_text);

        // Update payment info
        db.prepare(`
            UPDATE payment_info SET
                bank_name = ?, account_number = ?, account_name = ?,
                momo_provider = ?, momo_number = ?, momo_name = ?, instructions = ?
        `).run(bank_name, account_number, account_name, momo_provider, momo_number, momo_name, instructions);

        req.flash('success', 'Settings updated successfully!');
    } catch (error) {
        console.error('Settings error:', error);
        req.flash('error', 'Failed to update settings');
    }

    res.redirect('/admin/settings');
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🏨 HostelHub Server Running        ║
    ║                                        ║
    ║     Local: http://localhost:${PORT}       ║
    ║                                        ║
    ║     Admin: /admin                      ║
    ║     Username: admin@example.com        ║
    ║     Password: admin123                 ║
    ╚════════════════════════════════════════╝
    `);
});

module.exports = app;

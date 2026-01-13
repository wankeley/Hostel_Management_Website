const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database
const db = new Database(path.join(__dirname, 'data.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Hostels table
    db.exec(`
        CREATE TABLE IF NOT EXISTS hostels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            location TEXT,
            address TEXT,
            price REAL NOT NULL,
            amenities TEXT,
            images TEXT,
            videos TEXT,
            rooms INTEGER DEFAULT 1,
            status TEXT DEFAULT 'available',
            featured INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Reservations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hostel_id INTEGER NOT NULL,
            user_id INTEGER,
            guest_name TEXT NOT NULL,
            guest_email TEXT NOT NULL,
            guest_phone TEXT NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            guests INTEGER DEFAULT 1,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Payment info table
    db.exec(`
        CREATE TABLE IF NOT EXISTS payment_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_name TEXT,
            account_number TEXT,
            account_name TEXT,
            momo_provider TEXT,
            momo_number TEXT,
            momo_name TEXT,
            instructions TEXT,
            is_active INTEGER DEFAULT 1
        )
    `);

    // Site settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_name TEXT DEFAULT 'HostelHub',
            site_tagline TEXT DEFAULT 'Find Your Perfect Stay',
            contact_email TEXT,
            contact_phone TEXT,
            contact_address TEXT,
            about_text TEXT,
            footer_text TEXT
        )
    `);

    // Create admin user if not exists
    const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
    if (!adminExists) {
        const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
        db.prepare(`
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
        `).run(
            'Administrator',
            process.env.ADMIN_EMAIL || 'admin@example.com',
            hashedPassword,
            'admin'
        );
        console.log('✅ Admin user created');
    }

    // Create default payment info if not exists
    const paymentExists = db.prepare('SELECT id FROM payment_info LIMIT 1').get();
    if (!paymentExists) {
        db.prepare(`
            INSERT INTO payment_info (bank_name, account_number, account_name, momo_provider, momo_number, momo_name, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            'Ghana Commercial Bank',
            '1234567890',
            'HostelHub Ltd',
            'MTN Mobile Money',
            '0241234567',
            'HostelHub',
            'Please include your booking reference in the payment description.'
        );
        console.log('✅ Default payment info created');
    }

    // Create default settings if not exists
    const settingsExist = db.prepare('SELECT id FROM settings LIMIT 1').get();
    if (!settingsExist) {
        db.prepare(`
            INSERT INTO settings (site_name, site_tagline, contact_email, contact_phone, about_text)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            'HostelHub',
            'Find Your Perfect Stay',
            'info@hostelhub.com',
            '+233 XX XXX XXXX',
            'Welcome to HostelHub - your trusted platform for finding comfortable and affordable hostel accommodations.'
        );
        console.log('✅ Default settings created');
    }

    // Add some sample hostels if none exist
    const hostelCount = db.prepare('SELECT COUNT(*) as count FROM hostels').get();
    if (hostelCount.count === 0) {
        const sampleHostels = [
            {
                name: 'Sunrise Hostel',
                description: 'A beautiful hostel located in the heart of the city. Features modern amenities, comfortable beds, and a friendly atmosphere. Perfect for students and young professionals looking for affordable accommodation.',
                location: 'Accra, Ghana',
                address: '123 Independence Avenue, Accra',
                price: 150,
                amenities: JSON.stringify(['WiFi', 'Air Conditioning', 'Security', 'Laundry', 'Kitchen', 'Study Room']),
                images: JSON.stringify([]),
                status: 'available',
                featured: 1,
                rooms: 5
            },
            {
                name: 'Ocean View Hostel',
                description: 'Experience stunning ocean views from this coastal hostel. Recently renovated rooms with modern facilities. Walking distance to the beach and local attractions.',
                location: 'Cape Coast, Ghana',
                address: '45 Beach Road, Cape Coast',
                price: 200,
                amenities: JSON.stringify(['WiFi', 'Ocean View', 'Restaurant', 'Security', 'Parking']),
                images: JSON.stringify([]),
                status: 'available',
                featured: 1,
                rooms: 8
            },
            {
                name: 'Green Valley Hostel',
                description: 'Peaceful hostel surrounded by nature. Ideal for those seeking a quiet environment for studying or relaxation. Eco-friendly facilities and organic meals available.',
                location: 'Kumasi, Ghana',
                address: '78 Garden Street, Kumasi',
                price: 120,
                amenities: JSON.stringify(['WiFi', 'Garden', 'Organic Meals', 'Study Area', 'Bicycle Rental']),
                images: JSON.stringify([]),
                status: 'booked',
                featured: 0,
                rooms: 3
            }
        ];

        const insert = db.prepare(`
            INSERT INTO hostels (name, description, location, address, price, amenities, images, status, featured, rooms)
            VALUES (@name, @description, @location, @address, @price, @amenities, @images, @status, @featured, @rooms)
        `);

        for (const hostel of sampleHostels) {
            insert.run(hostel);
        }
        console.log('✅ Sample hostels created');
    }

    console.log('✅ Database initialized successfully');
}

module.exports = { db, initializeDatabase };

# 🏨 HostelHub - Modern Hostel Booking Website

A beautiful, full-featured hostel booking platform with client-facing pages and comprehensive admin dashboard.

## ✨ Features

### For Guests
- 🏠 Browse hostels with beautiful card layouts
- 🔍 Search and filter hostels by location, price, availability
- 📷 View hostel images and videos
- 📝 Easy reservation form
- 💳 Clear payment instructions (Bank + Mobile Money)
- 👤 User registration and profile

### For Admin
- 📊 Dashboard with statistics
- 🏨 Add/Edit/Delete hostels
- 📁 Upload images and videos
- 📅 View and manage reservations
- 👥 View registered users
- ⚙️ Update site settings and payment info
- 📧 Email notifications for new bookings

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Choose the LTS version
   - Run the installer

2. **Install Dependencies**
   ```bash
   cd "c:\Users\DONEX\Desktop\Hostel Website"
   npm install
   ```

3. **Configure Environment**
   - Edit `.env` file with your settings:
   ```
   ADMIN_EMAIL=your-email@gmail.com
   ADMIN_PASSWORD=your-secure-password
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```

4. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open in Browser**
   - Website: http://localhost:3000
   - Admin: http://localhost:3000/admin

### Default Admin Login
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Change these in production!**

## 📁 Project Structure

```
hostel-website/
├── public/              # Static files
│   ├── css/style.css    # All styles
│   ├── js/main.js       # Client JavaScript
│   └── uploads/         # Uploaded files
├── views/               # EJS templates
│   ├── layouts/         # Page layouts
│   ├── pages/           # Public pages
│   └── admin/           # Admin pages
├── services/            # Services
│   └── email.js         # Email notifications
├── server.js            # Main server
├── database.js          # Database setup
├── .env                 # Environment variables
└── package.json
```

## 🌐 Deployment on Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js and deploy!

### Step 3: Add Environment Variables
In Railway dashboard, go to your project → Variables → Add:
```
SESSION_SECRET=your-super-secret-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-password-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SITE_URL=https://your-app.railway.app
```

### Step 4: Done! 🎉
Your site is live at `https://your-app.railway.app`

## 📧 Email Setup (Gmail)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use this password in `EMAIL_PASS`

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Templates**: EJS
- **Styling**: Custom CSS
- **Icons**: Lucide Icons
- **Email**: Nodemailer

## 📝 License

MIT License - feel free to use this project for your own purposes!

---

Made with ❤️ for hostel owners and guests

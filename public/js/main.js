// Main JavaScript file

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all components
    initNavbar();
    initAlerts();
    initFileUpload();
    initHeroParticles();
    initMobileNav();
    initImageGallery();
});

// Navbar scroll effect
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Mobile navigation toggle
function initMobileNav() {
    const toggle = document.querySelector('.navbar-toggle');
    const nav = document.querySelector('.navbar-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            nav.classList.toggle('active');
        });
    }
}

// Auto-dismiss alerts
function initAlerts() {
    const alerts = document.querySelectorAll('.alert[data-dismiss="auto"]');

    alerts.forEach(function (alert) {
        setTimeout(function () {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(function () {
                alert.remove();
            }, 300);
        }, 5000);
    });
}

// File upload with drag and drop
function initFileUpload() {
    const fileUploadAreas = document.querySelectorAll('.file-upload');

    fileUploadAreas.forEach(function (area) {
        const input = area.querySelector('input[type="file"]');

        if (!input) return;

        // Click to upload
        area.addEventListener('click', function () {
            input.click();
        });

        // Drag and drop
        area.addEventListener('dragover', function (e) {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', function (e) {
            e.preventDefault();
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', function (e) {
            e.preventDefault();
            area.classList.remove('dragover');

            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                updateFilePreview(area, e.dataTransfer.files);
            }
        });

        // File selection
        input.addEventListener('change', function () {
            updateFilePreview(area, input.files);
        });
    });
}

function updateFilePreview(area, files) {
    let preview = area.querySelector('.file-preview');

    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.style.cssText = 'margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;';
        area.appendChild(preview);
    }

    preview.innerHTML = '';

    Array.from(files).forEach(function (file) {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 0.5rem 0.75rem; background: var(--gray-100); border-radius: var(--radius); font-size: 0.875rem;';
        item.textContent = file.name;
        preview.appendChild(item);
    });
}

// Hero particles animation
function initHeroParticles() {
    const particlesContainer = document.querySelector('.hero-particles');

    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'hero-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Image gallery lightbox
function initImageGallery() {
    const galleryImages = document.querySelectorAll('.gallery-image');

    galleryImages.forEach(function (img) {
        img.addEventListener('click', function () {
            openLightbox(img.src, img.alt);
        });
    });
}

function openLightbox(src, alt) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: zoom-out;
    `;

    lightbox.innerHTML = `
        <img src="${src}" alt="${alt}" style="max-width: 90%; max-height: 90%; object-fit: contain;">
        <button style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;">&times;</button>
    `;

    lightbox.addEventListener('click', function () {
        lightbox.remove();
    });

    document.body.appendChild(lightbox);
}

// Confirm delete
function confirmDelete(message) {
    return confirm(message || 'Are you sure you want to delete this item?');
}

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Format currency
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
        showToast('Copied to clipboard!');
    });
}

// Simple toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, 3000);
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

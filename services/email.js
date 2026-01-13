const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send reservation notification to admin
const sendReservationNotification = async (data) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Email not configured, skipping notification');
        return;
    }

    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    // Email to admin
    const adminMailOptions = {
        from: `"HostelHub" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `🏨 New Reservation: ${data.hostelName}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🏨 New Reservation</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #0d9488; margin-top: 0;">${data.hostelName}</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Guest Name</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${data.guestName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${data.guestEmail}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Phone</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${data.guestPhone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Check-in</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${data.checkIn}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #6b7280;">Check-out</td>
                            <td style="padding: 12px 0; font-weight: 600;">${data.checkOut}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin/reservations" 
                           style="background: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                            View Reservations
                        </a>
                    </div>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                    This is an automated message from HostelHub
                </p>
            </div>
        `
    };

    await transporter.sendMail(adminMailOptions);

    // Email to guest
    const guestMailOptions = {
        from: `"HostelHub" <${process.env.EMAIL_USER}>`,
        to: data.guestEmail,
        subject: `✅ Reservation Confirmed - ${data.hostelName}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Reservation Confirmed</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #374151;">Dear ${data.guestName},</p>
                    <p style="color: #6b7280;">Thank you for your reservation at <strong>${data.hostelName}</strong>.</p>
                    
                    <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #0d9488; margin-top: 0;">Booking Details</h3>
                        <p style="margin: 5px 0;"><strong>Booking ID:</strong> #${data.reservationId}</p>
                        <p style="margin: 5px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                        <p style="margin: 5px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                    </div>
                    
                    <p style="color: #6b7280;">Please proceed with payment to confirm your booking. You can view payment details on our website.</p>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/payment-info" 
                           style="background: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                            View Payment Details
                        </a>
                    </div>
                </div>
                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                    HostelHub - Find Your Perfect Stay
                </p>
            </div>
        `
    };

    await transporter.sendMail(guestMailOptions);

    console.log('✅ Email notifications sent successfully');
};

module.exports = { sendReservationNotification };

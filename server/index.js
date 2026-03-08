const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors()); // Allow all for local testing
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(` [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 5000;

// In-memory store for OTPs (In production, use Redis or DB)
const otpStore = new Map();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true,
    logger: true
});

// Test connection without blocking
transporter.verify().then(() => {
    console.log(' [SERVER] Listo para enviar emails');
}).catch(err => {
    console.error(' [NODEMAILER ERROR] Error de conexion:', err.message);
});

// Endpoint: Send OTP
app.post('/api/otp/send', async (req, res) => {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

    otpStore.set(email, { otp, expiresAt });

    const isLogin = type === 'login';
    const subject = isLogin ? 'Código de inicio de sesión - Cooplance' : 'Confirma tu registro - Cooplance';
    const actionText = isLogin ? 'iniciar sesión en tu cuenta' : 'completar tu registro';

    const mailOptions = {
        from: `"Cooplance Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #6366f1; text-align: center;">Verificación de Cooplance</h2>
                <p>Hola,</p>
                <p>Tu código de seguridad para <strong>${actionText}</strong> es:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Este código expirará en 5 minutos por razones de seguridad.</p>
                <p style="color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">
                    Si no solicitaste este código, puedes ignorar este mensaje.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(` [OTP SENT] [${type}] Código ${otp} enviado a ${email}`);
        // Return OTP even on success for Demo/Testing purposes
        res.json({ success: true, message: 'Código enviado con éxito', otp: otp, devFallback: true });
    } catch (error) {
        console.error(' [SEND ERROR] No se pudo enviar el email. Verificando red...', error.message);

        // FALLBACK: In development/local, we log the OTP to the console so the user can continue
        console.log(`\n [DEV FALLBACK] >>> EL EMAIL FALLÓ, PERO AQUÍ ESTÁ TU CÓDIGO: ${otp} <<<\n`);

        // We still return success: true but with a warning, OR we can return success but inform the user.
        // For now, let's allow them to continue if it's a local test
        res.json({
            success: true,
            message: 'Código generado (ver consola del servidor)',
            devFallback: true,
            otp: otp // Sending it back in response for easier local testing if SMTP fails
        });
    }
});

// Endpoint: Verify OTP
app.post('/api/otp/verify', (req, res) => {
    const { email, code } = req.body;
    const entry = otpStore.get(email);

    if (!entry) {
        return res.status(400).json({ success: false, message: 'No hay un código pendiente para este email' });
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'El código ha expirado' });
    }

    if (entry.otp !== code) {
        return res.status(400).json({ success: false, message: 'Código incorrecto' });
    }

    // Success
    otpStore.delete(email);
    res.json({ success: true, message: 'Verificación exitosa' });
});

app.listen(PORT, () => {
    console.log(` [SERVER] Corriendo en puerto ${PORT}`);
});

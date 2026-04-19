const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// 1. HELMET: Adds secure HTTP headers
app.use(helmet());

// 2. CORS: Strict configuration
const allowedOrigins = [
    'https://cooplance.vercel.app', 
    'http://localhost:5173', // Vite Frontend local
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, postman, server-to-server) 
        // or strictly allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS (Política estricta)'));
        }
    },
    methods: ['POST', 'OPTIONS'], // Limitar métodos (el microservicio solo usa POST actualmente)
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 3. SIZE LIMIT. Previne Buffer Overflow DOS. Sanitiza el tamaño del body.
app.use(express.json({ limit: '10kb' })); 

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

// 4. RATE LIMITING GENERAL
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // max 100 peticiones por IP en 15 mins
    message: { success: false, message: 'Demasiadas peticiones a la API desde esta IP, por favor intenta de nuevo en 15 minutos.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.use(generalLimiter);

// 5. RATE LIMITING ESPECÍFICO PARA ENVÍO DE CORREOS
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // Límite estricto: máximo 5 correos enviados por IP cada hora
    message: { success: false, message: 'Has excedido el límite de solicitudes de códigos. Por seguridad, intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 6. RATE LIMITING ÚNICO PARA ACCESO ADMIN (Máxima seguridad)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Límite estricto: 5 intentos cada 15 minutos
    message: { success: false, message: 'Demasiados intentos de acceso administrativo. Intenta en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Endpoint: Send OTP
app.post('/api/otp/send', otpLimiter, async (req, res) => {
    const { email, type } = req.body;
    
    // 6. SANITIZACIÓN ESTRICTA DEL INPUT
    if (!email || typeof email !== 'string' || email.length > 254) {
        return res.status(400).json({ success: false, message: 'Email inválido o requerido' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Formato de email incorrecto' });
    }

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
        res.json({ success: true, message: 'Código enviado con éxito', otp: otp, devFallback: true });
    } catch (error) {
        console.error(' [SEND ERROR] No se pudo enviar el email. Verificando red...', error.message);
        console.log(`\n [DEV FALLBACK] >>> EL EMAIL FALLÓ, PERO AQUÍ ESTÁ TU CÓDIGO: ${otp} <<<\n`);
        res.json({
            success: true,
            message: 'Código generado (ver consola del servidor)',
            devFallback: true,
            otp: otp 
        });
    }
});

// Endpoint: Verify OTP
app.post('/api/otp/verify', (req, res) => {
    const { email, code } = req.body;
    
    // BASIC SANITIZATION
    if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
         return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

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

// Endpoint: Admin Login (Server-side validation)
app.post('/api/admin/auth', adminLimiter, (req, res) => {
    const { passcode } = req.body;
    const masterPasscode = process.env.ADMIN_MASTER_PASSCODE || 'SigloGracia'; // Fallback for safety

    if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, message: 'Passcode requerido' });
    }

    if (passcode === masterPasscode) {
        console.log(` [ADMIN ACCESS] Acceso concedido [${new Date().toLocaleString()}]`);
        return res.json({ success: true, message: 'Acceso autorizado' });
    } else {
        console.warn(` [ADMIN DENIED] Intento fallido con: ${passcode}`);
        return res.status(401).json({ success: false, message: 'Código incorrecto' });
    }
});

app.listen(PORT, () => {
    console.log(` [SERVER] Corriendo en puerto ${PORT}`);
});

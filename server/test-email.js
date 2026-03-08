const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

async function testEmail() {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Intentando verificar conexion...');
        await transporter.verify();
        console.log('Conexion exitosa!');

        console.log('Intentando enviar email de prueba a:', process.env.EMAIL_USER);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'Test Email from Cooplance',
            text: 'Si recibes esto, el servidor de correo funciona correctamente.'
        });
        console.log('Email enviado correctamente!');
    } catch (error) {
        console.error('ERROR DETALLADO:', error);
    }
}

testEmail();

// Envío de correos (confirmación de cuenta) con Nodemailer y el servidor SMTP del .env.
// Si EMAIL_HOST no está configurado (desarrollo), el enlace se muestra en la consola de la API.
import nodemailer from 'nodemailer';

const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let transporte = null;
const obtenerTransporte = () => {
    if (!process.env.EMAIL_HOST) return null;
    transporte ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    return transporte;
};

// Dirección pública del proyecto lonja-cliente (el enlace del correo abre una página del cliente)
export const urlCliente = () => (process.env.URL_CLIENTE || 'http://localhost:3000').replace(/\/+$/, '');

export const enviarCorreoConfirmacion = async ({ correo, nombre, nombre_usuario, token }) => {
    const enlace = `${urlCliente()}/confirmar/${token}`;
    const transporteActual = obtenerTransporte();
    if (!transporteActual) {
        console.log(`[correo no configurado] Enlace de confirmación para ${nombre_usuario}: ${enlace}`);
        return;
    }
    await transporteActual.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: correo,
        subject: 'Confirma tu cuenta de comprador - Lonja Veracruz',
        text: `Hola ${nombre}:\n\nCreaste la cuenta de comprador "${nombre_usuario}" en la Lonja de Veracruz.\n`
            + `Para activarla abre este enlace (vence en 24 horas):\n\n${enlace}\n\n`
            + 'Si no creaste esta cuenta, ignora este correo.',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#20354A">
                <div style="background:#0D3274;color:#fff;padding:18px 24px;border-bottom:4px solid #2FA9A0">
                    <strong style="font-size:20px">Lonja Veracruz</strong>
                </div>
                <div style="padding:24px;border:1px solid #DCE7EA;border-top:0">
                    <p>Hola ${escapar(nombre)}:</p>
                    <p>Creaste la cuenta de comprador <strong>${escapar(nombre_usuario)}</strong>. Para activarla, confirma tu correo:</p>
                    <p style="text-align:center;margin:28px 0">
                        <a href="${escapar(enlace)}" style="background:#2FA9A0;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar mi cuenta</a>
                    </p>
                    <p style="font-size:13px;color:#607484">El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este correo.</p>
                </div>
            </div>`
    });
};

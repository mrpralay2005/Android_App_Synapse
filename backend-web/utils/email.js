import nodemailer from 'nodemailer';

const getAccessToken = async (env) => {
    const url = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Neural Mail Identity Failure:", error);
        throw new Error("SMTP Auth Failure");
    }
};

const createTransporter = async (env) => {
    const accessToken = await getAccessToken(env);
    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            type: "OAuth2",
            user: env.EMAIL_USER,
            clientId: env.GMAIL_CLIENT_ID,
            clientSecret: env.GMAIL_CLIENT_SECRET,
            refreshToken: env.GMAIL_REFRESH_TOKEN,
            accessToken,
        }
    });
};

export const sendOTP = async (email, otp, env) => {
    try {
        const transporter = await createTransporter(env);
        const mailOptions = {
            from: `"SynapseX Neural Core" <${env.EMAIL_USER}>`,
            to: email,
            subject: "Neural Access Verification Code",
            html: `
                <div style="background-color: #050505; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; text-align: center; border: 1px solid #10b981;">
                    <h1 style="color: #10b981; font-size: 24px; letter-spacing: 2px;">SYNAPSEX VERIFICATION</h1>
                    <p style="color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Initial Uplink Detected</p>
                    <div style="margin: 30px 0; padding: 20px; border: 1px dashed #10b981; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 10px;">${otp}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 12px;">This neural access code will expire in 10 minutes.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Neural Mail Delivery Failure:", error);
        return false;
    }
};

export const sendResetOTP = async (email, otp, env) => {
    try {
        const transporter = await createTransporter(env);
        const mailOptions = {
            from: `"SynapseX Security" <${env.EMAIL_USER}>`,
            to: email,
            subject: "Neural Key Reset Authorization",
            html: `
                <div style="background-color: #050505; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; text-align: center; border: 1px solid #10b981;">
                    <h1 style="color: #10b981; font-size: 24px; letter-spacing: 2px;">NEURAL KEY RECOVERY</h1>
                    <div style="margin: 30px 0; padding: 20px; border: 1px dashed #10b981; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 10px;">${otp}</span>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Recovery Mail Delivery Failure:", error);
        return false;
    }
};

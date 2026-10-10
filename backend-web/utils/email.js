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

const baseTemplate = ({ icon, title, subtitle, otpLabel, otp, footerNote }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Nexus Social</title>
  <style>
    /* Desktop: centered card with max-width */
    .wrapper { padding: 32px 16px !important; }
    .card { max-width: 480px !important; border-radius: 20px !important; }
    .card-body { padding: 32px 40px 24px !important; }
    .footer-cell { padding: 16px 40px 24px !important; }
    .brand-text { font-size: 12px !important; letter-spacing: 4px !important; }
    .icon-wrap { width: 56px !important; height: 56px !important; line-height: 56px !important; font-size: 24px !important; }
    .title { font-size: 22px !important; }
    .subtitle { font-size: 13px !important; }
    .otp-label { font-size: 10px !important; }
    .digit-box { width: 44px !important; height: 54px !important; line-height: 54px !important; font-size: 26px !important; border-radius: 10px !important; padding: 0 4px !important; }
    .digit-wrap { padding: 0 4px !important; }
    .expiry-pill { font-size: 12px !important; padding: 7px 16px !important; }
    .footer-text { font-size: 11px !important; }
    .bottom-brand { font-size: 11px !important; padding-top: 14px !important; }

    /* Mobile: tighter everything */
    @media only screen and (max-width: 480px) {
      .wrapper { padding: 16px 8px !important; }
      .card { border-radius: 16px !important; width: 100% !important; }
      .card-body { padding: 22px 20px 16px !important; }
      .footer-cell { padding: 12px 20px 18px !important; }
      .brand-text { font-size: 10px !important; letter-spacing: 3px !important; padding-bottom: 16px !important; }
      .icon-wrap { width: 46px !important; height: 46px !important; line-height: 46px !important; font-size: 20px !important; margin-bottom: 12px !important; }
      .title { font-size: 18px !important; padding-bottom: 4px !important; }
      .subtitle { font-size: 12px !important; padding-bottom: 20px !important; }
      .otp-label { font-size: 9px !important; padding-bottom: 8px !important; }
      .digit-box { width: 36px !important; height: 46px !important; line-height: 46px !important; font-size: 22px !important; border-radius: 8px !important; }
      .digit-wrap { padding: 0 3px !important; }
      .expiry-pill { font-size: 11px !important; padding: 6px 14px !important; margin-top: 16px !important; }
      .footer-text { font-size: 10px !important; }
      .bottom-brand { font-size: 10px !important; padding-top: 10px !important; }
      .divider { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0eeff;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  class="wrapper"
  style="background:linear-gradient(150deg,#ede9fe 0%,#fce7f3 55%,#e0e7ff 100%);padding:32px 16px;">
  <tr>
    <td align="center" valign="top">

      <!-- CARD -->
      <table role="presentation" class="card" width="480" cellpadding="0" cellspacing="0" border="0"
        style="width:480px;max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e9d5ff;">

        <!-- Top gradient bar -->
        <tr>
          <td height="4" style="background:linear-gradient(90deg,#7c3aed,#a855f7,#ec4899,#f97316);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="card-body" style="padding:32px 40px 24px;text-align:center;">

            <!-- Brand -->
            <p class="brand-text" style="margin:0 0 24px;font-size:12px;font-weight:700;letter-spacing:4px;color:#7c3aed;text-transform:uppercase;">✦ NEXUS SOCIAL ✦</p>

            <!-- Icon -->
            <div class="icon-wrap" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);text-align:center;line-height:56px;font-size:24px;margin:0 auto 16px;">${icon}</div>

            <!-- Title -->
            <h1 class="title" style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1e1b4b;">${title}</h1>
            <p class="subtitle" style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.5;">${subtitle}</p>

            <!-- OTP label -->
            <p class="otp-label" style="margin:0 0 10px;font-size:10px;font-weight:600;letter-spacing:3px;color:#9ca3af;text-transform:uppercase;">${otpLabel}</p>

            <!-- OTP digit boxes -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 20px;">
              <tr>
                ${otp.toString().split('').map(digit => `
                <td class="digit-wrap" style="padding:0 4px;">
                  <div class="digit-box" style="width:44px;height:54px;background:linear-gradient(145deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:10px;text-align:center;line-height:54px;font-size:26px;font-weight:900;color:#4c1d95;font-family:'Courier New',monospace;">${digit}</div>
                </td>`).join('')}
              </tr>
            </table>

            <!-- Expiry pill -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td class="expiry-pill" style="background:#fef3c7;border:1px solid #fde68a;border-radius:50px;padding:7px 16px;">
                  <span style="font-size:12px;color:#92400e;font-weight:600;">⏱ Expires in 10 minutes</span>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Divider -->
        <tr class="divider">
          <td style="padding:0 40px;">
            <div style="height:1px;background:linear-gradient(90deg,#fff,#e9d5ff,#fff);"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="footer-cell" style="padding:16px 40px 24px;text-align:center;background:#fafafa;border-top:1px solid #f3f4f6;">
            <p class="footer-text" style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">${footerNote}</p>
          </td>
        </tr>

      </table>
      <!-- END CARD -->

      <!-- Bottom brand -->
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td class="bottom-brand" align="center" style="padding-top:14px;">
            <p style="margin:0;font-size:11px;color:#6b7280;">
              <span style="color:#7c3aed;font-weight:700;">Nexus Social</span> &nbsp;·&nbsp; nexus-social-co.me
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>
`;

export const sendOTP = async (email, otp, env) => {
    try {
        const transporter = await createTransporter(env);
        await transporter.sendMail({
            from: `"Nexus Social" <noreply@nexus-social-co.me>`,
            to: email,
            subject: "Your Nexus Social verification code",
            html: baseTemplate({
                icon: '🔐',
                title: 'Verify Your Identity',
                subtitle: 'Enter this code to complete your sign in.',
                otpLabel: 'Your one-time code',
                otp,
                footerNote: 'This code was requested for your Nexus Social account. Never share it — our team will never ask for this.',
            })
        });
        return true;
    } catch (error) {
        console.error("Neural Mail Delivery Failure:", error);
        return false;
    }
};

export const sendResetOTP = async (email, otp, env) => {
    try {
        const transporter = await createTransporter(env);
        await transporter.sendMail({
            from: `"Nexus Social" <noreply@nexus-social-co.me>`,
            to: email,
            subject: "Reset your Nexus Social password",
            html: baseTemplate({
                icon: '🔑',
                title: 'Password Reset',
                subtitle: 'We received a request to reset your password.',
                otpLabel: 'Reset verification code',
                otp,
                footerNote: 'If you did not request a password reset, ignore this email. Your account remains secure.',
            })
        });
        return true;
    } catch (error) {
        console.error("Recovery Mail Delivery Failure:", error);
        return false;
    }
};

export const sendEmailChangeOTP = async (email, otp, env) => {
    try {
        const transporter = await createTransporter(env);
        await transporter.sendMail({
            from: `"Nexus Social" <noreply@nexus-social-co.me>`,
            to: email,
            subject: "Confirm your new email address",
            html: baseTemplate({
                icon: '✉️',
                title: 'Confirm Email Change',
                subtitle: 'Enter this code to confirm your new email address.',
                otpLabel: 'Confirmation code',
                otp,
                footerNote: 'If you did not request an email change, contact Nexus Social support immediately.',
            })
        });
        return true;
    } catch (error) {
        console.error("Email Change Delivery Failure:", error);
        return false;
    }
};

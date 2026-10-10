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

const baseTemplate = ({ title, subtitle, otpLabel, otp, footerNote, accentColor = '#a855f7' }) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f13;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header Brand Bar -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);border-radius:50px;padding:2px;">
                    <div style="background:#0f0f13;border-radius:50px;padding:10px 28px;">
                      <span style="font-size:15px;font-weight:700;letter-spacing:3px;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#a855f7;">NEXUS SOCIAL</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:24px;overflow:hidden;border:1px solid rgba(168,85,247,0.2);box-shadow:0 25px 60px rgba(168,85,247,0.15);">

              <!-- Top Gradient Strip -->
              <tr>
                <td style="background:linear-gradient(90deg,#7c3aed,#a855f7,#ec4899,#f97316);height:4px;display:block;line-height:4px;font-size:4px;">&nbsp;</td>
              </tr>

              <!-- Content Area -->
              <tr>
                <td style="padding:50px 50px 40px;">

                  <!-- Icon Circle -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:28px;">
                        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,rgba(124,58,237,0.3),rgba(236,72,153,0.3));border:1px solid rgba(168,85,247,0.4);display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:72px;">
                          <span style="font-size:30px;">🔐</span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Title -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:10px;">
                        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:1px;background:linear-gradient(135deg,#e2e8f0,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#e2e8f0;">${title}</h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom:36px;">
                        <p style="margin:0;font-size:14px;color:#94a3b8;letter-spacing:0.5px;">${subtitle}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Label -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:14px;">
                        <span style="font-size:11px;font-weight:600;letter-spacing:3px;color:#6b7280;text-transform:uppercase;">${otpLabel}</span>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:36px;">
                        <div style="display:inline-block;background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(236,72,153,0.1));border:1px solid rgba(168,85,247,0.35);border-radius:16px;padding:22px 50px;">
                          <span style="font-size:42px;font-weight:900;letter-spacing:16px;background:linear-gradient(135deg,#ffffff,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#ffffff;font-family:'Courier New',monospace;">${otp}</span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Expiry Note -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:10px;">
                        <div style="display:inline-block;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:10px 20px;">
                          <span style="font-size:13px;color:#fbbf24;">⏱ This code expires in <strong>10 minutes</strong></span>
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:0 50px;">
                  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(168,85,247,0.3),transparent);"></div>
                </td>
              </tr>

              <!-- Footer Note -->
              <tr>
                <td style="padding:28px 50px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.7;">${footerNote}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer Brand -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:12px;color:#374151;">Sent by <span style="color:#a855f7;font-weight:600;">Nexus Social</span> &nbsp;·&nbsp; nexus-social-co.me</p>
              <p style="margin:6px 0 0;font-size:11px;color:#1f2937;">If you didn't request this, you can safely ignore this email.</p>
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
                title: 'Verify Your Identity',
                subtitle: 'Enter this code to complete your sign in',
                otpLabel: 'Your one-time code',
                otp,
                footerNote: 'This code was requested for your Nexus Social account. Do not share it with anyone — our team will never ask for this code.',
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
                title: 'Password Reset',
                subtitle: 'We received a request to reset your password',
                otpLabel: 'Reset verification code',
                otp,
                footerNote: 'If you did not request a password reset, ignore this email. Your account is safe and your password has not been changed.',
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
                title: 'Confirm Email Change',
                subtitle: 'Enter this code to confirm your new email address',
                otpLabel: 'Confirmation code',
                otp,
                footerNote: 'If you did not request an email change on your Nexus Social account, please contact support immediately.',
            })
        });
        return true;
    } catch (error) {
        console.error("Email Change Delivery Failure:", error);
        return false;
    }
};

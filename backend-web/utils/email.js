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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nexus Social</title>
</head>
<body style="margin:0;padding:0;background-color:#f0eeff;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:linear-gradient(160deg,#ede9fe 0%,#fce7f3 50%,#e0e7ff 100%);padding:48px 16px;min-height:100vh;">
    <tr>
      <td align="center" valign="top">

        <!-- Card -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"
          style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e9d5ff;">

          <!-- Top gradient bar -->
          <tr>
            <td height="5" style="background:linear-gradient(90deg,#7c3aed,#a855f7,#ec4899,#f97316);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="padding:44px 48px 36px;text-align:center;">

              <!-- Brand name -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <span style="font-size:13px;font-weight:700;letter-spacing:4px;color:#7c3aed;text-transform:uppercase;">✦ NEXUS SOCIAL ✦</span>
                  </td>
                </tr>
              </table>

              <!-- Icon -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);text-align:center;line-height:64px;font-size:28px;margin:0 auto;">
                      ${icon}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#1e1b4b;letter-spacing:-0.5px;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:36px;">
                    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">${subtitle}</p>
                  </td>
                </tr>
              </table>

              <!-- OTP label -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <span style="font-size:11px;font-weight:600;letter-spacing:3px;color:#9ca3af;text-transform:uppercase;">${otpLabel}</span>
                  </td>
                </tr>
              </table>

              <!-- OTP digits — each digit in its own box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  ${otp.toString().split('').map(digit => `
                  <td style="padding:0 5px;">
                    <div style="width:52px;height:64px;background:linear-gradient(145deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:12px;text-align:center;line-height:64px;font-size:30px;font-weight:900;color:#4c1d95;font-family:'Courier New',monospace;">
                      ${digit}
                    </div>
                  </td>`).join('')}
                </tr>
              </table>

              <!-- Expiry pill -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 36px auto;">
                <tr>
                  <td style="background:#fef3c7;border:1px solid #fde68a;border-radius:50px;padding:8px 20px;">
                    <span style="font-size:13px;color:#92400e;font-weight:600;">⏱ Expires in 10 minutes</span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td height="1" style="background:linear-gradient(90deg,#ffffff,#e9d5ff,#ffffff);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer inside card -->
          <tr>
            <td style="padding:20px 48px 36px;text-align:center;background:#fafafa;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">${footerNote}</p>
            </td>
          </tr>

        </table>
        <!-- End card -->

        <!-- Bottom brand line -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
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
                subtitle: 'Enter this code to complete your sign in to Nexus Social.',
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
                icon: '🔑',
                title: 'Password Reset',
                subtitle: 'We received a request to reset your Nexus Social password.',
                otpLabel: 'Reset verification code',
                otp,
                footerNote: 'If you did not request a password reset, you can safely ignore this email. Your account remains secure.',
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
                subtitle: 'Enter this code to confirm your new email address on Nexus Social.',
                otpLabel: 'Confirmation code',
                otp,
                footerNote: 'If you did not request an email change, please contact Nexus Social support immediately.',
            })
        });
        return true;
    } catch (error) {
        console.error("Email Change Delivery Failure:", error);
        return false;
    }
};

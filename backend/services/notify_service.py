import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()


def notify_asha_worker(patient_name: str, urgency: str,
                       diagnosis: str, asha_email: str) -> str:
    """
    Sends email alert to ASHA worker when urgency is RED.
    Uses Gmail SMTP — completely FREE (500 emails/day).
    """

    sender_email   = os.getenv("GMAIL_SENDER")
    app_password   = os.getenv("GMAIL_APP_PASSWORD")
    receiver_email = asha_email if asha_email else os.getenv("GMAIL_RECEIVER")

    if not sender_email or not app_password:
        print(f"[MOCK EMAIL] Would send to {receiver_email} about {patient_name}")
        return "mock_email_sent"

    urgency_emoji = {
        "RED":    "🔴 EMERGENCY",
        "YELLOW": "🟡 URGENT",
        "GREEN":  "🟢 ROUTINE"
    }.get(urgency, "⚪ UNKNOWN")

    # Build HTML email
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

        <div style="background: #2e7d32; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin:0">🏥 GramSehat Health Alert</h1>
            <p style="margin:5px 0 0 0; opacity:0.85">Rural AI Health Assistant</p>
        </div>

        <div style="padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">

            <div style="background: {'#ffebee' if urgency == 'RED' else '#fff8e1' if urgency == 'YELLOW' else '#e8f5e9'};
                        border-left: 4px solid {'#c62828' if urgency == 'RED' else '#f57f17' if urgency == 'YELLOW' else '#2e7d32'};
                        padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin:0; color: {'#c62828' if urgency == 'RED' else '#f57f17' if urgency == 'YELLOW' else '#2e7d32'}">
                    {urgency_emoji}
                </h2>
            </div>

            <table style="width:100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; font-weight: bold; color: #666; width: 40%">👤 Patient</td>
                    <td style="padding: 10px">{patient_name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; font-weight: bold; color: #666">🩺 Condition</td>
                    <td style="padding: 10px">{diagnosis}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; font-weight: bold; color: #666">⚠️ Urgency</td>
                    <td style="padding: 10px">{urgency}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold; color: #666">📍 Action</td>
                    <td style="padding: 10px">
                        {"🚨 Immediate hospital referral required!" if urgency == "RED"
                          else "PHC visit recommended within 24 hours"}
                    </td>
                </tr>
            </table>

            <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px;
                        font-size: 12px; color: #999; text-align: center;">
                Sent by GramSehat AI · This is AI-assisted triage · Always verify with a doctor
            </div>
        </div>

    </body>
    </html>
    """

    try:
        # Create email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{'🚨 EMERGENCY' if urgency == 'RED' else '⚠️ Alert'} — GramSehat: {patient_name} needs attention"
        msg["From"]    = sender_email
        msg["To"]      = receiver_email

        msg.attach(MIMEText(html_body, "html"))

        # Send via Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, app_password)
            server.sendmail(sender_email, receiver_email, msg.as_string())

        print(f"✅ Email sent to {receiver_email}")
        return "email_sent"

    except Exception as e:
        print(f"❌ Email error: {e}")
        return ""
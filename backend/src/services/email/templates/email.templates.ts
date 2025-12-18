export const welcomeEmailTemplate = (name: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to MathGPT</title>
  <link href="https://fonts.googleapis.com/css2?family=Indie+Flower&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    /* Dark mode overrides */
    @media (prefers-color-scheme: dark) {
      .body-bg { background-color: #1a1a1a !important; }
      .paper-card { background-color: #2d2d2d !important; border-color: #404040 !important; }
      .lined-content { background-image: linear-gradient(#404040 1px, transparent 1px) !important; color: #e5e7eb !important; }
      .text-primary { color: #f3f4f6 !important; }
      .text-secondary { color: #d1d5db !important; }
      /* Button specific fix */
      .cta-button { 
        background-color: #4F46E5 !important; 
        color: #ffffff !important;
        border-color: #4F46E5 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Inter', sans-serif;" class="body-bg">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Notebook Paper Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border:1px solid #e5e7eb;box-shadow:5px 5px 0px #000000;border-radius:2px;overflow:hidden;">
          
          <!-- Spiral Binding Header -->
          <tr>
            <td style="background:#fefce8;border-bottom:2px dashed #000000;padding:20px 30px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <h1 style="margin:0;font-family:'Indie Flower', cursive;font-size:32px;color:#000000;transform:rotate(-2deg);">
                  MathGPT ✏️
                </h1>
                <span style="font-size:24px;">📝</span>
              </div>
            </td>
          </tr>

          <!-- Lined Paper Content -->
          <tr>
            <td style="padding:40px 30px;background-image:linear-gradient(#e5e7eb 1px, transparent 1px);background-size:100% 32px;line-height:32px;">
              
              <h2 style="margin:0 0 20px;font-family:'Indie Flower', cursive;font-size:28px;color:#000;">
                Hi ${name}! 👋
              </h2>

              <p style="margin:0 0 32px;font-size:16px;color:#374151;background-color:rgba(255,255,255,0.8);">
                Welcome to your new math companion! Get ready to solve problems step-by-step, just like in class (but way more fun).
              </p>

              <!-- Checklist -->
              <div style="background:#fff;border:2px solid #000;padding:15px;margin-bottom:32px;transform:rotate(1deg);">
                <div style="font-family:'Indie Flower', cursive;font-size:18px;margin-bottom:8px;">✅ Today's Homework:</div>
                <div style="font-size:15px;color:#4b5563;">&bull; Ask your first question</div>
                <div style="font-size:15px;color:#4b5563;">&bull; See the magic happen</div>
                <div style="font-size:15px;color:#4b5563;">&bull; Become a math wizard</div>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-top:20px;">
                <a href="${
                  process.env.APP_URL || "https://mathgpt.abhishekbalija.xyz"
                }" 
                   class="cta-button"
                   style="display:inline-block;padding:12px 30px;background:#4F46E5;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:255px 15px 225px 15px/15px 225px 15px 255px;border:2px solid #4F46E5;transition:transform 0.2s;">
                  Start Solving 🚀
                </a>
              </div>

            </td>
          </tr>

          <!-- Doodle Footer -->
          <tr>
            <td style="padding:20px;text-align:center;background:#fff;border-top:2px dashed #000;">
              <p style="margin:0;font-family:'Indie Flower', cursive;font-size:14px;color:#6b7280;">
                Keep crunching numbers! <br>
                - The MathGPT Team 🤓
              </p>
            </td>
          </tr>

        </table>

        <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
          Sent with ❤️ from MathGPT
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
`;

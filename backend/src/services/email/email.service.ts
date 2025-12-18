import { Resend } from "resend";
import { welcomeEmailTemplate } from "./templates/email.templates";

const resend = new Resend(process.env.RESEND_API);

export const EmailService = {
  async sendWelcomeEmail(
    to: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "MathGPT <onboarding@resend.dev>",
        to: [to],
        subject: "Welcome to MathGPT! 🎓",
        html: welcomeEmailTemplate(name),
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        return { success: false, error: error.message };
      }

      console.log("Welcome email sent successfully:", data?.id);
      return { success: true };
    } catch (err) {
      console.error("Email service error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
};

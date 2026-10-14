import axios from "axios";
import api from "./api";

export type FeedbackKind = "bug" | "idea" | "other";

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  // Where the student was, e.g. "/app", and the Solution they had open
  page: string;
  solutionId?: string;
}

export type SendResult = "sent" | "rate_limited" | "failed";

/**
 * Send Feedback about the app. Never throws: the form shows the result.
 */
export async function sendFeedback(input: FeedbackInput): Promise<SendResult> {
  try {
    await api.post("/api/feedback", input);
    return "sent";
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      return "rate_limited";
    }
    console.error("Failed to send feedback:", error);
    return "failed";
  }
}

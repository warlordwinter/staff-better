import { MessageAction } from "./MessageAction";

export interface IncomingMessageResult {
  success: boolean;
  action: MessageAction;
  associate_id?: string;
  phone_number: string;
  message: string;
  response_sent?: string;
  error?: string;
}

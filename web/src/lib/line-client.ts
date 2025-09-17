import { Client, WebhookEvent, TextMessage, MessageAPIResponseBase, validateSignature } from '@line/bot-sdk';
import { config } from './config';

class LineClient {
  private client: Client;

  constructor() {
    this.client = new Client({
      channelAccessToken: config.line.channelAccessToken,
      channelSecret: config.line.channelSecret,
    });
  }

  // Send reply message
  async replyMessage(replyToken: string, messages: TextMessage[]): Promise<MessageAPIResponseBase> {
    try {
      return await this.client.replyMessage(replyToken, messages);
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  // Send push message
  async pushMessage(userId: string, messages: TextMessage[]): Promise<MessageAPIResponseBase> {
    try {
      return await this.client.pushMessage(userId, messages);
    } catch (error) {
      console.error('Error sending push message:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId: string) {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Validate signature
  validateSignature(body: string, signature: string): boolean {
    try {
      return validateSignature(body, config.line.channelSecret, signature);
    } catch (error) {
      console.error('Error validating signature:', error);
      return false;
    }
  }
}

export default new LineClient();
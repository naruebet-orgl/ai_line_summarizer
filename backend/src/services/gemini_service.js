/**
 * Gemini AI Service
 * Handles AI-powered chat summarization using Google Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-1.5-flash for free tier
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('🤖 GeminiService initialized with Gemini 1.5 Flash (Free Tier)');
  }

  /**
   * Generate chat summary for a session
   * @param {Object} session - ChatSession document
   * @param {Object} summary - Summary document to update
   * @returns {Promise<void>}
   */
  async generate_chat_summary(session, summary) {
    console.log(`🤖 Generating AI summary for session ${session._id}`);

    const startTime = Date.now();

    try {
      // Fetch messages from Message collection first, fallback to embedded message_logs
      const { Message } = require('../models');
      let messages = await Message.get_session_messages(session.session_id, 1000); // Get all messages for session

      console.log(`🔍 Retrieved ${messages.length} messages from Message collection for session ${session.session_id}`);

      // If no messages in Message collection, use embedded message_logs as fallback
      if (messages.length === 0 && session.message_logs && session.message_logs.length > 0) {
        console.log(`📋 Falling back to embedded message_logs (${session.message_logs.length} messages)`);
        messages = this.convert_message_logs_to_message_format(session.message_logs);
      }

      // Prepare conversation context
      const conversationText = this.prepare_conversation_text_from_messages(messages);

      console.log(`📝 Prepared conversation text length: ${conversationText.length} characters`);
      if (conversationText.length === 0) {
        console.warn(`⚠️ Empty conversation text for session ${session.session_id}`);
      }

      // Generate summary prompt
      const prompt = this.build_summary_prompt(conversationText, session, messages.length);

      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summaryContent = response.text();

      // Parse the AI response
      const parsedSummary = this.parse_ai_response(summaryContent);

      // Calculate processing metadata
      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      // Update summary with results
      await summary.mark_completed(
        parsedSummary.content,
        parsedSummary.key_topics,
        parsedSummary.analysis,
        {
          model: 'gemini-1.5-flash',
          tokens_used: tokensUsed,
          processing_time_ms: processingTime,
          cost: this.calculate_cost(tokensUsed)
        }
      );

      // Attach summary to session
      await session.attach_summary(summary._id);

      console.log(`✅ AI summary generated successfully for session ${session._id}`);
      console.log(`📊 Tokens used: ${tokensUsed}, Processing time: ${processingTime}ms`);

    } catch (error) {
      console.error(`❌ Error generating AI summary for session ${session._id}:`, error);

      // Mark summary as failed
      await summary.mark_failed(error.message);

      // Still close the session
      await session.close_session();

      throw error;
    }
  }

  /**
   * Convert embedded message_logs to Message-like format for AI processing
   */
  convert_message_logs_to_message_format(messageLogs) {
    return messageLogs.map(log => ({
      timestamp: log.timestamp,
      direction: log.direction,
      message_type: log.message_type,
      message: log.message,
      user_name: 'User', // Default name since embedded logs don't have user details
      sender_role: 'user'
    }));
  }

  /**
   * Prepare conversation text from Message collection
   */
  prepare_conversation_text_from_messages(messages) {
    return messages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const speaker = this.getSpeakerName(msg);

        if (msg.message_type === 'text') {
          return `[${time}] ${speaker}: ${msg.message}`;
        } else {
          return `[${time}] ${speaker}: [${msg.message_type.toUpperCase()}] ${msg.message}`;
        }
      })
      .join('\n');
  }

  /**
   * Get speaker name from message data
   */
  getSpeakerName(msg) {
    if (msg.direction === 'bot') return 'Bot';
    if (msg.direction === 'system') return 'System';
    if (msg.user_name) return msg.user_name;
    if (msg.sender_role === 'group_member') return 'Group Member';
    return 'User';
  }

  /**
   * Build comprehensive prompt for Gemini
   */
  build_summary_prompt(conversationText, session, messageCount) {
    return `คุณเป็น AI ผู้ช่วยที่เชี่ยวชาญในการวิเคราะห์และสรุปการสนทนาแชท กรุณาวิเคราะห์การสนทนาต่อไปนี้และให้สรุปที่ครอบคลุม

รายละเอียดการสนทนา:
- Session ID: ${session.session_id}
- ห้อง: ${session.room_name} (${session.room_type})
- ระยะเวลา: ${this.get_session_duration(session)}
- จำนวนข้อความทั้งหมด: ${messageCount}

การสนทนา:
${conversationText}

คำแนะนำในการวิเคราะห์:
กรุณาให้การวิเคราะห์อย่างละเอียดในรูปแบบ JSON ดังนี้:

{
  "summary": "สรุปครอบคลุม 2-3 ย่อหน้าของการสนทนา รวมถึงหัวข้อหลัก การตัดสินใจสำคัญ และผลลัพธ์",
  "key_topics": ["หัวข้อ1", "หัวข้อ2", "หัวข้อ3"],
  "sentiment": "positive/neutral/negative",
  "urgency": "low/medium/high",
  "category": "หมวดหมู่ทั่วไปของการสนทนา",
  "action_items": ["สิ่งที่ต้องทำ 1", "สิ่งที่ต้องทำ 2"],
  "participants_analysis": {
    "total_participants": number,
    "message_distribution": "คำอธิบายว่าใครมีส่วนร่วมมากที่สุด",
    "engagement_level": "high/medium/low"
  },
  "conversation_highlights": [
    "ประเด็นสำคัญที่สุดหรือการตัดสินใจที่ทำ"
  ],
  "follow_up_needed": "yes/no",
  "tags": ["แท็ก1", "แท็ก2", "แท็ก3"]
}

มุ่งเน้นไปที่:
1. หัวข้อการสนทนาหลักและธีม
2. การตัดสินใจหรือข้อสรุปที่ได้
3. สิ่งที่ต้องทำหรือการติดตามที่กล่าวถึง
4. อารมณ์และโทนโดยรวม
5. ข้อมูลสำคัญหรือความเข้าใจที่แบ่งปัน
6. คำถามที่ถามและตอบ

ให้การวิเคราะห์ที่เป็นกลาง เป็นข้อเท็จจริง และครอบคลุมแต่กระชับ กรุณาตอบเป็นภาษาไทยทั้งหมด`;
  }

  /**
   * Parse AI response and extract structured data
   */
  parse_ai_response(aiResponse) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          content: parsed.summary || aiResponse,
          key_topics: parsed.key_topics || [],
          analysis: {
            sentiment: parsed.sentiment || 'neutral',
            urgency: parsed.urgency || 'low',
            category: parsed.category || 'general',
            action_items: parsed.action_items || [],
            participants_analysis: parsed.participants_analysis || {},
            conversation_highlights: parsed.conversation_highlights || [],
            follow_up_needed: parsed.follow_up_needed || 'no',
            tags: parsed.tags || []
          }
        };
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse AI response as JSON, using as plain text');
    }

    // Fallback: use the entire response as summary
    return {
      content: aiResponse,
      key_topics: this.extract_topics_from_text(aiResponse),
      analysis: {
        sentiment: 'neutral',
        urgency: 'low',
        category: 'general',
        action_items: [],
        participants_analysis: {},
        conversation_highlights: [],
        follow_up_needed: 'no',
        tags: []
      }
    };
  }

  /**
   * Extract topics from text using simple keyword analysis
   */
  extract_topics_from_text(text) {
    // Simple topic extraction - could be enhanced with NLP
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);

    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get session duration in human readable format
   */
  get_session_duration(session) {
    if (!session.end_time) {
      const duration = Date.now() - session.start_time.getTime();
      const minutes = Math.round(duration / (1000 * 60));
      return `${minutes} minutes (ongoing)`;
    }

    const duration = session.end_time.getTime() - session.start_time.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  }

  /**
   * Calculate estimated cost based on token usage
   * Gemini 1.5 Flash pricing (Free Tier up to limits)
   * Paid tier: $0.000075 per 1K input tokens, $0.0003 per 1K output tokens
   */
  calculate_cost(tokensUsed) {
    // Simplified calculation - assumes 50/50 input/output split
    const inputTokens = tokensUsed * 0.5;
    const outputTokens = tokensUsed * 0.5;

    const inputCost = (inputTokens / 1000) * 0.000075;  // Flash pricing
    const outputCost = (outputTokens / 1000) * 0.0003;  // Flash pricing

    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Test Gemini API connection
   */
  async test_connection() {
    try {
      const result = await this.model.generateContent("Hello, this is a test. Please respond with 'Connection successful'.");
      const response = await result.response;
      const text = response.text();

      console.log('✅ Gemini API connection test successful');
      console.log(`📝 Response: ${text}`);

      return { success: true, response: text };
    } catch (error) {
      console.error('❌ Gemini API connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GeminiService();
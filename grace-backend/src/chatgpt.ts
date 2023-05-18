const CONFIG = require("../../config/config.json");
// const { Configuration, OpenAIApi } = require("openai");
import * as OpenAI from "openai";
import { ChatCompletionRequestMessage } from "openai";

export class ChatGPT {
  openai: OpenAI.OpenAIApi;

  messageHistory: ChatCompletionRequestMessage[] = [];

  constructor() {
    const configuration = new OpenAI.Configuration({
      apiKey: CONFIG.CHATGPT_API_KEY,
    });
    this.openai = new OpenAI.OpenAIApi(configuration);
  }

  async getResponse(prompt: string) {
    console.log("Getting response from ChatGPT...");

    let newMessage: ChatCompletionRequestMessage = {
      role: "system",
      content: prompt,
    };

    this.messageHistory.push(newMessage);

    const completion = await this.openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: this.messageHistory,
    });

    this.messageHistory.push(completion.data.choices[0].message);

    console.log("ChatGPT response received.");

    return completion.data.choices[0].message.content;
  }
}

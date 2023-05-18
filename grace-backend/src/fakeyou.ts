const FakeYou = require("fakeyou.js");
const CONFIG = require("../../config/config.json");

// A static TypeScript class to handle FakeYou client and request
export default class FakeYouWrapper {
  private static client: any;

  public static async start() {
    console.log("Starting FakeYou client...");
    this.client = new FakeYou.Client({
      usernameOrEmail: CONFIG.FAKEYOU_USERNAME,
      password: CONFIG.FAKEYOU_PASSWORD,
    });

    await this.client.start();

    console.log("FakeYou client started.");
  }

  public static async generateText(text: string) {
    console.log("Generating text...");
    // check if client is undefined
    if (!this.client) {
      await this.start();
    }

    let model = this.client.models.cache.get("TM:fhp5c1efynfv");

    // check if model is undefined, if so, warn the user and abort
    if (model === undefined) {
      console.warn("Model not found, please check your model ID.");
      return;
    } else {
      let result = await this.client.makeTTS(model, text);
      return result.audioURL();
    }
  }
}

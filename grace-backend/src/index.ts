import { ChatGPT } from "./chatgpt";
import FakeYouWrapper from "./fakeyou";
import { createGraceProxyServer } from "./proxy";

import * as express from "express";

async function startApp() {
  console.log("Starting app...");

  createGraceProxyServer();

  await FakeYouWrapper.start();

  // create chatgpt instance
  const chatgpt = new ChatGPT();

  //create an express app
  const app = express();

  //create an express endpoint to get text and return json
  app.get("/fakeyou/generate", async (req, res) => {
    const text = req.query.text as string;
    const audioURL = await FakeYouWrapper.generateText(text);
    res.json({ url: audioURL });
  });

  // create an express endpoint to take in text and return a json response
  app.get("/chatgpt/getresponse", async (req, res) => {
    const text = req.query.text as string;
    let response = await chatgpt.getResponse(text);

    // replace all periods with triple periods
    response = response.replaceAll(".", "...");

    //replace all commas with triple periods
    response = response.replaceAll(",", "...");

    //replace all colons and semi-colons with triple periods
    response = response.replaceAll(":", "...");
    response = response.replaceAll(";", "...");

    res.json({ response: response });
  });

  // start the express server
  app.listen(3000, () => {
    console.log("Express server listening on port 3000");
  });
}

startApp();

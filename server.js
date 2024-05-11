import http from "http";
import fs from "fs";
import { parse } from "marked";

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

async function compare(topic, opt1, opt2) {
  // Generate suggestion
  const MODEL_NAME = "gemini-1.0-pro";
  const { API_KEY } = process.env;
  if (!API_KEY) {
    console.error("Please provide the API_KEY..");
    return;
  }
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  const parts = [
    {
      text: `Please choose your answer given by user delimited by triple dash below and give short reason why. You will answer in Bahasa Indonesia.\n\nExample:\nUser: Mending laptop atau rakit pc?\nAsisten: Mending merakit PC, karena:\n\n* Lebih hemat biaya\n* Lebih fleksibel dalam memilih komponen\n* Dapat di-upgrade dengan mudah\n* Lebih cocok untuk kebutuhan spesifik\n\n\n\n---\n\nUser: ${topic} mending ${opt1} atau ${opt2}?`,
    },
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings,
  });

  const { response } = result;
  return response.text();
}
// console.log(`API_KEY: ${process.env.API_KEY}`);

function parse_options(options) {
  const topic = options[0].split("=")[1];
  const opt1 = options[1].split("=")[1];
  const opt2 = options[2].split("=")[1];
  return { topic, opt1, opt2 };
}

(async function () {
  const server = http.createServer(async function (request, response) {
    const { url } = request;
    if (url === "/health") {
      response.writeHead(200).end("OK");
    } else if (url === "/" || url === "/index.html") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(fs.readFileSync("./public/index.html"));
    } else if (url.startsWith("/compare")) {
      const parsedUrl = new URL(`http://localhost/${url}`);
      const { search } = parsedUrl;
      const options = decodeURIComponent(search.substring(1)).split("&");
      const { topic, opt1, opt2 } = parse_options(options);
      const suggestion = await compare(topic, opt1, opt2);
      response.writeHead(200).end(parse(suggestion));
    } else {
      console.error(`${url} is 404!`);
      response.writeHead(404);
      response.end();
    }
  });

  const port = process.env.PORT || 6789;
  console.log(`Server running on port ${port}`);
  server.listen(port);
})();

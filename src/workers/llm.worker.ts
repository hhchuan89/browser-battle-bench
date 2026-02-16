import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// The handler takes care of all message passing for the engine
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};

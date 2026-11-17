import { IndecHttpClient } from "../../src/client/indec-client.js";
import {
  createToolContext,
  type ToolContext,
} from "../../src/tools/context.js";

export function makeToolContext(
  client: IndecHttpClient = new IndecHttpClient({}),
  snapshotPath?: string
): ToolContext {
  return createToolContext({ client, snapshotPath });
}

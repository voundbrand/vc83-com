import type { FastifyInstance } from "fastify";
import { API_PREFIX } from "../lib/constants.js";
import { ValidationError } from "../lib/errors.js";
import { scanForPii } from "../pii/detector.js";

interface PiiScanBody {
  text: string;
}

export function registerPiiRoutes(app: FastifyInstance): void {
  app.post<{ Body: PiiScanBody }>(
    `${API_PREFIX}/pii/scan`,
    async (req) => {
      const { text } = req.body;

      if (!text || typeof text !== "string") {
        throw new ValidationError("text is required and must be a string");
      }

      return scanForPii(text);
    },
  );
}

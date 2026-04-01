import { describe, it, expect, afterEach } from "vitest";
import { loadConfig } from "../../server/config.js";

describe("loadConfig", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore environment
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key];
    }
    Object.assign(process.env, origEnv);
  });

  it("returns fail-closed defaults", () => {
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.COMPLIANCE_DB_PATH;
    delete process.env.COMPLIANCE_VAULT_PATH;
    delete process.env.COMPLIANCE_ENCRYPTION_KEY;
    delete process.env.COMPLIANCE_FRAMEWORKS;
    delete process.env.LOG_LEVEL;

    const config = loadConfig();

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(3335);
    expect(config.dbPath).toBe("./data/compliance.db");
    expect(config.vaultPath).toBe("./data/vault");
    expect(config.encryptionKey).toBeUndefined();
    expect(config.frameworks).toEqual(["gdpr"]);
    expect(config.logLevel).toBe("info");
  });

  it("reads framework list from env", () => {
    process.env.COMPLIANCE_FRAMEWORKS = "gdpr,stgb_203,ai_act";
    const config = loadConfig();
    expect(config.frameworks).toEqual(["gdpr", "stgb_203", "ai_act"]);
  });

  it("trims whitespace from frameworks", () => {
    process.env.COMPLIANCE_FRAMEWORKS = " gdpr , stgb_203 ";
    const config = loadConfig();
    expect(config.frameworks).toEqual(["gdpr", "stgb_203"]);
  });

  it("reads encryption key from env", () => {
    process.env.COMPLIANCE_ENCRYPTION_KEY = "my-secret-key";
    const config = loadConfig();
    expect(config.encryptionKey).toBe("my-secret-key");
  });
});

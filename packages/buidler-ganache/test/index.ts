import { assert } from "chai";
import path from "path";

import { GanacheService } from "../src/ganache-service";

import { useEnvironment } from "./helpers";

describe("Ganache plugin with empty configs", function () {
  useEnvironment(path.join(__dirname, "hardhat-project"));

  it("Should add ganache network to the config", function () {
    assert.isDefined(this.env.config.networks.ganache);
  });

  it("Should expose ganache defaults configs in hardhat's config", function () {
    assert.isDefined(this.env.config.networks.ganache);
    const defaultOptions = GanacheService.getDefaultOptions() as any;
    const options = this.env.config.networks.ganache as any;

    // Iterate over all default options and assert equality
    for (const [key, value] of Object.entries(defaultOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should run Hardhat TEST task using Ganache", async function () {
    await this.env.run("test", { noCompile: true, testFiles: [] });
  });

  it("Should run Hardhat RUN task 'accounts-sample.js' using Ganache", async function () {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/accounts-sample.js",
    });

    assert.equal(process.exitCode, 0);
  });

  it("Should run Hardhat RUN task 'delayed-sample.js' using Ganache", async function () {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/delayed-sample.js",
    });

    assert.equal(process.exitCode, 0);
  });
});

describe("Ganache plugin with custom configs", function () {
  useEnvironment(path.join(__dirname, "hardhat-project-with-configs"));

  it("Should add ganache network to hardhat's config", function () {
    assert.isDefined(this.env.config.networks.ganache);
  });

  it("Should load custom configs in hardhat's config'", function () {
    assert.isDefined(this.env.config.networks.ganache);
    const customConfigs = require("./hardhat-project-with-configs/hardhat.config.js");

    assert.isDefined(customConfigs.networks.ganache);
    const customOptions = customConfigs.networks.ganache;

    const options = this.env.config.networks.ganache as any;

    // Iterate over all custom options and assert equality
    for (const [key, value] of Object.entries(customOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should expose merged (custom + defaults) configs in hardhat's config", function () {
    assert.isDefined(this.env.config.networks.ganache);
    const customConfigs = require("./hardhat-project-with-configs/hardhat.config.js");
    const defaultOptions = GanacheService.getDefaultOptions() as any;

    assert.isDefined(customConfigs.networks.ganache);
    const customOptions = customConfigs.networks.ganache;
    const mergedOptions = { ...defaultOptions, ...customOptions };

    const options = this.env.config.networks.ganache as any;

    // Iterate over all custom options and assert equality
    for (const [key, value] of Object.entries(mergedOptions)) {
      assert.equal(options[key], value);
    }
  });

  it("Should run Hardhat RUN task using Ganache with custom configs", async function () {
    await this.env.run("run", {
      noCompile: true,
      script: "scripts/custom-accounts-sample.js",
    });

    assert.equal(process.exitCode, 0);
  });
});

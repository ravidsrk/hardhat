import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { pluginName } from "../pluginContext";

import {
  MetadataAbsentError,
  readSolcVersion,
  VersionNotFoundError,
} from "./metadata";

const COMPILERS_LIST_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json";

// Non-exhaustive interface for the official compiler list.
export interface CompilersList {
  releases: {
    [version: string]: string;
  };
  latestRelease: string;
}

export enum InferralType {
  EXACT,
  METADATA_PRESENT_VERSION_ABSENT,
  METADATA_ABSENT,
}

interface SolcVersionRange {
  inferralType: InferralType;
  range: string;
}

export async function inferSolcVersion(
  bytecode: Buffer
): Promise<SolcVersionRange> {
  let solcVersionMetadata;
  try {
    solcVersionMetadata = await readSolcVersion(bytecode);
  } catch (error) {
    // We want to provide our best inference here.
    // We can infer that some solidity compiler releases couldn't have produced this bytecode.
    // Solc v0.4.7 was the first compiler to introduce metadata into the generated bytecode.
    // See https://solidity.readthedocs.io/en/v0.4.7/miscellaneous.html#contract-metadata
    // Solc v0.4.26, the last release for the v0.4 series, does not feature the compiler version in its emitted metadata.
    // See https://solidity.readthedocs.io/en/v0.4.26/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
    // Solc v0.5.9 was the first compiler to introduce its version into the metadata.
    // See https://solidity.readthedocs.io/en/v0.5.9/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
    // Solc v0.6.0 features compiler version metadata.
    // See https://solidity.readthedocs.io/en/v0.6.0/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
    if (error instanceof VersionNotFoundError) {
      // The embedded metadata was successfully decoded but there was no solc version in it.
      return {
        range: "0.4.7 - 0.5.8",
        inferralType: InferralType.METADATA_PRESENT_VERSION_ABSENT,
      };
    }
    if (error instanceof MetadataAbsentError) {
      // The decoding failed. Unfortunately, our only option is to assume that this bytecode was emitted by an old version.
      return {
        range: "<0.4.7",
        inferralType: InferralType.METADATA_ABSENT,
      };
    }
    // Should be unreachable.
    throw error;
  }

  const range = {
    inferralType: InferralType.EXACT,
    range: solcVersionMetadata,
  };
  return range;
}

// TODO: this could be retrieved from the hardhat config instead.
export async function getLongVersion(shortVersion: string): Promise<string> {
  const versions = await getVersions();
  const fullVersion = versions.releases[shortVersion];

  if (fullVersion === undefined || fullVersion === "") {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      "Given solc version doesn't exist"
    );
  }

  return fullVersion.replace(/(soljson-)(.*)(.js)/, "$2");
}

export async function getVersions(): Promise<CompilersList> {
  try {
    const { default: fetch } = await import("node-fetch");
    // It would be better to query an etherscan API to get this list but there's no such API yet.
    const response = await fetch(COMPILERS_LIST_URL);

    if (!response.ok) {
      const responseText = await response.text();
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `HTTP response is not ok. Status code: ${response.status} Response text: ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Failed to obtain list of solc versions. Reason: ${error.message}`,
      error
    );
  }
}

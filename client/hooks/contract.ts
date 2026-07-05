"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CD7LDCCXH243F6VXREOMBARCUHGNRTHYKWFWYD7B2NRKQUBBPPSBACG6";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey(); // Use a random keypair for read-only
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Crowdfunding Campaign — Contract Methods
// ============================================================

export function toScValU64(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i64" });
}

export function toScValSymbol(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}

/**
 * Create a new crowdfunding campaign.
 * Calls: create_campaign(creator: Address, title: String, description: String) -> bool
 */
export async function createCampaign(
  caller: string,
  title: string,
  description: string
) {
  return callContract(
    "create_campaign",
    [toScValAddress(caller), toScValString(title), toScValString(description)],
    caller,
    true
  );
}

/**
 * Donate to a campaign.
 * Calls: donate(donor: Address, campaign_id: String, token_addr: Address, amount: i128)
 */
export async function donate(
  caller: string,
  campaignId: string,
  tokenAddr: string,
  amount: bigint
) {
  return callContract(
    "donate",
    [toScValAddress(caller), toScValString(campaignId), toScValAddress(tokenAddr), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Get campaign details (read-only).
 * Calls: get_campaign(campaign_id: String) -> Campaign
 * Returns: { id, title, description, creator, created_at } or null
 */
export async function getCampaign(campaignId: string, caller?: string) {
  return readContract("get_campaign", [toScValString(campaignId)], caller);
}

/**
 * Get donations for a campaign (read-only).
 * Calls: get_donations(campaign_id: String) -> Vec<Donation>
 * Returns: Array of { donor, amount, timestamp }
 */
export async function getDonations(campaignId: string, caller?: string) {
  return readContract("get_donations", [toScValString(campaignId)], caller);
}

/**
 * Get total raised for a campaign (read-only).
 * Calls: get_total_raised(campaign_id: String) -> i128
 */
export async function getTotalRaised(campaignId: string, caller?: string) {
  return readContract("get_total_raised", [toScValString(campaignId)], caller);
}

/**
 * Get all campaigns (read-only).
 * Calls: get_all_campaigns() -> Vec<Campaign>
 */
export async function getAllCampaigns(caller?: string) {
  return readContract("get_all_campaigns", [], caller);
}

/**
 * Get donor count for a campaign (read-only).
 * Calls: get_donor_count(campaign_id: String) -> u32
 */
export async function getDonorCount(campaignId: string, caller?: string) {
  return readContract("get_donor_count", [toScValString(campaignId)], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };

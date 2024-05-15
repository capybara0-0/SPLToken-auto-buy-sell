import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import { getUserInputs } from "./prompts";
import { logMessage } from "./logMessage";

/**
 * Initializes the Raydium swap by loading pool keys.
 * @param raydiumSwap The RaydiumSwap instance.
 */
async function initializeRaydiumSwap(raydiumSwap: RaydiumSwap) {
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  logMessage("Raydium swap initialized.", "info");
  logMessage("Pool keys loaded.", "info");
}

/**
 * Runs the swap operation in a loop.
 * @param raydiumSwap The RaydiumSwap instance.
 * @param tokenAddress The address of the token to swap.
 * @param solAmount The amount of SOL to swap.
 * @param slippage The allowed slippage percentage.
 */
async function runSwapLoop(
  raydiumSwap: RaydiumSwap,
  tokenAddress: string,
  solAmount: number,
  slippage: number,
) {
  while (true) {
    try {
      await performSwap(raydiumSwap, tokenAddress, solAmount, slippage);
    } catch (error) {
      logMessage(error.message, "error");
    }
    await new Promise((resolve) => setTimeout(resolve, swapConfig.intervalMs));
  }
}

/**
 * Handles the swap operation based on the swapConfig.ts file.
 * @param raydiumSwap The RaydiumSwap instance.
 * @param tokenAddress The address of the token to swap.
 * @param solAmount The amount of SOL to swap.
 * @param slippage The allowed slippage percentage.
 */
async function performSwap(
  raydiumSwap: RaydiumSwap,
  tokenAddress: string,
  solAmount: number,
  slippage: number,
) {
  const poolInfo = raydiumSwap.findPoolInfoForTokens(
    swapConfig.tokenAAddress,
    tokenAddress,
  );
  if (!poolInfo) {
    throw new Error("Pool info not found");
  }
  logMessage("Pool info found.", "info");

  const tx = await raydiumSwap.getSwapTransaction(
    tokenAddress,
    solAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction,
    slippage,
  );

  if (swapConfig.executeSwap) {
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(
          tx as VersionedTransaction,
          swapConfig.maxRetries,
        )
      : await raydiumSwap.sendLegacyTransaction(
          tx as Transaction,
          swapConfig.maxRetries,
        );
    logMessage(`Transaction sent: https://solscan.io/tx/${txid}`, "info");
  } else {
    const simRes = swapConfig.useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(
          tx as VersionedTransaction,
        )
      : await raydiumSwap.simulateLegacyTransaction(tx as Transaction);
    logMessage("Simulation result:", "info");
    console.log(simRes);
  }
}

/**
 * Sets up a graceful shutdown handler.
 */
function setupShutdownHandler() {
  process.on("SIGINT", () => {
    logMessage("Interrupted, shutting down...", "error");
    process.exit();
  });
}

async function main() {
  const { tokenAddress, solAmount, slippage } = await getUserInputs();
  logMessage(
    `User inputs loaded: \n Token Address - ${tokenAddress} \n SOL Amount - ${solAmount} \n Slippage - ${slippage}`,
    "info",
  );

  const raydiumSwap = new RaydiumSwap(
    process.env.RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
  );

  await initializeRaydiumSwap(raydiumSwap);

  setupShutdownHandler();

  await runSwapLoop(raydiumSwap, tokenAddress, solAmount, slippage);
}

main().catch((error) => logMessage(error.message, "error"));

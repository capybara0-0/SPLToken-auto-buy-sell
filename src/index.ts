import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import chalk from "chalk";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import { getUserInputs, delay } from "./prompts";
import { logMessage } from "./logMessage";
import {
  getTokenBalanceByOwnerAndMint,
  connection,
} from "./fetchTokenAccountBalance";

let previousNumericValues = null;
let latestNumericValues = null;

/**
 * Initializes the Raydium swap by loading pool keys from a specified liquidity file.
 * This function sets up the necessary data for performing swaps on the Raydium platform.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 */
async function initializeRaydiumSwap(raydiumSwap: RaydiumSwap) {
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  logMessage("Raydium swap initialized.", "success");
}

/**
 * Executes a continuous loop for performing swaps on the Raydium platform.
 * This loop will keep attempting to perform swaps based on the provided parameters until interrupted.
 * It handles errors gracefully by logging them and continuing with the next iteration.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 * @param tokenAddress - The address of the token to be swapped.
 * @param solAmount - The amount of SOL to be used in the swap.
 * @param slippage - The acceptable slippage percentage for the swap.
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
    await delay(swapConfig.intervalMs);
  }
}

/**
 * Performs a single swap operation on the Raydium platform.
 * This function calculates the swap details, updates numeric values for tracking price changes,
 * and decides whether to execute the swap or simulate it based on configuration settings.
 * If conditions for exiting the swap loop are met, it initiates the exit swap process.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 * @param tokenAddress - The address of the token to be swapped.
 * @param solAmount - The amount of SOL to be used in the swap.
 * @param slippage - The acceptable slippage percentage for the swap.
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
  if (!poolInfo) throw new Error("Pool info not found");

  const { transaction, numericValues } = await raydiumSwap.getSwapTransaction(
    tokenAddress,
    solAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction,
    slippage,
  );
  updateNumericValues(numericValues);

  if (shouldExitSwap()) {
    await executeExitSwap(raydiumSwap, tokenAddress, poolInfo, slippage);
    return;
  }

  if (swapConfig.executeSwap) {
    console.log(
      `[SWAPPING] ${chalk.yellow(swapConfig.tokenAAddress)} ${chalk.red(
        solAmount,
      )} --> ${chalk.yellow(tokenAddress)} ${chalk.green(
        numericValues[0].numericMinAmountOut,
      )}`,
    );
    await executeSwap(raydiumSwap, transaction);
  } else {
    await simulateSwap(raydiumSwap, transaction);
  }
}

/**
 * Updates the global variables `previousNumericValues` and `latestNumericValues` with the new numeric values obtained from a swap transaction.
 * These variables are used to track the price changes between consecutive swap operations.
 *
 * @param numericValues - An array containing objects with properties `numericMinAmountOut` and `numericAmountIn`,
 *                        representing the minimum expected amount out and the actual amount in for the swap transaction.
 */
function updateNumericValues(numericValues) {
  previousNumericValues = latestNumericValues;
  latestNumericValues = numericValues;
}

/**
 * Determines whether the swap loop should exit based on the percentage change in the minimum amount out between two consecutive swaps.
 * It compares the latest and previous numeric values to calculate the price change percentage and checks if it meets or exceeds the configured exit target.
 *
 * @returns {boolean} True if the calculated percentage change meets or exceeds the exit target, indicating that the swap loop should exit. False otherwise.
 */
function shouldExitSwap() {
  if (latestNumericValues && previousNumericValues) {
    const previousMinAmountOut = previousNumericValues[0].numericMinAmountOut;
    console.log(chalk.blue(`[previousMinAmountOut]: `), previousMinAmountOut);

    const latestMinAmountOut = latestNumericValues[0].numericMinAmountOut;
    console.log(chalk.blue(`[latestMinAmountOut]: `), latestMinAmountOut);

    const percentageChange =
      ((latestMinAmountOut - previousMinAmountOut) / previousMinAmountOut) *
      100;
    console.log(chalk.blue(`[STATUS] Price change: `), percentageChange);

    return percentageChange >= swapConfig.exitTarget;
  }
  return false;
}

/**
 * Executes the exit swap process when the conditions for exiting the swap loop are met.
 * This involves calculating the total token amount available for swapping, creating a swap transaction for the entire amount,
 * and then executing the swap. If no tokens are available for swapping, it logs a warning and returns early.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 * @param tokenAddress - The address of the token to be swapped back to the original token.
 * @param poolInfo - Information about the liquidity pool being used for the swap.
 * @param slippage - The acceptable slippage percentage for the swap.
 */
async function executeExitSwap(raydiumSwap, tokenAddress, poolInfo, slippage) {
  const totalTokenAmount = await getTokenBalanceByOwnerAndMint(
    swapConfig.OwnerAddress,
    tokenAddress,
  );

  if (totalTokenAmount <= 0) {
    console.log(chalk.yellow("[WARNING]: NO TOKENS AVAILABLE FOR SWAPPING. "));
    return;
  }
  const { transaction, numericValues } = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenAAddress,
    totalTokenAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction,
    slippage,
  );
  console.log(
    `[SWAPPING] ${chalk.yellow(tokenAddress)} ${chalk.red(
      totalTokenAmount,
    )} --> ${chalk.yellow(swapConfig.tokenAAddress)} ${chalk.green(
      numericValues[0].numericMinAmountOut,
    )}`,
  );
  await executeSwap(raydiumSwap, transaction);
}

/**
 * Executes a swap transaction on the Raydium platform.
 * This function attempts to send the transaction multiple times in case of failure, up to a maximum number of retries defined in the configuration.
 * It logs the transaction ID upon success or the reason for failure upon each unsuccessful attempt.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 * @param transaction - The transaction object to be executed, either a legacy Transaction or a VersionedTransaction.
 */
async function executeSwap(
  raydiumSwap: RaydiumSwap,
  transaction: Transaction | VersionedTransaction,
) {
  let backoffMs = 1000;
  for (let attempt = 1; attempt <= swapConfig.retryCount; attempt++) {
    try {
      const txid = swapConfig.useVersionedTransaction
        ? await raydiumSwap.sendVersionedTransaction(
            transaction as VersionedTransaction,
            swapConfig.maxRetries,
          )
        : await raydiumSwap.sendLegacyTransaction(
            transaction as Transaction,
            swapConfig.maxRetries,
          );

      const confirmation = await connection.confirmTransaction(
        txid,
        "confirmed",
      );

      if (confirmation.value.err) {
        console.error(
          chalk.red("[ERROR] Transaction failed: ", confirmation.value.err),
        );
      } else {
        console.log(chalk.cyan(`[SUCCESS] https://solscan.io/tx/${txid}`));
        console.log(chalk.magenta("=").repeat(60));
        break;
      }
    } catch (error) {
      console.error(chalk.yellow("[WARNING] : "), error);
      if (attempt === swapConfig.retryCount) {
        console.error(`Transaction failed after ${attempt} attempts.`);
        console.log(chalk.magenta("=").repeat(60));
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      backoffMs *= 2;
    }
  }
}

/**
 * Simulates a swap transaction on the Raydium platform without actually executing it.
 * This function is used for testing purposes to understand the potential outcome of a swap without committing resources.
 * It logs the simulation result for review.
 *
 * @param raydiumSwap - An instance of the RaydiumSwap class, which encapsulates the logic for interacting with the Raydium platform.
 * @param transaction - The transaction object to be simulated, either a legacy Transaction or a VersionedTransaction.
 */
async function simulateSwap(
  raydiumSwap: RaydiumSwap,
  transaction: Transaction | VersionedTransaction,
) {
  const simRes = swapConfig.useVersionedTransaction
    ? await raydiumSwap.simulateVersionedTransaction(
        transaction as VersionedTransaction,
      )
    : await raydiumSwap.simulateLegacyTransaction(transaction as Transaction);

  console.log(`[SIMULATION]`, simRes);
  console.log(chalk.magenta("=").repeat(60));
}

/**
 * Main entry point of the script.
 * Initializes the Raydium swap environment, loads user inputs, and starts the swap loop.
 * Also sets up an interrupt handler to gracefully shut down the process.
 *
 * @throws Will throw an error if there's an issue during the initialization or swap process.
 */
async function main() {
  const { tokenAddress, solAmount, slippage } = await getUserInputs();

  logMessage(
    `User inputs loaded: \nToken Address - ${tokenAddress} \nSOL Amount - ${solAmount} \nSlippage in % - ${slippage}`,
    "info",
  );

  const raydiumSwap = new RaydiumSwap(
    process.env.RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
  );

  await initializeRaydiumSwap(raydiumSwap);
  process.on("SIGINT", () => {
    logMessage("Interrupted, shutting down...", "error");
    process.exit();
  });

  await runSwapLoop(raydiumSwap, tokenAddress, solAmount, slippage);
}

main().catch((error) => logMessage(error.message, "error"));

import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import chalk from "chalk";
import { getUserInputs } from "./prompts";

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */

async function main() {
  const { tokenAddress, solAmount, slippage } = await getUserInputs();

  console.log(`|-------------USER INPUT----------------|`);
  console.log(`tokenAddress: ${tokenAddress}`);
  console.log(`solAmount: ${solAmount}`);
  console.log(`slippage: ${slippage}`);

  const raydiumSwap = new RaydiumSwap(
    process.env.RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
  );

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */

  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(chalk.blue(`[INFO] Raydium swap initialized. `));
  console.log(chalk.blue(`[INFO] Pool keys Loaded. `));

  const runSwap = async () => {
    while (true) {
      console.log(
        `Swapping ${chalk.green(solAmount)} of ${chalk.yellow(
          swapConfig.tokenAAddress,
        )} for ${chalk.yellow(tokenAddress)}`,
      );

      /**
       * Find pool information for the given token pair.
       */
      const poolInfo = raydiumSwap.findPoolInfoForTokens(
        swapConfig.tokenAAddress,
        tokenAddress,
      );
      if (!poolInfo) {
        console.error(chalk.red("[ERROR] Pool info not found. "));
        await new Promise((resolve) =>
          setTimeout(resolve, swapConfig.retryIntervalMs),
        );
        continue;
      } else {
        console.log(chalk.blue("[INFO] Pool info found. "));
      }

      try {
        /**
         * Prepare the swap transaction with the given parameters.
         */
        const tx = await raydiumSwap.getSwapTransaction(
          tokenAddress,
          solAmount,
          poolInfo,
          swapConfig.maxLamports,
          swapConfig.useVersionedTransaction,
          swapConfig.direction,
          slippage,
        );

        /**
         * Depending on the configuration, execute or simulate the swap.
         */
        if (swapConfig.executeSwap) {
          /**
           * Send the transaction to the network and log the transaction ID.
           */
          const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(
                tx as VersionedTransaction,
                swapConfig.maxRetries,
              )
            : await raydiumSwap.sendLegacyTransaction(
                tx as Transaction,
                swapConfig.maxRetries,
              );

          console.log(`https://solscan.io/tx/${txid}`);
        } else {
          /**
           * Simulate the transaction and log the result.
           */
          const simRes = swapConfig.useVersionedTransaction
            ? await raydiumSwap.simulateVersionedTransaction(
                tx as VersionedTransaction,
              )
            : await raydiumSwap.simulateLegacyTransaction(tx as Transaction);

          console.log(simRes);
        }
      } catch (error) {
        console.error("[ERROR]", error);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, swapConfig.intervalMs),
      );
    }
  };

  // Handle SIGINT for graceful shutdown
  process.on("SIGINT", () => {
    console.log(chalk.red("Interrupted, shutting down..."));
    process.exit();
  });

  await runSwap();
}

main().catch(console.error);

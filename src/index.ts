import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import chalk from "chalk";

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
const swap = async () => {
  /**
   * The RaydiumSwap instance for handling swaps.
   */
  const raydiumSwap = new RaydiumSwap(
    process.env.RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
  );
  console.log(chalk.blue(`[INFO] Raydium swap initialized`));
  console.log(
    `Swapping ${chalk.green(swapConfig.tokenAAmount)} of ${chalk.yellow(
      swapConfig.tokenAAddress,
    )} for ${chalk.yellow(swapConfig.tokenBAddress)}`,
  );

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(chalk.blue(`[INFO] Loaded pool keys`));

  /**
   * Find pool information for the given token pair.
   */
  const poolInfo = raydiumSwap.findPoolInfoForTokens(
    swapConfig.tokenAAddress,
    swapConfig.tokenBAddress,
  );
  if (!poolInfo) {
    console.error("[ERROR] Pool info not found");
    return "Pool info not found";
  } else {
    console.log(chalk.blue("[INFO] Found pool info"));
  }

  /**
   * Prepare the swap transaction with the given parameters.
   */
  const tx = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenBAddress,
    swapConfig.tokenAAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction,
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
};

swap();

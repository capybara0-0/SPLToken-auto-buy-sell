import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import { getUserInputs } from "./prompts";
import { logMessage } from "./logMessage";
import { getTokenBalanceByOwnerAndMint } from "./fetchTokenAccountBalance";
import { connection } from "./fetchTokenAccountBalance";
import chalk from "chalk";

let previousNumericValues = null;
let latestNumericValues = null;

async function initializeRaydiumSwap(raydiumSwap: RaydiumSwap) {
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  logMessage("Raydium swap initialized.", "success");
}

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
    await executeSwap(raydiumSwap, transaction);
  } else {
    await simulateSwap(raydiumSwap, transaction);
  }
}

function updateNumericValues(numericValues) {
  previousNumericValues = latestNumericValues;
  latestNumericValues = numericValues;
}

function shouldExitSwap() {
  if (latestNumericValues && previousNumericValues) {
    const latestMinAmountOut = latestNumericValues[0].numericMinAmountOut;
    console.log(`[latestMinAmountOut]`, latestMinAmountOut);
    const previousMinAmountOut = previousNumericValues[0].numericMinAmountOut;
    console.log(`[previousMinAmountOut]`, previousMinAmountOut);
    const percentageChange =
      ((latestMinAmountOut - previousMinAmountOut) / previousMinAmountOut) *
      100;
    console.log(`[STATUS] Price change: `, percentageChange);
    return percentageChange >= swapConfig.exitTarget;
  }
  return false;
}

async function executeExitSwap(raydiumSwap, tokenAddress, poolInfo, slippage) {
  const totalTokenAmount = await getTokenBalanceByOwnerAndMint(
    swapConfig.OwnerAddress,
    tokenAddress,
  );

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

async function executeSwap(
  raydiumSwap: RaydiumSwap,
  transaction: Transaction | VersionedTransaction,
) {
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
    const confirmation = await connection.confirmTransaction(txid, "confirmed");
    if (confirmation.value.err) {
      console.error(
        chalk.red("[ERROR] Transaction failed: ", confirmation.value.err),
      );
    } else {
      console.log(chalk.cyan(`[SUCCESS] https://solscan.io/tx/${txid}`));
      console.log(chalk.gray("-").repeat(50));
    }
  } catch (error) {
    console.error(chalk.red("[ERROR] Error sending transaction: "), error);
  }
}

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
  console.log(chalk.gray("-").repeat(50));
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

import RaydiumSwap from "./RaydiumSwap";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import "dotenv/config";
import { swapConfig } from "./swapConfig";
import { getUserInputs } from "./prompts";
import { logMessage } from "./logMessage";
import { getTokenBalanceByOwnerAndMint } from "./fetchTokenAccountBalance";
import chalk from "chalk";

let numericValuesHistory = [];

async function initializeRaydiumSwap(raydiumSwap: RaydiumSwap) {
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  logMessage("Raydium swap initialized.", "success");
  logMessage("Pool keys loaded.", "success");
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
    await new Promise((resolve) => setTimeout(resolve, swapConfig.intervalMs));
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

  if (!poolInfo) {
    throw new Error("Pool info not found");
  }

  logMessage("Pool info found.", "info");

  const { transaction, numericValues } = await raydiumSwap.getSwapTransaction(
    tokenAddress,
    solAmount,
    poolInfo,
    swapConfig.maxLamports,
    swapConfig.useVersionedTransaction,
    swapConfig.direction,
    slippage,
  );

  numericValuesHistory.push(numericValues);

  if (numericValuesHistory.length > 1) {
    const latestNumericValues =
      numericValuesHistory[numericValuesHistory.length - 1];
    const previousNumericValues =
      numericValuesHistory[numericValuesHistory.length - 2];
    const latestMinAmountOut = latestNumericValues[0].numericMinAmountOut;
    const previousMinAmountOut = previousNumericValues[0].numericMinAmountOut;
    const percentageChange =
      ((latestMinAmountOut - previousMinAmountOut) / previousMinAmountOut) *
      100;

    console.log(`change in percentage: ${percentageChange.toFixed(2)}%`);

    if (percentageChange >= swapConfig.exitTarget) {
      const totalTokenAmount = await getTokenBalanceByOwnerAndMint(
        swapConfig.OwnerAddress,
        tokenAddress,
      );

      const { transaction, numericValues } =
        await raydiumSwap.getSwapTransaction(
          swapConfig.tokenAAddress,
          totalTokenAmount,
          poolInfo,
          swapConfig.maxLamports,
          swapConfig.useVersionedTransaction,
          swapConfig.direction,
          slippage,
        );
      console.log(
        `[SWAP] ${chalk.yellow(tokenAddress)} ${chalk.red(
          totalTokenAmount,
        )}  --> ${chalk.yellow(swapConfig.tokenAAddress)}  ${chalk.green(
          numericValues[0].numericMinAmountOut,
        )}`,
      );
      if (swapConfig.executeSwap) {
        const txid = swapConfig.useVersionedTransaction
          ? await raydiumSwap.sendVersionedTransaction(
              transaction as VersionedTransaction,
              swapConfig.maxRetries,
            )
          : await raydiumSwap.sendLegacyTransaction(
              transaction as Transaction,
              swapConfig.maxRetries,
            );

        logMessage(`Transaction sent: https://solscan.io/tx/${txid}`, "info");
      } else {
        const simRes = swapConfig.useVersionedTransaction
          ? await raydiumSwap.simulateVersionedTransaction(
              transaction as VersionedTransaction,
            )
          : await raydiumSwap.simulateLegacyTransaction(
              transaction as Transaction,
            );

        // DEBUG
        // console.log(`[DEBUG] `, simRes);
      }
      return;
    }
  } else {
    console.log("First iteration, no previous data for comparison.");
  }

  console.log(
    `[SWAP] ${chalk.yellow(swapConfig.tokenAAddress)} ${chalk.red(
      solAmount,
    )} --> ${chalk.yellow(tokenAddress)}  ${chalk.green(
      numericValues[0].numericMinAmountOut,
    )} `,
  );

  if (swapConfig.executeSwap) {
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(
          transaction as VersionedTransaction,
          swapConfig.maxRetries,
        )
      : await raydiumSwap.sendLegacyTransaction(
          transaction as Transaction,
          swapConfig.maxRetries,
        );
    logMessage(`Transaction sent: https://solscan.io/tx/${txid}`, "warning");
  } else {
    const simRes = swapConfig.useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(
          transaction as VersionedTransaction,
        )
      : await raydiumSwap.simulateLegacyTransaction(transaction as Transaction);

    //[DEBUG]
    // console.log(`[DEBUG] `, simRes);
  }
}

function setupShutdownHandler() {
  process.on("SIGINT", () => {
    logMessage("Interrupted, shutting down...", "error");
    process.exit();
  });
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
  setupShutdownHandler();
  await runSwapLoop(raydiumSwap, tokenAddress, solAmount, slippage);
}

main().catch((error) => logMessage(error.message, "error"));

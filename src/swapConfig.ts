export const swapConfig = {
  executeSwap: true, // Send tx when true, simulate tx when false

  useVersionedTransaction: true, // wether you want to user versioned transaction or leegacy transaction

  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case

  maxLamports: 2000000, // Micro lamports for priority fee

  direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'

  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",

  OwnerAddress: "", // Your wallet PublicKey

  exitTarget: 1, // Exit target in percentage (e.g. +1%)

  maxRetries: 20,

  intervalMs: 4000, // Interval between every swap

  retryCount: 3, // Retry if the transaction fails.
};

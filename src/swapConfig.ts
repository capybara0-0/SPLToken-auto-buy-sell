export const swapConfig = {
  executeSwap: false, // Send tx when true, simulate tx when false

  useVersionedTransaction: true,

  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case

  maxLamports: 1500000, // Micro lamports for priority fee

  direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'

  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",

  maxRetries: 20,

  retryIntervalMs: 3000,

  intervalMs: 5000,
};

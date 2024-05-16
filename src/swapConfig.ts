export const swapConfig = {
  executeSwap: true, // Send tx when true, simulate tx when false

  useVersionedTransaction: false,

  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case

  maxLamports: 2000000, // Micro lamports for priority fee

  direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'

  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",

  OwnerAddress: "3Gf1W1uWQ286zcNYmZxYXBrhgACP8r174zcgE2TxRZCP",

  exitTarget: 1.5, // Percentage

  maxRetries: 20,

  retryIntervalMs: 3000,

  intervalMs: 5000,
};

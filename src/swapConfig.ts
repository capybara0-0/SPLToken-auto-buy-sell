export const swapConfig = {
  executeSwap: true, // Send tx when true, simulate tx when false

  useVersionedTransaction: true,

  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case

  // tokenAAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",

  maxLamports: 2000000, // Micro lamports for priority fee

  direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'

  liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",

  OwnerAddress: "3Gf1W1uWQ286zcNYmZxYXBrhgACP8r174zcgE2TxRZCP",

  exitTarget: -1, // Percentage

  maxRetries: 20,

  intervalMs: 4000,
};

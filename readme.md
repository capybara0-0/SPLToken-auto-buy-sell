# SPL-Token Auto Buy & Sell

This automated script facilitates the swapping of targeted SPL-tokens and SOL on Raydium. Users can customize the script's parameters according to their preferences. For testing purposes, the script can be set to simulate swaps by setting `executeSwap: false` in `src/swapConfig.ts`.

## Requirements

- Node.js
- TypeScript
- Yarn

## Usage

1. **Environment Setup:**

   - Rename the existing `.env.example` file to `.env` or create a new `.env` file.
   - Populate the `.env` file with your keys:
     ```env
     RPC_URL=YOUR_RPC_URL
     WALLET_PRIVATE_KEY=YOUR_PRIVATE_KEY
     ```

2. **Configuration:**

   - Open `src/swapConfig.ts` to adjust the script parameters:
     ```ts
     export const swapConfig = {
       executeSwap: true, // Executes transaction when true, simulates when false
       useVersionedTransaction: false,
       tokenAAddress: "So11111111111111111111111111111111111111112", // Token to be swapped, SOL by default
       maxLamports: 2000000, // Micro lamports for priority fee
       direction: "in" as "in" | "out", // Direction of swap: 'in' or 'out'
       liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
       OwnerAddress: "<enter your wallet address here>",
       exitTarget: 15, // Target percentage for exit strategy
       maxRetries: 20,
       retryIntervalMs: 3000,
       intervalMs: 5000,
     };
     ```

3. **Execution:**
   - To run the script, execute the following command in the root directory:
     ```bash
     yarn swap
     ```

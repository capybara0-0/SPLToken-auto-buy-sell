# SPL-TOKEN auto buy & sell

⚠️⚠️ currently the script only swaps token manually, it's still in development.

## requirements

- NodeJS
- Typescript
- yarn

## Usage

- Create a `.env` or rename the existing `.env.example` file and replace with your keys.
  ```env
  RPC_URL=YOUR_RPC_URL
  WALLET_PRIVATE_KEY=YOUR_PRIVATE_KEY
  ```
- Navigate to `src/swapConfig.ts` to the modify parameters.

  ```ts
  export const swapConfig = {
    executeSwap: false, // Send tx when true, simulate tx when false

    useVersionedTransaction: true,

    tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case

    maxLamports: 1500000, // Micro lamports for priority fee

    direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'

    liquidityFile: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",

    maxRetries: 20,

    retryIntervalMs: 3000,

    intervalMs: 3000,
  };
  ```

- For running the script you can simply run `yarn swap` on the root directory.
  ```bash
  yarn swap
  ```

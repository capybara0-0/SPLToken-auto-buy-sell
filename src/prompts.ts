import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (input) => {
      if (input.trim() === "") {
        console.log(
          "[WARNING] This field cannot be left blank. Please enter a value.",
        );
        resolve(askQuestion(question));
      } else {
        resolve(input.trim());
      }
    });
  });
}

function closeInterface() {
  rl.close();
}

export async function getUserInputs() {
  const tokenAddress = await askQuestion(
    "Enter the token address for the SPL-token: ",
  );

  let solAmount: number = 0;
  while (true) {
    const solAmountInput = await askQuestion("Enter the SOL amount: ");
    solAmount = parseFloat(solAmountInput);
    if (!isNaN(solAmount) && solAmount > 0) {
      break;
    }
    console.log("Please enter a valid number for SOL amount.");
  }

  let slippage: number = 0;
  while (true) {
    const slippageInput = await askQuestion("Enter slippage: ");
    slippage = parseFloat(slippageInput);
    if (!isNaN(slippage) && slippage >= 0) {
      break;
    }
    console.log("Please enter a valid number for slippage.");
  }

  closeInterface();

  return { tokenAddress, solAmount, slippage };
}

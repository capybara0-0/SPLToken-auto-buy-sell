import chalk from "chalk";
/**
 * Logs messages with color coding based on their type.
 * @param message The message to be logged.
 * @param type The type of the message ('info' or 'error').
 */
export function logMessage(message: string, type: "info" | "error") {
  if (type === "info") {
    console.log(chalk.blue(`[INFO] ${message}`));
  } else {
    console.error(chalk.red(`[ERROR] ${message}`));
  }
}

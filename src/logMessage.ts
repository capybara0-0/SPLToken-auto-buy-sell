import chalk from "chalk";

/**
 * Defines a mapping between message types and their corresponding colors.
 */
const messageTypeColors: Record<string, chalk.ChalkFunction> = {
  info: chalk.blue,
  error: chalk.red,
  warning: chalk.yellow,
  success: chalk.green,
};

/**
 * @param message The message to be logged.
 * @param type The type of the message (e.g., 'info', 'error', 'warning', 'success').
 */
export function logMessage(
  message: string,
  type: keyof typeof messageTypeColors,
) {
  const colorFn = messageTypeColors[type];
  if (colorFn) {
    console.log(colorFn(`[${type.toUpperCase()}] ${message}`));
  } else {
    console.log(`[UNKNOWN TYPE] ${message}`);
  }
}

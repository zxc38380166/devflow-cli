import chalk from 'chalk';

export const log = {
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✖'), msg),
};

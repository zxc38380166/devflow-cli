import chalk from 'chalk';
export const log = {
    success: (msg) => console.log(chalk.green('✔'), msg),
    info: (msg) => console.log(chalk.blue('ℹ'), msg),
    warn: (msg) => console.log(chalk.yellow('⚠'), msg),
    error: (msg) => console.error(chalk.red('✖'), msg),
};

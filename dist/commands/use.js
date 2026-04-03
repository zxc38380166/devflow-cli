import { setActiveProject, listProjects } from '../utils/config.js';
import { log } from '../utils/logger.js';
export async function useCommand(projectName) {
    const projects = listProjects();
    if (!projects.includes(projectName)) {
        log.error(`找不到專案 "${projectName}"`);
        if (projects.length) {
            log.info(`可用的專案: ${projects.join(', ')}`);
        }
        else {
            log.info('尚未建立任何專案，請先執行 devflow init');
        }
        process.exit(1);
    }
    setActiveProject(projectName);
    log.success(`已切換到專案: ${projectName}`);
}

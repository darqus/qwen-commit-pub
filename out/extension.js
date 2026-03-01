"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const i18n_1 = require("./i18n");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Выполнение команды с передачей данных через stdin
 */
function execWithStdin(command, options, stdinData) {
    return new Promise((resolve, reject) => {
        // На Windows используем shell: true для корректного запуска .cmd/.bat файлов
        // На macOS/Linux тоже нужен shell: true для запуска npm global пакетов (qwen и др.)
        const isWindows = process.platform === 'win32';
        const isMacOrLinux = process.platform === 'darwin' || process.platform === 'linux';
        const useShell = isWindows || isMacOrLinux;
        const child = (0, child_process_1.spawn)(command, {
            cwd: options.cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: useShell,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        // Обработка отмены через AbortSignal
        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                child.kill('SIGTERM');
                reject(new Error('AbortError'));
            });
        }
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout });
            }
            else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });
        child.on('error', reject);
        // Записываем данные в stdin и закрываем поток
        child.stdin.write(stdinData);
        child.stdin.end();
    });
}
// Глобальное состояние для отслеживания генерации
let isGenerating = false;
let abortController = null;
let statusBarItem;
function activate(context) {
    (0, i18n_1.initLocale)();
    console.log("Qwen Commit extension is now active");
    // Инициализация context key для управления видимостью кнопок
    vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
    // Создаём status bar item для отображения статуса
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.name = "Qwen Commit";
    statusBarItem.command = "qwen-commit.generateCommitMessage";
    context.subscriptions.push(statusBarItem);
    updateStatusBar(false);
    // Команда генерации сообщения коммита
    const generateDisposable = vscode.commands.registerCommand("qwen-commit.generateCommitMessage", async () => {
        if (isGenerating) {
            vscode.window.showWarningMessage((0, i18n_1.t)("alreadyGenerating"));
            return;
        }
        await generateCommitMessage(context);
    });
    // Команда остановки генерации
    const stopDisposable = vscode.commands.registerCommand("qwen-commit.stopGeneration", async () => {
        if (abortController) {
            abortController.abort();
            isGenerating = false;
            vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
            updateStatusBar(false);
            vscode.window.showInformationMessage((0, i18n_1.t)("generationStopped"));
        }
    });
    context.subscriptions.push(generateDisposable, stopDisposable);
}
function updateStatusBar(generating) {
    if (statusBarItem) {
        if (generating) {
            statusBarItem.text = (0, i18n_1.t)("statusBarGenerating");
            statusBarItem.tooltip = (0, i18n_1.t)("tooltipStop");
            statusBarItem.command = "qwen-commit.stopGeneration";
            statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
            statusBarItem.show();
        }
        else {
            statusBarItem.text = (0, i18n_1.t)("statusBarIdle");
            statusBarItem.tooltip = (0, i18n_1.t)("tooltipGenerate");
            statusBarItem.command = "qwen-commit.generateCommitMessage";
            statusBarItem.backgroundColor = undefined;
            statusBarItem.hide();
        }
    }
}
async function generateCommitMessage(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage((0, i18n_1.t)("noWorkspace"));
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    try {
        // Проверяем, является ли директория git-репозиторием
        let isGitRepo = true;
        try {
            await execAsync("git rev-parse --git-dir", { cwd: workspacePath });
        }
        catch {
            isGitRepo = false;
        }
        if (!isGitRepo) {
            const action = await vscode.window.showErrorMessage((0, i18n_1.t)("notGitRepo"), { modal: true }, { title: (0, i18n_1.t)("initRepo") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
            if (action?.title === (0, i18n_1.t)("initRepo")) {
                try {
                    await execAsync("git init", { cwd: workspacePath });
                    vscode.window.showInformationMessage((0, i18n_1.t)("repoInitialized"));
                    // Рекурсивно вызываем функцию после инициализации
                    return await generateCommitMessage(context);
                }
                catch (initError) {
                    vscode.window.showErrorMessage((0, i18n_1.t)("gitError", initError instanceof Error ? initError.message : (0, i18n_1.t)("unknownError")));
                }
            }
            return;
        }
        // Получаем список измененных файлов
        const { stdout: gitStatus } = await execAsync("git status --porcelain", {
            cwd: workspacePath,
        });
        if (!gitStatus.trim()) {
            vscode.window.showInformationMessage((0, i18n_1.t)("noChanges"));
            return;
        }
        // Проверяем наличие настроенных git credentials
        const credentialsConfigured = await checkGitCredentials(workspacePath);
        if (!credentialsConfigured) {
            const action = await vscode.window.showErrorMessage((0, i18n_1.t)("gitCredentialsMissing"), { modal: true }, { title: (0, i18n_1.t)("configureGit") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
            if (action?.title === (0, i18n_1.t)("configureGit")) {
                await configureGitCredentials(workspacePath);
            }
            return;
        }
        // Проверяем, существует ли HEAD (есть ли коммиты в репозитории)
        let hasHead = true;
        try {
            await execAsync("git rev-parse HEAD", { cwd: workspacePath });
        }
        catch {
            hasHead = false;
        }
        let diffToUse = "";
        if (hasHead) {
            // Используем только staged файлы (добавленные в индекс)
            const { stdout: stagedDiff } = await execAsync("git diff --cached HEAD", {
                cwd: workspacePath,
            });
            if (!stagedDiff.trim()) {
                vscode.window.showInformationMessage((0, i18n_1.t)("noChangesToAnalyze"));
                return;
            }
            diffToUse = stagedDiff;
        }
        else {
            // Репозиторий пуст (нет коммитов)
            const { stdout: stagedDiff } = await execAsync("git diff --cached", {
                cwd: workspacePath,
            });
            if (stagedDiff.trim()) {
                // Есть staged файлы — используем их
                diffToUse = stagedDiff;
            }
            else {
                // Нет staged файлов — сообщаем пользователю
                const action = await vscode.window.showInformationMessage((0, i18n_1.t)("emptyRepoNoStaged"), { modal: true }, { title: (0, i18n_1.t)("stageFiles") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
                if (action?.title === (0, i18n_1.t)("stageFiles")) {
                    vscode.env.clipboard.writeText(`# Добавьте файлы в staging area:\ngit add .\n\n# Затем сгенерируйте сообщение коммита через Qwen Commit`);
                    vscode.window.showInformationMessage((0, i18n_1.t)("commandsCopied"));
                }
                return;
            }
        }
        await generateMessageWithQwen(diffToUse, workspacePath, context);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        vscode.window.showErrorMessage((0, i18n_1.t)("gitError", errorMessage));
    }
}
async function generateMessageWithQwen(diff, workspacePath, context) {
    isGenerating = true;
    abortController = new AbortController();
    // Обновляем context key для переключения иконки
    vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", true);
    updateStatusBar(true);
    const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: (0, i18n_1.t)("progressTitle"),
        cancellable: true,
    };
    try {
        // Проверяем наличие qwen cli
        try {
            // На Windows используем shell: true для корректного запуска .cmd/.bat файлов
            // На macOS/Linux тоже нужен shell: true для запуска npm global пакетов
            const options = {
                cwd: workspacePath,
                shell: true,
            };
            await execAsync("qwen --version", options);
        }
        catch {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenCliNotFound"));
            isGenerating = false;
            abortController = null;
            vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
            updateStatusBar(false);
            return;
        }
        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            // Обработка отмены через токен прогресса
            token.onCancellationRequested(() => {
                if (abortController) {
                    abortController.abort();
                }
            });
            progress.report({ increment: 10 });
            // Формируем промпт для qwen cli
            const prompt = `Generate a commit message following Conventional Commits specification based on the code changes below.

Format:
<type>(<scope>): <subject>

<body>

Rules:
- type: feat|fix|docs|style|refactor|perf|test|chore|ci|build
- subject: max 50 chars, imperative mood, no period
- body: optional, wrap at 72 chars, explain what and why
- **ALWAYS respond in English only**
- Be specific and concise

Changes:
${diff}`;
            progress.report({ increment: 20 });
            // Вызываем qwen cli с передачей промпта через stdin (избегаем E2BIG)
            const { stdout } = await execWithStdin("qwen", {
                cwd: workspacePath,
                signal: abortController?.signal,
            }, prompt);
            progress.report({ increment: 50 });
            let commitMessage = stdout.trim();
            // Удаляем markdown форматирование и code blocks
            // Сначала извлекаем содержимое из code blocks
            const codeBlockMatch = commitMessage.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                commitMessage = codeBlockMatch[1].trim();
            }
            // Затем чистим остальное форматирование
            commitMessage = commitMessage
                .replace(/```/g, '') // Убираем оставшиеся ```
                .replace(/\*\*/g, '') // Убираем **
                .replace(/\*/g, '') // Убираем *
                .replace(/`/g, '') // Убираем `
                .replace(/\n{3,}/g, '\n\n') // Максимум 2 пустые строки
                .trim();
            if (commitMessage) {
                // Вставляем сообщение в input box Git SCM
                await setGitInputBoxValue(commitMessage);
                vscode.window.showInformationMessage((0, i18n_1.t)("commitGenerated"));
            }
            else {
                vscode.window.showWarningMessage((0, i18n_1.t)("emptyMessage"));
            }
            progress.report({ increment: 20 });
        });
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            // Генерация была отменена
            vscode.window.showInformationMessage((0, i18n_1.t)("generationCancelled"));
            return;
        }
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        // Специальная обработка для E2BIG (не должно возникать при stdin)
        if (errorMessage.includes("E2BIG")) {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenCliTooLargeDiff"));
        }
        else {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenError", errorMessage));
        }
        console.error("Qwen CLI error:", error);
    }
    finally {
        isGenerating = false;
        abortController = null;
        vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
        updateStatusBar(false);
    }
}
async function setGitInputBoxValue(message) {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
        throw new Error((0, i18n_1.t)("gitExtensionNotFound"));
    }
    const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
    const api = git.getAPI(1);
    if (api.repositories.length === 0) {
        throw new Error((0, i18n_1.t)("gitRepoNotFound"));
    }
    api.repositories[0].inputBox.value = message;
}
/**
 * Проверка наличия настроенных git credentials (user.name и user.email)
 */
async function checkGitCredentials(workspacePath) {
    try {
        // Проверяем user.name
        const { stdout: userName } = await execAsync("git config user.name", {
            cwd: workspacePath,
        });
        // Проверяем user.email
        const { stdout: userEmail } = await execAsync("git config user.email", {
            cwd: workspacePath,
        });
        return userName.trim().length > 0 && userEmail.trim().length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Настройка git credentials через input boxes
 */
async function configureGitCredentials(workspacePath) {
    // Запрашиваем имя
    const userName = await vscode.window.showInputBox({
        prompt: (0, i18n_1.t)("gitUserNamePrompt"),
        placeHolder: "John Doe",
        ignoreFocusOut: true,
    });
    if (!userName) {
        return;
    }
    // Запрашиваем email
    const userEmail = await vscode.window.showInputBox({
        prompt: (0, i18n_1.t)("gitUserEmailPrompt"),
        placeHolder: "johndoe@example.com",
        ignoreFocusOut: true,
    });
    if (!userEmail) {
        return;
    }
    // Устанавливаем конфиги на локальном уровне (для проекта)
    try {
        await execAsync(`git config user.name "${userName}"`, {
            cwd: workspacePath,
        });
        await execAsync(`git config user.email "${userEmail}"`, {
            cwd: workspacePath,
        });
        vscode.window.showInformationMessage((0, i18n_1.t)("gitConfigured"));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        vscode.window.showErrorMessage((0, i18n_1.t)("gitError", errorMessage));
    }
}
function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    console.log("Qwen Commit extension is now deactivated");
}

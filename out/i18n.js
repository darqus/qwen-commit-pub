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
exports.initLocale = initLocale;
exports.t = t;
const vscode = __importStar(require("vscode"));
const translations = {
    ru: {
        statusBarGenerating: "$(sync~spin) Qwen генерирует...",
        statusBarIdle: "$(qwen-icon) Qwen Commit",
        tooltipStop: "Нажмите для остановки",
        tooltipGenerate: "Нажмите для генерации сообщения коммита",
        alreadyGenerating: "Генерация уже выполняется",
        generationStopped: "Генерация остановлена",
        noWorkspace: "Нет открытых workspace папок",
        noChanges: "Нет изменений для коммита",
        noChangesToAnalyze: "Нет изменений для анализа",
        commitGenerated: "Сообщение коммита сгенерировано!",
        emptyMessage: "Qwen вернул пустое сообщение",
        generationCancelled: "Генерация отменена",
        gitError: "Ошибка git: {0}",
        qwenError: "Ошибка qwen cli: {0}",
        qwenCliNotFound: "Qwen CLI не найден. Установите его командой: npm install -g @qwen-code/qwen-code@latest",
        qwenCliTooLargeDiff: "Слишком большой diff. Попробуйте сделать коммит меньшими изменениями.",
        gitExtensionNotFound: "Git extension не найдена",
        gitRepoNotFound: "Git репозиторий не найден",
        unknownError: "Неизвестная ошибка",
        progressTitle: "Qwen генерирует сообщение коммита...",
        notGitRepo: "Директория не является git-репозиторием",
        initRepo: "Инициализировать репозиторий",
        cancel: "Отмена",
        repoInitialized: "Git-репозиторий инициализирован",
        emptyRepoNoStaged: "Репозиторий пуст и нет файлов в staging area. Добавьте файлы командой `git add .` перед генерацией сообщения.",
        stageFiles: "Показать команды",
        commandsCopied: "Команды скопированы в буфер обмена",
        gitCredentialsMissing: "Git не настроен. Укажите ваше имя и email для продолжения.",
        configureGit: "Настроить Git",
        gitConfigured: "Git настроен успешно",
        gitUserNamePrompt: "Введите ваше имя для Git",
        gitUserEmailPrompt: "Введите ваш email для Git",
    },
    en: {
        statusBarGenerating: "$(sync~spin) Qwen generating...",
        statusBarIdle: "$(qwen-icon) Qwen Commit",
        tooltipStop: "Click to stop",
        tooltipGenerate: "Click to generate commit message",
        alreadyGenerating: "Generation already in progress",
        generationStopped: "Generation stopped",
        noWorkspace: "No workspace folders open",
        noChanges: "No changes to commit",
        noChangesToAnalyze: "No changes to analyze",
        commitGenerated: "Commit message generated!",
        emptyMessage: "Qwen returned empty message",
        generationCancelled: "Generation cancelled",
        gitError: "Git error: {0}",
        qwenError: "Qwen CLI error: {0}",
        qwenCliNotFound: "Qwen CLI not found. Install it with: npm npm install -g @qwen-code/qwen-code@latest",
        qwenCliTooLargeDiff: "Diff is too large. Try committing smaller changes.",
        gitExtensionNotFound: "Git extension not found",
        gitRepoNotFound: "Git repository not found",
        unknownError: "Unknown error",
        progressTitle: "Qwen generating commit message...",
        notGitRepo: "Directory is not a git repository",
        initRepo: "Initialize Repository",
        cancel: "Cancel",
        repoInitialized: "Git repository initialized",
        emptyRepoNoStaged: "Repository is empty and no files in staging area. Add files with `git add .` before generating commit message.",
        stageFiles: "Show Commands",
        commandsCopied: "Commands copied to clipboard",
        gitCredentialsMissing: "Git is not configured. Please set your name and email to continue.",
        configureGit: "Configure Git",
        gitConfigured: "Git configured successfully",
        gitUserNamePrompt: "Enter your Git user name",
        gitUserEmailPrompt: "Enter your Git user email",
    },
};
let currentLocale = "en";
function initLocale() {
    const vscodeLang = vscode.env.language;
    currentLocale = vscodeLang.startsWith("ru") ? "ru" : "en";
}
function t(key, ...args) {
    let message = translations[currentLocale][key] || translations.en[key];
    args.forEach((arg, i) => {
        message = message.replace(`{${i}}`, arg);
    });
    return message;
}

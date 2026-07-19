const { Project } = require("ts-morph");
const path = require("path");
const fs = require("fs");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const createDir = (dirPath) => {
    const fullPath = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
};

createDir("src/app/core");
createDir("src/app/shared");
createDir("src/app/features");
createDir("src/app/features/auth");
createDir("src/app/features/dashboard");

const moveAndSave = (srcPath, destPath) => {
    const dir = project.getDirectory(srcPath);
    if (dir) {
        const absoluteDest = path.resolve(process.cwd(), destPath);
        console.log(`Moving ${srcPath} to ${absoluteDest}`);
        try {
            dir.move(absoluteDest);
            project.saveSync();
            console.log(`Successfully moved and saved ${srcPath}`);
        } catch (e) {
            console.error(`Failed to move ${srcPath}: ${e.message}`);
        }
    } else {
        console.log(`Directory ${srcPath} not found`);
    }
};

// 1. Move to Core
moveAndSave("src/app/services", "src/app/core/services");
moveAndSave("src/app/guards", "src/app/core/guards");
moveAndSave("src/app/interceptors", "src/app/core/interceptors");
moveAndSave("src/app/models", "src/app/core/models");

// 2. Move to Shared
moveAndSave("src/app/modals", "src/app/shared/modals");
moveAndSave("src/app/pipes", "src/app/shared/pipes");

// 3. Move to Features
moveAndSave("src/app/home", "src/app/features/dashboard/home");
moveAndSave("src/app/history", "src/app/features/history");
moveAndSave("src/app/profile", "src/app/features/profile");
moveAndSave("src/app/login", "src/app/features/auth/login");
moveAndSave("src/app/registration", "src/app/features/auth/registration");
moveAndSave("src/app/forgot-password", "src/app/features/auth/forgot-password");
moveAndSave("src/app/reset-password", "src/app/features/auth/reset-password");

console.log("All moves complete.");

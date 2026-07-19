const { Project } = require("ts-morph");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const moveContents = (srcPath, destPath) => {
    const srcDir = project.getDirectory(srcPath);
    if (!srcDir) {
        console.log(`Source directory not found: ${srcPath}`);
        return;
    }
    
    const destDir = project.getDirectory(destPath) || project.createDirectory(destPath);
    
    console.log(`Moving contents of ${srcPath} to ${destPath}...`);
    
    srcDir.getSourceFiles().forEach(file => {
        try { file.moveToDirectory(destDir, { overwrite: true }); } catch (e) {}
    });
    
    srcDir.getDirectories().forEach(dir => {
        try { dir.moveToDirectory(destDir); } catch (e) {}
    });
};

moveContents("src/app/models", "src/app/core/models");
moveContents("src/app/modals", "src/app/shared/modals");

console.log("Saving project...");
project.saveSync();
console.log("Move complete.");

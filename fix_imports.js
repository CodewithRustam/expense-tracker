const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.ts')) results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

walk('./src/app', (err, results) => {
  if (err) throw err;
  
  let changes = 0;
  
  results.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix absolute path imports if any (the user codebase apparently used some 'src/app/services/...')
    content = content.replace(/['"]src\/app\/services\/(.*?)['"]/g, "'src/app/core/services/$1'");
    content = content.replace(/['"]src\/app\/models\/(.*?)['"]/g, "'src/app/core/models/$1'");
    content = content.replace(/['"]src\/app\/modals\/(.*?)['"]/g, "'src/app/shared/modals/$1'");
    content = content.replace(/['"]src\/app\/guards\/(.*?)['"]/g, "'src/app/core/guards/$1'");
    content = content.replace(/['"]src\/app\/interceptors\/(.*?)['"]/g, "'src/app/core/interceptors/$1'");
    content = content.replace(/['"]src\/app\/pipes\/(.*?)['"]/g, "'src/app/shared/pipes/$1'");

    // Fix relative paths for modals since they moved to shared/modals.
    // If a modal component imports from services, it used to be '../../services'. Now it should be '../../../core/services'
    // Let's just fix the remaining ts-morph errors. The Angular CLI gave us exactly what failed.
    
    // Actually, I can just fix the specific errors from the CLI:
    // It said: Can't resolve '../../../../pipes/initials.pipe' in 'D:\IonicProjects\expense-tracker\src\app\features\expense-dashboard\components\member-list'
    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/\.\.\/pipes\/initials.pipe['"]/g, "'../../../../shared/pipes/initials.pipe'");
    content = content.replace(/['"]\.\.\/\.\.\/\.\.\/\.\.\/pipes\/first-name.pipe['"]/g, "'../../../../shared/pipes/first-name.pipe'");
    
    // Also, some features use relative imports to services/models that were not caught if ts-morph crashed.
    // Instead of regex hacking, I'll rely on the typescript compiler by running the build.
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changes++;
    }
  });
  
  console.log(`Updated ${changes} files.`);
});

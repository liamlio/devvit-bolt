// setup-devvit.cjs - Devvit project setup script
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');
const yaml = require('yaml');

function generateRandomSuffix(length) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

function updateDevvitName() {
  const devvitYamlPath = path.join(process.cwd(), 'devvit.yaml');
  const content = fs.readFileSync(devvitYamlPath, 'utf8');
  const parsedYaml = yaml.parse(content);

  if (parsedYaml.name === 'YOUR_APP_NAME') {
    const suffix = generateRandomSuffix(6);
    parsedYaml.name = `ttol-${suffix}`;
    fs.writeFileSync(devvitYamlPath, yaml.stringify(parsedYaml));
    console.log(`Updated app name to ttol-${suffix}`);
  }
}

function checkDevvitAuth() {
  try {
    // Try to run a simple devvit command to check if auth is valid
    execSync('devvit whoami', { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function runChecks() {
  let allPassed = true;
  const checks = [];

  // Check 1: Devvit login - now validates the token works
  const devvitTokenPath = path.join(os.homedir(), '.devvit', 'token');
  const tokenExists = fs.existsSync(devvitTokenPath);
  const isAuthValid = tokenExists && checkDevvitAuth();
  
  checks.push({
    name: 'Authentication',
    passed: isAuthValid,
    message: isAuthValid
      ? "You're logged in to Devvit!"
      : tokenExists 
        ? 'Your Devvit token has expired. Please run `npm run login` to re-authenticate'
        : 'Please run `npm run login` to authenticate with Reddit',
  });

  // Check 2: App upload check
  const uploadedPath = path.join(process.cwd(), '.initialized');
  const isUploaded = fs.existsSync(uploadedPath);
  checks.push({
    name: 'App initialization',
    passed: isUploaded,
    message: isUploaded
      ? 'App has been initialized'
      : 'Please run `npm run devvit:init` to setup your app remotely',
  });

  // Check 3: Subreddit configuration
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  const devScript = packageJson.scripts && packageJson.scripts['dev:devvit'];
  const hasSubreddit = devScript && !devScript.includes('YOUR_SUBREDDIT_NAME');
  checks.push({
    name: 'Playtest subreddit',
    passed: hasSubreddit,
    message: hasSubreddit
      ? 'Subreddit is configured!'
      : 'Please update YOUR_SUBREDDIT_NAME in the dev:devvit script in package.json',
  });

  // Print check results
  checks.forEach((check) => {
    const emoji = check.passed ? '✅' : '❌';
    console.log(`${emoji}  ${check.name}: ${check.message}`);
    if (!check.passed) allPassed = false;
  });

  return allPassed;
}

async function main() {
  try {
    // Step 1: Update devvit.yaml name
    updateDevvitName();

    // Step 2: Run checks
    const checksPass = await runChecks();

    // Step 3: If all checks pass, run dev:devvit
    if (checksPass) {
      console.log('\nAll checks passed! Starting Devvit playtest...');
      console.log('If you encounter "fetch failed" errors, try running `npm run login` to refresh your authentication.\n');
      
      const devProcess = exec('npm run dev:devvit', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running dev:devvit: ${error.message}`);
          if (error.message.includes('fetch failed') || error.message.includes('TypeError: fetch failed')) {
            console.error('\n🔧 Troubleshooting tip: This error usually indicates an authentication issue.');
            console.error('   Try running: npm run login');
            console.error('   Then run: npm run dev');
          }
          process.exit(1);
        }
      });

      devProcess.stdout.pipe(process.stdout);
      devProcess.stderr.pipe(process.stderr);
    } else {
      console.log('\nPlease fix the issues above and try again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('fetch failed') || error.message.includes('TypeError: fetch failed')) {
      console.error('\n🔧 Troubleshooting tip: This error usually indicates an authentication issue.');
      console.error('   Try running: npm run login');
      console.error('   Then run: npm run dev');
    }
    process.exit(1);
  }
}

main();
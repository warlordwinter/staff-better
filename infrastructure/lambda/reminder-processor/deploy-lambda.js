#!/usr/bin/env node
/**
 * Cross-platform Node.js script to deploy Lambda function code
 * Usage: node deploy-lambda.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try to require archiver, install if missing
let archiver;
try {
  archiver = require('archiver');
} catch (error) {
  console.log('📦 Installing archiver package...');
  try {
    execSync('npm install archiver --save-dev', { stdio: 'inherit', cwd: __dirname });
    archiver = require('archiver');
  } catch (installError) {
    console.error('❌ Failed to install archiver. Please run: npm install archiver --save-dev');
    process.exit(1);
  }
}

const FUNCTION_NAME = 'ReminderProcessor';
const REGION = 'us-east-1';
const ZIP_FILE = 'function.zip';

console.log('🚀 Deploying Lambda function code...\n');

// Check if AWS CLI is installed
try {
  const awsVersion = execSync('aws --version', { encoding: 'utf-8' }).trim();
  console.log(`✓ AWS CLI found: ${awsVersion}`);
} catch (error) {
  console.error('❌ AWS CLI not found. Please install it first.');
  console.error('   Download from: https://aws.amazon.com/cli/');
  process.exit(1);
}

// Check if Node.js dependencies are installed
const lambdaDir = __dirname;
const packageJsonPath = path.join(lambdaDir, 'package.json');
const nodeModulesPath = path.join(lambdaDir, 'node_modules');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install --production', { 
    cwd: lambdaDir, 
    stdio: 'inherit' 
  });
  console.log('✓ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

// Create deployment package
console.log('\n📦 Creating deployment package...');

// Remove old zip if exists
if (fs.existsSync(path.join(lambdaDir, ZIP_FILE))) {
  fs.unlinkSync(path.join(lambdaDir, ZIP_FILE));
  console.log('✓ Removed old function.zip');
}

// Create zip file
return new Promise((resolve, reject) => {
  const output = fs.createWriteStream(path.join(lambdaDir, ZIP_FILE));
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const zipSize = archive.pointer() / (1024 * 1024);
    console.log(`✓ Created function.zip (${zipSize.toFixed(2)} MB)`);
    
    if (zipSize > 50) {
      console.warn('⚠️  Warning: Package is larger than 50MB. Consider using Lambda layers for dependencies.');
    }

    // Deploy to Lambda
    console.log('\n☁️  Deploying to AWS Lambda...');
    console.log(`   Function name: ${FUNCTION_NAME}`);
    
    try {
      execSync(
        `aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://${ZIP_FILE} --region ${REGION}`,
        { cwd: lambdaDir, stdio: 'inherit' }
      );
      
      console.log('\n✅ Lambda function deployed successfully!');
      console.log('\n⏳ Waiting for deployment to complete...');
      
      // Wait a moment
      setTimeout(() => {
        console.log('\n📋 Verifying deployment...');
        try {
          execSync(
            `aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION}`,
            { stdio: 'pipe' }
          );
          console.log('✓ Deployment verified');
          console.log('\n💡 Next steps:');
          console.log('   1. Check CloudWatch Logs: /aws/lambda/ReminderProcessor');
          console.log('   2. Test the function using the test command in SETUP_CHECKLIST.md');
          console.log('\n✨ Done!');
          resolve();
        } catch (error) {
          console.error('⚠️  Could not verify deployment, but it may have succeeded');
          console.error('   Check AWS Console to confirm');
          resolve();
        }
      }, 3000);
    } catch (error) {
      console.error('❌ Deployment failed. Check AWS credentials and permissions.');
      reject(error);
    }
  });

  archive.on('error', (err) => {
    console.error('❌ Error creating zip file:', err);
    reject(err);
  });

  archive.pipe(output);
  
  // Add files
  archive.file(path.join(lambdaDir, 'index.js'), { name: 'index.js' });
  archive.directory(path.join(lambdaDir, 'node_modules'), 'node_modules');
  
  archive.finalize();
}).catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});


import * as path from 'path';
import * as fs from 'fs';
import { TransferAgentConfig } from './helpers/config';
import { TransferAgentClient } from './helpers/client';

interface UploadOptions {
    packageName: string;
    providerName?: string;
    verbose?: boolean;
}

async function buildPackage(packageName: string, verbose: boolean = false): Promise<string> {
    const packagePath = path.join(process.cwd(), '../src', packageName);
    
    // Check if package directory exists
    if (!fs.existsSync(packagePath)) {
        throw new Error(`Package directory not found: ${packagePath}`);
    }
    
    // Check if daml.yaml exists in the package
    const damlYamlPath = path.join(packagePath, 'daml.yaml');
    if (!fs.existsSync(damlYamlPath)) {
        throw new Error(`daml.yaml not found in package: ${packagePath}`);
    }
    
    console.log(`Building package: ${packageName}`);
    
    // Use daml build command via child_process.exec for better error handling
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
        const { stdout, stderr } = await execAsync('daml build', {
            cwd: packagePath,
            stdio: verbose ? 'inherit' : 'pipe'
        });
        
        if (verbose && stdout) {
            console.log(stdout);
        }
        if (verbose && stderr) {
            console.error(stderr);
        }
        
        console.log(`Successfully built package: ${packageName}`);
        return packagePath;
    } catch (error) {
        throw new Error(`Failed to build package ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function findDarFile(packagePath: string, packageName: string): Promise<string> {
    const damlDistPath = path.join(packagePath, '.daml', 'dist');
    
    if (!fs.existsSync(damlDistPath)) {
        throw new Error(`Build output directory not found: ${damlDistPath}`);
    }
    
    // Read daml.yaml to get the package version
    const damlYamlPath = path.join(packagePath, 'daml.yaml');
    const damlYamlContent = fs.readFileSync(damlYamlPath, 'utf8');
    
    // Extract version from daml.yaml (simple regex approach)
    const versionMatch = damlYamlContent.match(/version:\s*([^\s]+)/);
    const version = versionMatch ? versionMatch[1] : '0.0.1';
    
    const expectedDarName = `${packageName}-${version}.dar`;
    const darPath = path.join(damlDistPath, expectedDarName);
    
    if (!fs.existsSync(darPath)) {
        // Try to find any .dar file in the dist directory
        const files = fs.readdirSync(damlDistPath);
        const darFiles = files.filter(file => file.endsWith('.dar'));
        
        if (darFiles.length === 0) {
            throw new Error(`No .dar file found in ${damlDistPath}`);
        }
        
        if (darFiles.length > 1) {
            console.warn(`Multiple .dar files found in ${damlDistPath}, using last one: ${darFiles[darFiles.length - 1]}`);
        }
        
        return path.join(damlDistPath, darFiles[darFiles.length - 1]);
    }
    
    return darPath;
}

async function uploadDarFile(darPath: string, client: TransferAgentClient, verbose: boolean = false): Promise<void> {
    console.log(`Uploading DAR file: ${darPath}`);
    
    try {
        const result = await client.uploadPackage(darPath);
        console.log(`Successfully uploaded DAR file: ${darPath}`);
        if (verbose) {
            console.log('Upload result:', result);
        }
    } catch (error) {
        throw new Error(`Failed to upload DAR file ${darPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function uploadPackage(options: UploadOptions): Promise<void> {
    const { packageName, providerName = '5N DevNet', verbose = false } = options;
    
    try {
        console.log(`Starting upload process for package: ${packageName}`);
        console.log(`Using provider: ${providerName}`);
        
        // Initialize the client
        const config = new TransferAgentConfig();
        const client = new TransferAgentClient(config, providerName);
        
        // Step 1: Build the package
        const packagePath = await buildPackage(packageName, verbose);
        
        // Step 2: Find the generated DAR file
        const darPath = await findDarFile(packagePath, packageName);
        console.log(`Found DAR file: ${darPath}`);
        
        // Step 3: Upload the DAR file using the client
        await uploadDarFile(darPath, client, verbose);
        
        console.log(`✅ Successfully uploaded package: ${packageName}`);
        
    } catch (error) {
        console.error(`❌ Failed to upload package ${packageName}:`, error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

function printUsage(): void {
    console.log(`
Usage: ts-node uploadPackage.ts <package-name> [options]

Arguments:
  package-name    The name of the package to upload (must exist in /src/ directory)

Options:
  --provider <name>    Provider name to use (default: 5N DevNet)
  --verbose           Enable verbose output
  --help             Show this help message

Examples:
  ts-node uploadPackage.ts Test
  ts-node uploadPackage.ts OpenCapTable-v01 --provider "5N DevNet" --verbose
`);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        return;
    }
    
    const packageName = args[0];
    
    // Parse options
    const options: UploadOptions = {
        packageName,
        verbose: args.includes('--verbose'),
    };
    
    // Find provider name if specified
    const providerIndex = args.indexOf('--provider');
    if (providerIndex !== -1 && providerIndex + 1 < args.length) {
        options.providerName = args[providerIndex + 1];
    }
    
    await uploadPackage(options);
}

if (require.main === module) {
    main();
} 
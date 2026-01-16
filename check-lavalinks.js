const axios = require('axios');
const config = require('./config.js');
const colors = require('./UI/colors/colors');

async function checkNode(node, index) {
    const nodeName = node.name || `Node ${index + 1}`;
    const protocol = node.secure ? 'https' : 'http';
    const url = `${protocol}://${node.host}:${node.port}/version`;
    
    console.log(`${colors.cyan}[${index + 1}]${colors.reset} Checking ${colors.yellow}${nodeName}${colors.reset} (${node.host}:${node.port})...`);
    
    try {
        const startTime = Date.now();
        const response = await axios.get(url, {
            headers: node.password ? { Authorization: node.password } : {},
            timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
            const version = response.data?.version || response.data || 'Unknown';
            console.log(`${colors.green}  ✅ ONLINE${colors.reset} - Version: ${colors.cyan}${version}${colors.reset} - Response time: ${colors.yellow}${responseTime}ms${colors.reset}`);
            return { node: nodeName, status: 'online', version, responseTime, host: node.host, port: node.port };
        } else {
            console.log(`${colors.red}  ❌ OFFLINE${colors.reset} - Status: ${response.status}`);
            return { node: nodeName, status: 'offline', error: `Status ${response.status}`, host: node.host, port: node.port };
        }
    } catch (error) {
        let errorMsg = 'Unknown error';
        if (error.code === 'ECONNREFUSED') {
            errorMsg = 'Connection refused';
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            errorMsg = 'Connection timeout';
        } else if (error.response) {
            errorMsg = `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        console.log(`${colors.red}  ❌ OFFLINE${colors.reset} - Error: ${colors.yellow}${errorMsg}${colors.reset}`);
        return { node: nodeName, status: 'offline', error: errorMsg, host: node.host, port: node.port };
    }
}

async function checkAllNodes() {
    console.log('\n' + '─'.repeat(60));
    console.log(`${colors.magenta}${colors.bright}🔍 LAVALINK NODE STATUS CHECK${colors.reset}`);
    console.log('─'.repeat(60) + '\n');
    
    if (!config.nodes || !Array.isArray(config.nodes) || config.nodes.length === 0) {
        console.log(`${colors.red}No nodes configured in config.js${colors.reset}`);
        return;
    }
    
    console.log(`Checking ${colors.cyan}${config.nodes.length}${colors.reset} node(s)...\n`);
    
    const results = [];
    const checks = config.nodes.map((node, index) => checkNode(node, index));
    const nodeResults = await Promise.allSettled(checks);
    
    nodeResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            results.push(result.value);
        } else {
            const nodeName = config.nodes[index]?.name || `Node ${index + 1}`;
            console.log(`${colors.red}  ❌ ERROR${colors.reset} - Failed to check node: ${result.reason?.message || 'Unknown error'}`);
            results.push({ 
                node: nodeName, 
                status: 'error', 
                error: result.reason?.message || 'Unknown error',
                host: config.nodes[index]?.host,
                port: config.nodes[index]?.port
            });
        }
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`${colors.magenta}${colors.bright}📊 SUMMARY${colors.reset}`);
    console.log('─'.repeat(60));
    
    const online = results.filter(r => r.status === 'online');
    const offline = results.filter(r => r.status === 'offline');
    const errors = results.filter(r => r.status === 'error');
    
    console.log(`${colors.green}✅ Online: ${online.length}${colors.reset}`);
    console.log(`${colors.red}❌ Offline: ${offline.length}${colors.reset}`);
    if (errors.length > 0) {
        console.log(`${colors.yellow}⚠️  Errors: ${errors.length}${colors.reset}`);
    }
    
    if (online.length > 0) {
        console.log(`\n${colors.green}Working Nodes:${colors.reset}`);
        online.forEach(node => {
            console.log(`  ${colors.green}✓${colors.reset} ${colors.cyan}${node.node}${colors.reset} (${node.host}:${node.port}) - ${node.version} - ${node.responseTime}ms`);
        });
    }
    
    if (offline.length > 0) {
        console.log(`\n${colors.red}Offline Nodes:${colors.reset}`);
        offline.forEach(node => {
            console.log(`  ${colors.red}✗${colors.reset} ${colors.cyan}${node.node}${colors.reset} (${node.host}:${node.port}) - ${colors.yellow}${node.error}${colors.reset}`);
        });
    }
    
    if (errors.length > 0) {
        console.log(`\n${colors.yellow}Error Nodes:${colors.reset}`);
        errors.forEach(node => {
            console.log(`  ${colors.yellow}⚠${colors.reset} ${colors.cyan}${node.node}${colors.reset} (${node.host}:${node.port}) - ${colors.yellow}${node.error}${colors.reset}`);
        });
    }
    
    console.log('\n' + '─'.repeat(60));
    
    if (online.length === 0) {
        console.log(`${colors.red}⚠️  WARNING: No nodes are currently online!${colors.reset}`);
        console.log(`${colors.yellow}The bot will not be able to play music until at least one node is available.${colors.reset}\n`);
        process.exit(1);
    } else {
        console.log(`${colors.green}✓ At least one node is available. Bot should work properly.${colors.reset}\n`);
        process.exit(0);
    }
}

// Run the check
checkAllNodes().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});

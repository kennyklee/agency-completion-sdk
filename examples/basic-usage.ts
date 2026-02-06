/**
 * Basic usage example for Agency Completion SDK
 * 
 * Run: npx ts-node examples/basic-usage.ts
 */

import { AgencyClient } from '../src';

async function main() {
  // Initialize with mock mode for testing
  const client = new AgencyClient({
    apiKey: 'test-key',
    mockMode: true,
  });

  console.log('Submitting CAPTCHA task...');
  
  const ticket = await client.submit({
    type: 'captcha',
    url: 'https://example.com/signup',
    instructions: 'Solve the CAPTCHA and click Submit',
  });

  console.log(`Ticket created: ${ticket.id}`);
  console.log(`Status: ${ticket.status}`);
  console.log(`Estimated wait: ${ticket.estimatedWaitSeconds}s`);

  console.log('\nWaiting for completion...');
  
  const result = await client.wait(ticket.id);

  console.log(`\nTask completed!`);
  console.log(`Final status: ${result.status}`);
  console.log(`Data:`, result.data);
}

main().catch(console.error);

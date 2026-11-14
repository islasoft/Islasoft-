import { base44 } from '@/api/base44Client';

/**
 * Generates the next client number based on type (individual or entity)
 * Individual clients: I-XXX
 * Entity clients: E-XXX
 */
export async function generateNextClientNumber(isIndividual = true) {
  const prefix = isIndividual ? 'I-' : 'E-';
  
  try {
    // Fetch all clients to find the highest number for this prefix
    const allClients = await base44.entities.Client.list();
    
    // Filter clients with the matching prefix and extract numbers
    const numbers = allClients
      .filter(client => client.client_number?.startsWith(prefix))
      .map(client => {
        const match = client.client_number.match(new RegExp(`^${prefix}(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    // Get the next number
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Format with leading zeros (3 digits minimum)
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating client number:', error);
    // Fallback to timestamp-based number if fetch fails
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
}
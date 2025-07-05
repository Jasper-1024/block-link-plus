/**
 * Check if a reference is a multiline block reference
 * Multiline blocks have the pattern #^id-id where both ids are the same
 * @param ref The reference string (e.g., "file#^abc123-abc123")
 * @returns true if it's a multiline block reference
 */
export const isMultilineBlockRef = (ref: string): boolean => {
  // Extract the part after #
  const hashIndex = ref.lastIndexOf('#');
  if (hashIndex === -1) return false;
  
  const blockRef = ref.substring(hashIndex);
  // Check if it matches the multiline pattern #^id-id
  const match = blockRef.match(/^#\^([a-z0-9]+)-\1$/);
  return !!match;
};

/**
 * Extract the href attribute from an embed element
 * @param embed The embed element
 * @returns The href string or empty string if not found
 */
export const getEmbedHref = (embed: Element): string => {
  // Try different possible attributes
  return embed.getAttribute('data-href') || 
         embed.getAttribute('src') || 
         embed.getAttribute('alt') || 
         '';
}; 
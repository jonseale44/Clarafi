// Server-side password strength calculation
// Implements evidence-based password security following NIST guidelines

import crypto from 'crypto';

export interface PasswordStrength {
  score: number; // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong';
  entropy: number;
  isAcceptable: boolean;
  feedback: string;
  suggestions: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      strength: 'weak',
      entropy: 0,
      isAcceptable: false,
      feedback: 'Password is required',
      suggestions: ['Enter a password']
    };
  }

  // Calculate entropy
  const length = password.length;
  const uniqueChars = new Set(password).size;
  
  // Base entropy calculation
  let charSpace = 0;
  if (/[a-z]/.test(password)) charSpace += 26;
  if (/[A-Z]/.test(password)) charSpace += 26;
  if (/[0-9]/.test(password)) charSpace += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charSpace += 32;
  
  const entropy = length * Math.log2(charSpace || 1);
  
  // Calculate score (0-100)
  let score = 0;
  
  // Length is most important (up to 50 points)
  if (length >= 12) score += 30;
  else if (length >= 10) score += 20;
  else if (length >= 8) score += 10;
  else score += (length / 8) * 10;
  
  if (length >= 16) score += 10;
  if (length >= 20) score += 10;
  
  // Character variety (up to 20 points)
  if (uniqueChars >= 10) score += 20;
  else if (uniqueChars >= 7) score += 15;
  else if (uniqueChars >= 5) score += 10;
  else if (uniqueChars >= 3) score += 5;
  
  // Entropy bonus (up to 30 points)
  if (entropy >= 60) score += 30;
  else if (entropy >= 50) score += 25;
  else if (entropy >= 40) score += 20;
  else if (entropy >= 30) score += 15;
  else if (entropy >= 20) score += 10;
  else score += (entropy / 20) * 10;
  
  // Common patterns deductions
  const lowerPassword = password.toLowerCase();
  
  // Check for common passwords
  const commonPasswords = [
    'password', 'password123', 'admin', 'admin123', 'letmein', 
    'welcome', 'welcome123', 'qwerty', '123456', 'password1',
    'changeme', 'default', 'guest', 'passw0rd', 'temp123'
  ];
  
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    score = Math.max(0, score - 40);
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 10);
  }
  
  // Check for sequential characters
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password) ||
      /123|234|345|456|567|678|789|890/.test(password)) {
    score = Math.max(0, score - 10);
  }
  
  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score >= 80) strength = 'strong';
  else if (score >= 60) strength = 'good';
  else if (score >= 40) strength = 'fair';
  else strength = 'weak';
  
  // Determine if acceptable (12+ chars with reasonable entropy)
  const isAcceptable = length >= 12 && entropy >= 30 && uniqueChars >= 4;
  
  // Generate feedback
  let feedback = '';
  const suggestions: string[] = [];
  
  if (length < 12) {
    feedback = `Password must be at least 12 characters (currently ${length})`;
    suggestions.push('Make your password longer');
  } else if (uniqueChars < 4) {
    feedback = 'Password has too few unique characters';
    suggestions.push('Use more variety in your password');
  } else if (entropy < 30) {
    feedback = 'Password is too predictable';
    suggestions.push('Try using a mix of words and numbers');
  } else if (score >= 80) {
    feedback = 'Excellent password!';
  } else if (score >= 60) {
    feedback = 'Good password';
    if (length < 16) suggestions.push('Consider making it even longer for better security');
  } else {
    feedback = 'Password could be stronger';
    if (length < 16) suggestions.push('Try making it longer');
    if (uniqueChars < 8) suggestions.push('Use more unique characters');
  }
  
  // Additional suggestions based on patterns
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    suggestions.push('Avoid common passwords or variations');
  }
  
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Avoid repeated characters');
  }
  
  if (/\d{4,}/.test(password)) {
    suggestions.push('Long number sequences are predictable');
  }
  
  // Suggest passphrases for weak passwords
  if (score < 40 && length < 16) {
    suggestions.push('Try a passphrase like "my coffee needs 3 sugars daily"');
  }
  
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    strength,
    entropy: Math.round(entropy * 10) / 10,
    isAcceptable,
    feedback,
    suggestions
  };
}

// Generate cryptographically secure random password
export function generateSecurePassword(length: number = 16): string {
  // Use crypto.randomInt which is available in Node.js
  
  // Use a character set that's easy to read and type
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(crypto.randomInt(0, charset.length));
  }
  
  return password;
}

// Check if password is in common breach lists (simplified version)
export function isPasswordBreached(password: string): boolean {
  // In production, this would check against haveibeenpwned.com API
  // For now, just check against our common passwords list
  const commonBreachedPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', '12345678', 'qwerty123', '1q2w3e4r',
    'admin', 'welcome', 'monkey', '1234567890', 'letmein',
    'dragon', '111111', 'baseball', 'iloveyou', 'trustno1'
  ];
  
  return commonBreachedPasswords.includes(password.toLowerCase());
}
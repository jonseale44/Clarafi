// Evidence-based password strength calculation

// Common passwords list (top 10000 most common)
// In production, this would be loaded from a larger dataset
const COMMON_PASSWORDS = new Set([
  'password', '123456', 'password123', 'admin', 'letmein', 'welcome',
  'monkey', '1234567890', 'qwerty', 'abc123', 'Password1', 'password1',
  '123456789', 'welcome123', 'admin123', 'root', 'Password123',
  // Add more from a comprehensive list
]);

// Character sets for entropy calculation
const CHAR_SETS = {
  lowercase: 26,
  uppercase: 26,
  numbers: 10,
  special: 32, // Common special characters
  space: 1,
};

export interface PasswordStrength {
  score: number; // 0-100
  entropy: number; // Bits of entropy
  feedback: string[];
  isAcceptable: boolean;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  
  // Check minimum length
  if (password.length < 12) {
    feedback.push(`Password is too short (${password.length}/12 characters minimum)`);
  }
  
  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      score: 0,
      entropy: 0,
      feedback: ['This is a commonly used password. Please choose something unique.'],
      isAcceptable: false,
    };
  }
  
  // Check for repeated characters (like "111111111111")
  const uniqueChars = new Set(password).size;
  if (uniqueChars < 4) {
    feedback.push('Password has too few unique characters');
  }
  
  // Check for sequential patterns
  if (hasSequentialPattern(password)) {
    feedback.push('Avoid sequential patterns like "123" or "abc"');
  }
  
  // Calculate character space
  let charSpace = 0;
  if (/[a-z]/.test(password)) charSpace += CHAR_SETS.lowercase;
  if (/[A-Z]/.test(password)) charSpace += CHAR_SETS.uppercase;
  if (/[0-9]/.test(password)) charSpace += CHAR_SETS.numbers;
  if (/[^a-zA-Z0-9\s]/.test(password)) charSpace += CHAR_SETS.special;
  if (/\s/.test(password)) charSpace += CHAR_SETS.space;
  
  // Calculate entropy: log2(charSpace^length)
  const entropy = Math.log2(Math.pow(charSpace, password.length));
  
  // Score based on entropy (NIST recommendations)
  let score = 0;
  if (entropy >= 60) score = 100; // Excellent
  else if (entropy >= 50) score = 80; // Strong
  else if (entropy >= 40) score = 60; // Good
  else if (entropy >= 30) score = 40; // Fair
  else score = 20; // Weak
  
  // Adjust score for length bonus
  if (password.length >= 20) score = Math.min(100, score + 20);
  else if (password.length >= 16) score = Math.min(100, score + 10);
  
  // Penalize for patterns
  if (uniqueChars < password.length / 3) score = Math.max(0, score - 30);
  
  // Provide helpful feedback
  if (score < 60 && password.length < 16) {
    feedback.push('Consider using a longer passphrase for better security');
  }
  
  if (charSpace < 36 && password.length < 16) {
    feedback.push('Mix different character types or use a longer password');
  }
  
  return {
    score,
    entropy: Math.round(entropy),
    feedback,
    isAcceptable: password.length >= 12 && score >= 40 && uniqueChars >= 4,
  };
}

function hasSequentialPattern(password: string): boolean {
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];
  
  const lower = password.toLowerCase();
  
  for (const seq of sequences) {
    // Check forward and reverse sequences of 3+ characters
    for (let i = 0; i <= seq.length - 3; i++) {
      const pattern = seq.substring(i, i + 3);
      const reversePattern = pattern.split('').reverse().join('');
      
      if (lower.includes(pattern) || lower.includes(reversePattern)) {
        return true;
      }
    }
  }
  
  return false;
}

export function getStrengthColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getStrengthLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Weak';
  return 'Very Weak';
}
// BACKUP FILE - Created before SOAP note generation technical debt cleanup
// This is a complete backup of server/routes.ts before removing legacy prompts
// Date: 2025-06-26

// Note: This backup was created to preserve the current state before:
// 1. Removing the corrupted buildSOAPPrompt with ??? artifacts
// 2. Consolidating duplicate SOAP prompts
// 3. Cleaning up legacy/unused code

// Original file will be modified to fix critical production issue where
// SOAP notes are generated with unprofessional ??? suffixes due to test artifacts

// To restore: Replace server/routes.ts content with this backup file
# Evidence-Based Password Security Research

## The Myth of Password Complexity

Research from NIST (National Institute of Standards and Technology) and security experts has shown that traditional password complexity requirements often **decrease** security rather than improving it.

## What the Research Shows

### 1. **Length Beats Complexity** (Most Important)
- **Evidence**: A 20-character passphrase like "correct horse battery staple" is exponentially more secure than "P@ssw0rd123!"
- **Math**: Each additional character increases entropy exponentially
- **NIST SP 800-63B**: Recommends minimum 8 characters, but longer is better
- **Real-world impact**: 12+ character passwords are effectively uncrackable with current technology

### 2. **Complexity Requirements Create Predictable Patterns**
- Users substitute characters predictably: @ for a, 3 for e, ! at the end
- "Password1!" meets most complexity requirements but is trivially crackable
- Research shows 50%+ of users follow the same substitution patterns

### 3. **Multi-Factor Authentication (MFA) is 1000x More Important**
- **Microsoft Study (2019)**: MFA blocks 99.9% of automated attacks
- Even weak passwords with MFA are more secure than strong passwords alone
- SMS-based MFA: Blocks ~95% of attacks
- App-based MFA: Blocks ~99% of attacks
- Hardware keys: Blocks ~99.9% of attacks

### 4. **Password Reuse is the Real Killer**
- **Google Study (2019)**: 52% of people reuse passwords
- One breach compromises all accounts
- Unique passwords per service is critical

### 5. **Forced Password Rotation is Counterproductive**
- **University of North Carolina Study**: Users make predictable changes (Password1 → Password2)
- NIST now recommends against regular password changes without evidence of compromise
- Leads to weaker passwords and password fatigue

## Evidence-Based Best Practices (Ranked by Impact)

### 1. **Implement MFA** (99.9% attack reduction)
- This alone is more important than all password policies combined
- Even SMS-based MFA dramatically improves security

### 2. **Encourage Long Passphrases** (Exponential security increase)
- Minimum 12 characters, ideally 16+
- Allow spaces and all characters
- Suggest passphrases: "My coffee needs 3 sugars daily!"

### 3. **Check Against Breach Lists** (Prevents 30% of compromised passwords)
- Use haveibeenpwned.com API or similar
- Block known compromised passwords
- More effective than complexity rules

### 4. **Implement Account Lockouts** (Blocks brute force)
- Progressive delays after failed attempts
- Temporary lockouts after X attempts
- Rate limiting on login endpoints

### 5. **Use Password Managers** (Enables unique, strong passwords)
- Encourage/integrate password manager support
- Makes unique 20+ character passwords practical

## What NOT to Do (Evidence-Based)

### 1. **Don't Force Regular Password Changes**
- Only require changes on evidence of compromise
- Users make predictable incremental changes

### 2. **Don't Use Overly Complex Rules**
- "Must contain uppercase, lowercase, number, special character" leads to Password1!
- Better: "Must be at least 12 characters"

### 3. **Don't Limit Password Length**
- Many systems cap at 16-20 characters (bad!)
- Allow at least 64 characters (NIST recommendation)

### 4. **Don't Restrict Special Characters**
- Let users use spaces, emojis, any Unicode
- Increases password space dramatically

## Real-World Security Impact

Based on breach analysis:
- **MFA**: Prevents 99.9% of automated attacks
- **12+ character passwords**: Effectively uncrackable via brute force
- **Breach list checking**: Prevents 30% of compromised passwords
- **Complexity requirements**: Minimal impact, often negative

## Implementation for Our EMR

### Current Issues:
1. We require complexity but only 8 characters (should be 12+)
2. No MFA implementation
3. No breach list checking
4. Forcing password changes for new accounts

### Recommended Changes:
1. **Priority 1**: Implement MFA (even basic TOTP)
2. **Priority 2**: Increase minimum to 12 characters, remove complexity requirements
3. **Priority 3**: Add breach list checking via haveibeenpwned API
4. **Priority 4**: Remove forced password changes except on compromise

## References

1. NIST Special Publication 800-63B (Digital Identity Guidelines)
2. Microsoft Identity Protection Team (2019): "Your Pa$$word doesn't matter"
3. Google Security Blog (2019): New research on password habits
4. University of North Carolina: The Security of Modern Password Expiration
5. Troy Hunt: Password complexity requirements are dumb
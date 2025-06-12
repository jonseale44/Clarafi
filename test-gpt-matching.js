/**
 * Test script to verify GPT medical problem matching logic
 * Tests if GPT correctly identifies "Type 2 diabetes" should update existing "Dm2" problem
 */

const testSoapNote = `
**SUBJECTIVE:**
- 23-year-old male returns for diabetes follow-up
- Type 2 diabetes well controlled on current regimen
- Taking metformin 1000mg twice daily with good adherence
- Recent A1c was 7.1%, improved from prior 8.2%
- No hypoglycemic episodes
- No diabetic complications noted
- Diet and exercise compliance good

**OBJECTIVE:**
- Vitals: BP 128/82, HR 72, BMI 28.5
- Feet: No ulcers, good pulses, normal sensation
- Eyes: Fundoscopic exam deferred, due for ophthalmology referral

**ASSESSMENT/PLAN:**
1. Type 2 diabetes mellitus - well controlled
   - Continue metformin 1000mg BID
   - A1c goal <7%, current 7.1%
   - Schedule ophthalmology referral
   - Continue lifestyle modifications
   - Follow up in 3 months
`;

console.log("Testing GPT matching with SOAP note that mentions:");
console.log("- 'Type 2 diabetes' (should match existing 'Dm2' problem)");
console.log("- 'Type 2 diabetes mellitus' (should match existing 'Dm2' problem)");
console.log("\nSOAP Note:");
console.log(testSoapNote);
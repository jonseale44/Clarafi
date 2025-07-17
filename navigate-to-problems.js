// Temporary script to navigate to medical problems section
console.log("Navigating to medical problems section...");
const problemsTab = document.querySelector('[data-value="problems"]');
if (problemsTab) {
  problemsTab.click();
  console.log("Clicked on medical problems tab");
} else {
  console.log("Could not find medical problems tab");
}
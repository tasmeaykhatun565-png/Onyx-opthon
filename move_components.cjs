const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DepositFlow.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "const SummaryView = ({ onClose, selectedMethod, amount, currencyCode, currencySymbol, promoInput, selectedPromo, setStep, userId, rawBalance, promoCodes }: any) => {";
const endMarker = "  const getStepIndex = () => {";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

// Extract the components block
const componentsBlock = content.substring(startIndex, endIndex);

// Remove the components block from its original location
content = content.substring(0, startIndex) + content.substring(endIndex);

// Find where to insert it (before export default function DepositFlow)
const insertMarker = "export default function DepositFlow";
const insertIndex = content.indexOf(insertMarker);

if (insertIndex === -1) {
  console.error("Insert marker not found");
  process.exit(1);
}

// Insert the components block
content = content.substring(0, insertIndex) + componentsBlock + "\n" + content.substring(insertIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully moved components");

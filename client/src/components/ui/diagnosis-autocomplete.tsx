import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosisData {
  code: string;
  description: string;
  category?: string;
}

interface DiagnosisAutocompleteProps {
  value?: string;
  onSelect: (diagnosis: DiagnosisData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Common ICD-10 codes for quick selection
const COMMON_DIAGNOSES: DiagnosisData[] = [
  { code: "Z00.00", description: "Encounter for general adult medical examination without abnormal findings", category: "Wellness" },
  { code: "Z00.01", description: "Encounter for general adult medical examination with abnormal findings", category: "Wellness" },
  { code: "K29.70", description: "Gastritis, unspecified", category: "Digestive" },
  { code: "M79.3", description: "Panniculitis, unspecified", category: "Musculoskeletal" },
  { code: "R50.9", description: "Fever, unspecified", category: "Symptoms" },
  { code: "J00", description: "Acute nasopharyngitis [common cold]", category: "Respiratory" },
  { code: "I10", description: "Essential (primary) hypertension", category: "Circulatory" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified", category: "Endocrine" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine" },
  { code: "M25.50", description: "Pain in unspecified joint", category: "Musculoskeletal" },
  { code: "R06.02", description: "Shortness of breath", category: "Symptoms" },
  { code: "R51", description: "Headache", category: "Symptoms" },
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", category: "Digestive" },
  { code: "N39.0", description: "Urinary tract infection, site not specified", category: "Genitourinary" },
  { code: "L30.9", description: "Dermatitis, unspecified", category: "Skin" }
];

export function DiagnosisAutocomplete({
  value = "",
  onSelect,
  placeholder = "Search diagnoses...",
  disabled = false,
  className = ""
}: DiagnosisAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiagnosisData[]>([]);

  // Search diagnoses based on query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchQuery) {
        setSearchResults(COMMON_DIAGNOSES.slice(0, 10));
        return;
      }

      const lowercaseQuery = searchQuery.toLowerCase();
      const results = COMMON_DIAGNOSES.filter(diag => 
        diag.code.toLowerCase().includes(lowercaseQuery) || 
        diag.description.toLowerCase().includes(lowercaseQuery) ||
        diag.category?.toLowerCase().includes(lowercaseQuery)
      );
      
      setSearchResults(results.slice(0, 15));
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelect = (diagnosis: DiagnosisData) => {
    console.log("🔍 [DiagnosisAutocomplete] Selected diagnosis:", diagnosis);
    onSelect(diagnosis);
    setOpen(false);
    setSearchQuery("");
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      "Wellness": "bg-green-100 text-green-800",
      "Digestive": "bg-orange-100 text-orange-800",
      "Respiratory": "bg-navy-blue-100 text-navy-blue-800",
      "Circulatory": "bg-red-100 text-red-800",
      "Endocrine": "bg-purple-100 text-purple-800",
      "Musculoskeletal": "bg-indigo-100 text-indigo-800",
      "Symptoms": "bg-yellow-100 text-yellow-800",
      "Genitourinary": "bg-pink-100 text-pink-800",
      "Skin": "bg-cyan-100 text-cyan-800"
    };
    return colors[category || ""] || "bg-gray-100 text-gray-800";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search by ICD-10 code or description..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex h-11"
            />
          </div>

          <CommandList className="max-h-[300px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <CommandEmpty>
                No diagnoses found for "{searchQuery}"
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {searchResults.map((diagnosis) => (
                  <CommandItem
                    key={diagnosis.code}
                    value={diagnosis.code}
                    onSelect={() => handleSelect(diagnosis)}
                    className="flex items-start justify-between py-3 px-3 hover:bg-gray-50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-medium text-sm">
                          {diagnosis.code}
                        </span>
                        {diagnosis.category && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getCategoryColor(diagnosis.category))}
                          >
                            {diagnosis.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-tight">
                        {diagnosis.description}
                      </p>
                    </div>
                    {value === diagnosis.code && (
                      <Check className="h-4 w-4 text-primary ml-2 mt-1" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
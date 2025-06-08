import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Search, DollarSign } from "lucide-react";
import { searchCPTCodes, getCPTCodeByCode, getAllCategories, type CPTCodeData } from "@/data/cpt-codes";
import { cn } from "@/lib/utils";

interface CPTAutocompleteProps {
  value?: string;
  onSelect: (cptCode: CPTCodeData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CPTAutocomplete({
  value = "",
  onSelect,
  placeholder = "Search CPT codes...",
  disabled = false,
  className = ""
}: CPTAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<CPTCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categories = ["all", ...getAllCategories()];

  // Search CPT codes based on query and category
  useEffect(() => {
    setIsLoading(true);
    
    const timeoutId = setTimeout(() => {
      let results = searchCPTCodes(searchQuery);
      
      // Filter by category if not "all"
      if (selectedCategory !== "all") {
        results = results.filter(cpt => cpt.category === selectedCategory);
      }
      
      setSearchResults(results);
      setIsLoading(false);
    }, 150); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory]);

  // Get display value
  const displayValue = value ? getCPTCodeByCode(value)?.code || value : "";

  const handleSelect = (cptCode: CPTCodeData) => {
    console.log("🔍 [CPTAutocomplete] Selected CPT code:", cptCode);
    onSelect(cptCode);
    setOpen(false);
    setSearchQuery("");
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'straightforward': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "E&M New": "bg-green-100 text-green-800",
      "E&M Established": "bg-blue-100 text-blue-800",
      "Preventive New": "bg-purple-100 text-purple-800",
      "Preventive Established": "bg-indigo-100 text-indigo-800",
      "Minor Surgery": "bg-red-100 text-red-800",
      "Injections": "bg-orange-100 text-orange-800",
      "Immunizations": "bg-cyan-100 text-cyan-800",
      "Diagnostics": "bg-teal-100 text-teal-800",
      "Dermatology": "bg-pink-100 text-pink-800",
      "Physical Therapy": "bg-lime-100 text-lime-800",
      "Laboratory": "bg-amber-100 text-amber-800",
      "Radiology": "bg-violet-100 text-violet-800",
      "Emergency": "bg-rose-100 text-rose-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-mono", className)}
          disabled={disabled}
        >
          {displayValue || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search by code, description, or category..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex h-11"
            />
          </div>
          
          {/* Category Filter */}
          <div className="border-b p-2">
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 8).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all" ? "All Categories" : category}
                </Button>
              ))}
            </div>
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching CPT codes...
              </div>
            ) : searchResults.length === 0 ? (
              <CommandEmpty>
                No CPT codes found for "{searchQuery}"
                {selectedCategory !== "all" && ` in ${selectedCategory}`}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {searchResults.map((cpt) => (
                  <CommandItem
                    key={cpt.code}
                    value={cpt.code}
                    onSelect={() => handleSelect(cpt)}
                    className="flex items-start justify-between py-3 px-3 hover:bg-gray-50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-medium text-sm">
                          {cpt.code}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getCategoryColor(cpt.category))}
                        >
                          {cpt.category}
                        </Badge>
                        {cpt.complexity && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getComplexityColor(cpt.complexity))}
                          >
                            {cpt.complexity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-tight">
                        {cpt.description}
                      </p>
                      {cpt.baseRate && (
                        <div className="flex items-center text-xs text-green-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${cpt.baseRate.toFixed(2)} Medicare rate
                        </div>
                      )}
                    </div>
                    {value === cpt.code && (
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
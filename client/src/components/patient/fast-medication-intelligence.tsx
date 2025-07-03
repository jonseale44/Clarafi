/**
 * Fast Medication Intelligence System
 * 
 * Uses unified server API for medication intelligence data:
 * 1. React Query for smart caching and data management
 * 2. Single source of truth from server medication database
 * 3. Instant bidirectional updates between sig and medication components
 * 4. Automatic loading states and error handling
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";

interface FastMedicationIntelligenceProps {
  medicationName: string;
  initialStrength?: string;
  initialForm?: string;
  initialRoute?: string;
  initialSig?: string;
  initialQuantity?: number;
  initialRefills?: number;
  initialDaysSupply?: number;
  onChange: (updates: {
    dosage?: string;
    form?: string;
    routeOfAdministration?: string;
    sig?: string;
    quantity?: number;
    refills?: number;
    daysSupply?: number;
  }) => void;
  missingFields?: {
    sig?: boolean;
    quantity?: boolean;
    refills?: boolean;
    daysSupply?: boolean;
    route?: boolean;
  };
  gptRecommendations?: {
    sig?: string;
    quantity?: number;
    refills?: number;
    daysSupply?: number;
    route?: string;
  };
}

export function FastMedicationIntelligence({
  medicationName,
  initialStrength = '',
  initialForm = '',
  initialRoute = '',
  initialSig = '',
  initialQuantity = 30,
  initialRefills = 2,
  initialDaysSupply = 90,
  onChange,
  missingFields = {},
  gptRecommendations = {}
}: FastMedicationIntelligenceProps) {
  const [strength, setStrength] = useState(initialStrength);
  const [form, setForm] = useState(initialForm);
  const [route, setRoute] = useState(initialRoute);
  const [sig, setSig] = useState(initialSig);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [refills, setRefills] = useState(initialRefills);
  const [daysSupply, setDaysSupply] = useState(initialDaysSupply);
  const [manualSigEdit, setManualSigEdit] = useState(false);

  // Sync internal state with parent when props change
  useEffect(() => {
    if (initialSig && initialSig !== sig) {
      setSig(initialSig);
      setManualSigEdit(false); // Reset manual edit flag when parent updates sig
    }
  }, [initialSig]); // Only depend on initialSig to avoid loops

  useEffect(() => {
    if (initialQuantity !== undefined && initialQuantity !== quantity) {
      setQuantity(initialQuantity);
    }
  }, [initialQuantity]); // Only depend on initialQuantity

  useEffect(() => {
    if (initialRefills !== undefined && initialRefills !== refills) {
      setRefills(initialRefills);
    }
  }, [initialRefills]); // Only depend on initialRefills

  useEffect(() => {
    if (initialDaysSupply !== undefined && initialDaysSupply !== daysSupply) {
      setDaysSupply(initialDaysSupply);
    }
  }, [initialDaysSupply]); // Only depend on initialDaysSupply

  useEffect(() => {
    if (initialRoute && initialRoute !== route) {
      setRoute(initialRoute);
    }
  }, [initialRoute]); // Only depend on initialRoute

  // Apply GPT recommendations when field is missing and recommendation exists
  useEffect(() => {
    if (missingFields?.sig && gptRecommendations?.sig && !sig) {
      console.log('🔥 [FastMedicationIntelligence] Applying GPT sig recommendation:', gptRecommendations.sig);
      setSig(gptRecommendations.sig);
      setManualSigEdit(false);
      onChange({ sig: gptRecommendations.sig });
    }
  }, [gptRecommendations?.sig, missingFields?.sig]); // Apply when GPT recommendations change

  // Get medication intelligence data from unified API
  const { data: medicationData, isLoading: medicationDataLoading } = useQuery({
    queryKey: ['medication-intelligence', medicationName],
    queryFn: async () => {
      if (!medicationName.trim()) return null;
      
      const response = await apiRequest('GET', `/api/medication-intelligence/${encodeURIComponent(medicationName.toLowerCase().trim())}`);
      if (response.status === 404) {
        console.info(`No intelligence data available for ${medicationName}:`, 'API responded with 404');
        return null;
      }
      const result = await response.json();
      
      // Extract data from standardized API response format
      const data = result.success ? result.data : null;
      console.log('🧠 [FastMedicationIntelligence] API Response:', result);
      console.log('🧠 [FastMedicationIntelligence] Extracted Data:', data);
      return data;
    },
    enabled: !!medicationName.trim(),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Auto-generate sig when components change
  useEffect(() => {
    if (!manualSigEdit && medicationData && strength && form && route) {
      const sigKey = `${strength}-${form}-${route}`;
      const autoSig = medicationData.sigTemplates?.[sigKey];
      
      if (autoSig) {
        setSig(autoSig);
        onChange({ sig: autoSig });
      }
    }
  }, [medicationData, strength, form, route, manualSigEdit, onChange]);

  // Handle individual field changes with propagation
  const handleStrengthChange = useCallback((newStrength: string) => {
    setStrength(newStrength);
    onChange({ dosage: newStrength });
  }, [onChange]);

  const handleFormChange = useCallback((newForm: string) => {
    setForm(newForm);
    
    // Auto-update route based on form
    if (medicationData?.formRoutes?.[newForm]) {
      const defaultRoute = medicationData.formRoutes[newForm][0];
      setRoute(defaultRoute);
      onChange({ form: newForm, routeOfAdministration: defaultRoute });
    } else {
      onChange({ form: newForm });
    }
  }, [medicationData, onChange]);

  const handleRouteChange = useCallback((newRoute: string) => {
    setRoute(newRoute);
    onChange({ routeOfAdministration: newRoute });
  }, [onChange]);

  const handleSigChange = useCallback((newSig: string) => {
    setSig(newSig);
    setManualSigEdit(true);
    onChange({ sig: newSig });
  }, [onChange]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    setQuantity(newQuantity);
    onChange({ quantity: newQuantity });
  }, [onChange]);

  const handleRefillsChange = useCallback((newRefills: number) => {
    setRefills(newRefills);
    onChange({ refills: newRefills });
  }, [onChange]);

  const handleDaysSupplyChange = useCallback((newDaysSupply: number) => {
    setDaysSupply(newDaysSupply);
    onChange({ daysSupply: newDaysSupply });
  }, [onChange]);

  return (
    <div className="space-y-4">
      {/* Medication Intelligence Status */}
      <div className="flex items-center gap-2">
        {medicationData && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
            <Zap className="h-4 w-4 text-green-600" />
            <div className="text-sm">
              <span className="font-medium text-green-800">{medicationData.therapeuticClass}</span>
              {medicationData.brandNames && (
                <span className="text-green-600 ml-2">
                  ({medicationData.brandNames.join(', ')})
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {medicationData.prescriptionType?.toUpperCase()}
            </Badge>
          </div>
        )}
        {medicationDataLoading && (
          <div className="flex items-center gap-2 p-2 bg-navy-blue-50 rounded-md">
            <Info className="h-4 w-4 text-navy-blue-600" />
            <span className="text-sm text-navy-blue-800">Loading medication data...</span>
          </div>
        )}
        {!medicationData && !medicationDataLoading && medicationName && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
            <Info className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-800">Manual entry mode</span>
          </div>
        )}
      </div>

      {/* Warnings */}
      {medicationData?.blackBoxWarning && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <span className="font-medium">Black Box Warning:</span> {medicationData.blackBoxWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* Medication Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strength */}
        <div className="space-y-2">
          <Label htmlFor="strength">Strength</Label>
          <Select value={strength} onValueChange={handleStrengthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select strength" />
            </SelectTrigger>
            <SelectContent>
              {medicationData?.standardStrengths?.map((str: string) => (
                <SelectItem key={str} value={str}>{str}</SelectItem>
              )) ?? (
                strength && <SelectItem value={strength}>{strength}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Form */}
        <div className="space-y-2">
          <Label htmlFor="form">Form</Label>
          <Select value={form} onValueChange={handleFormChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select form" />
            </SelectTrigger>
            <SelectContent>
              {medicationData?.availableForms?.map((formOption: string) => (
                <SelectItem key={formOption} value={formOption}>{formOption}</SelectItem>
              )) ?? (
                form && <SelectItem value={form}>{form}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Route */}
        <div className="space-y-2">
          <Label htmlFor="route">Route</Label>
          <Select value={route} onValueChange={handleRouteChange}>
            <SelectTrigger className={missingFields?.route ? "border-4 border-red-500" : gptRecommendations?.route === route ? "text-red-600" : ""}>
              <SelectValue placeholder="Select route" />
            </SelectTrigger>
            <SelectContent>
              {medicationData?.formRoutes?.[form]?.map((routeOption: string) => (
                <SelectItem key={routeOption} value={routeOption}>{routeOption}</SelectItem>
              )) ?? (
                route && <SelectItem value={route}>{route}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
            placeholder="30"
            className={missingFields?.quantity ? "border-4 border-red-500" : gptRecommendations?.quantity === quantity ? "text-red-600" : ""}
          />
        </div>

        {/* Refills */}
        <div className="space-y-2">
          <Label htmlFor="refills">Refills</Label>
          <Input
            type="number"
            value={refills}
            onChange={(e) => handleRefillsChange(parseInt(e.target.value) || 0)}
            placeholder="2"
            max="11"
            className={missingFields?.refills ? "border-4 border-red-500" : gptRecommendations?.refills === refills ? "text-red-600" : ""}
          />
        </div>

        {/* Days Supply */}
        <div className="space-y-2">
          <Label htmlFor="daysSupply">Days Supply</Label>
          <Input
            type="number"
            value={daysSupply}
            onChange={(e) => handleDaysSupplyChange(parseInt(e.target.value) || 0)}
            placeholder="90"
            className={missingFields?.daysSupply ? "border-4 border-red-500" : gptRecommendations?.daysSupply === daysSupply ? "text-red-600" : ""}
          />
        </div>
      </div>

      {/* Sig */}
      <div className="space-y-2">
        <Label htmlFor="sig">Sig (Instructions)</Label>
        <Textarea
          value={sig}
          onChange={(e) => handleSigChange(e.target.value)}
          placeholder="Enter instructions for use..."
          rows={3}
          className={missingFields?.sig ? "border-4 border-red-500" : gptRecommendations?.sig === sig ? "text-red-600" : ""}
        />
        {!manualSigEdit && medicationData && (
          <div className="flex items-center gap-2 text-sm text-navy-blue-600">
            <CheckCircle className="h-3 w-3" />
            <span>Auto-generated from medication intelligence</span>
          </div>
        )}
      </div>

      {/* Clinical Information */}
      {medicationData && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Clinical Information</h4>
          <div className="space-y-1 text-sm text-gray-700">
            <div><span className="font-medium">Indication:</span> {medicationData.indication}</div>
            {medicationData.commonDoses && (
              <div><span className="font-medium">Common Doses:</span> {medicationData.commonDoses.join(', ')}</div>
            )}
            {medicationData.maxDailyDose && (
              <div><span className="font-medium">Max Daily Dose:</span> {medicationData.maxDailyDose}</div>
            )}
            {medicationData.requiresPriorAuth && (
              <div className="text-amber-700"><span className="font-medium">⚠️ Prior Authorization Required</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
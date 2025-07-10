import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Package, Settings, Save, RefreshCw } from 'lucide-react';

interface FeatureConfig {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
  description: string;
  category: string;
}

interface TierPricing {
  monthly: number | string;
  annual: number | string;
  name: string;
  description: string;
  trialDays: number;
  minUsers?: number;
}

interface SubscriptionConfig {
  pricing: {
    tier1: TierPricing;
    tier2: TierPricing;
    tier3: TierPricing;
  };
  features: Record<string, FeatureConfig>;
}

export default function SubscriptionConfigPage() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [editedConfig, setEditedConfig] = useState<SubscriptionConfig | null>(null);

  // Fetch current configuration
  const { data: config, isLoading } = useQuery<SubscriptionConfig>({
    queryKey: ['/api/subscription/config'],
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<SubscriptionConfig>) => {
      return apiRequest('/api/subscription/config', {
        method: 'PUT',
        body: JSON.stringify(updatedConfig),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/config'] });
      toast({
        title: "Configuration Updated",
        description: "Subscription configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (config && !editedConfig) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  const handlePricingChange = (tier: 'tier1' | 'tier2' | 'tier3', field: keyof TierPricing, value: any) => {
    if (!editedConfig) return;
    
    setEditedConfig({
      ...editedConfig,
      pricing: {
        ...editedConfig.pricing,
        [tier]: {
          ...editedConfig.pricing[tier],
          [field]: field === 'monthly' || field === 'annual' ? (value === '' ? 0 : Number(value)) : value,
        },
      },
    });
  };

  const handleFeatureToggle = (feature: string, tier: 'tier1' | 'tier2' | 'tier3', enabled: boolean) => {
    if (!editedConfig) return;
    
    setEditedConfig({
      ...editedConfig,
      features: {
        ...editedConfig.features,
        [feature]: {
          ...editedConfig.features[feature],
          [tier]: enabled,
        },
      },
    });
  };

  const saveChanges = () => {
    if (!editedConfig) return;
    updateConfigMutation.mutate(editedConfig);
  };

  const resetChanges = () => {
    if (config) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(editedConfig);

  if (isLoading || !editedConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Group features by category
  const featuresByCategory = Object.entries(editedConfig.features).reduce((acc, [name, config]) => {
    const category = config.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ name, ...config });
    return acc;
  }, {} as Record<string, Array<{ name: string } & FeatureConfig>>);

  const categoryNames: Record<string, string> = {
    core: 'Core Features',
    chart: 'Chart Sections',
    ai: 'AI Features',
    integration: 'Integrations',
    admin: 'Administrative',
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Configuration</h1>
          <p className="text-muted-foreground">Manage pricing and features for each subscription tier</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={resetChanges}
            disabled={!hasChanges}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={saveChanges}
            disabled={!hasChanges || updateConfigMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-3">
            <CardDescription className="text-yellow-800 dark:text-yellow-200">
              You have unsaved changes. Remember to save before leaving this page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Tier 1 Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tier 1 - {editedConfig.pricing.tier1.name}
                  <Badge variant="secondary">Individual</Badge>
                </CardTitle>
                <CardDescription>{editedConfig.pricing.tier1.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tier1-monthly">Monthly Price ($)</Label>
                  <Input
                    id="tier1-monthly"
                    type="number"
                    value={editedConfig.pricing.tier1.monthly}
                    onChange={(e) => handlePricingChange('tier1', 'monthly', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier1-annual">Annual Price ($)</Label>
                  <Input
                    id="tier1-annual"
                    type="number"
                    value={editedConfig.pricing.tier1.annual}
                    onChange={(e) => handlePricingChange('tier1', 'annual', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier1-trial">Trial Days</Label>
                  <Input
                    id="tier1-trial"
                    type="number"
                    value={editedConfig.pricing.tier1.trialDays}
                    onChange={(e) => handlePricingChange('tier1', 'trialDays', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tier 2 Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tier 2 - {editedConfig.pricing.tier2.name}
                  <Badge variant="secondary">Practice</Badge>
                </CardTitle>
                <CardDescription>{editedConfig.pricing.tier2.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tier2-monthly">Monthly Price per User ($)</Label>
                  <Input
                    id="tier2-monthly"
                    type="number"
                    value={editedConfig.pricing.tier2.monthly}
                    onChange={(e) => handlePricingChange('tier2', 'monthly', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2-annual">Annual Price per User ($)</Label>
                  <Input
                    id="tier2-annual"
                    type="number"
                    value={editedConfig.pricing.tier2.annual}
                    onChange={(e) => handlePricingChange('tier2', 'annual', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2-trial">Trial Days</Label>
                  <Input
                    id="tier2-trial"
                    type="number"
                    value={editedConfig.pricing.tier2.trialDays}
                    onChange={(e) => handlePricingChange('tier2', 'trialDays', parseInt(e.target.value))}
                  />
                </div>
                {editedConfig.pricing.tier2.minUsers && (
                  <div className="space-y-2">
                    <Label htmlFor="tier2-min">Minimum Users</Label>
                    <Input
                      id="tier2-min"
                      type="number"
                      value={editedConfig.pricing.tier2.minUsers}
                      onChange={(e) => handlePricingChange('tier2', 'minUsers', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier 3 Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Tier 3 - {editedConfig.pricing.tier3.name}
                  <Badge variant="secondary">Enterprise</Badge>
                </CardTitle>
                <CardDescription>{editedConfig.pricing.tier3.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pricing</Label>
                  <p className="text-2xl font-bold">Custom</p>
                  <p className="text-sm text-muted-foreground">Contact sales for pricing</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier3-trial">Trial Days</Label>
                  <Input
                    id="tier3-trial"
                    type="number"
                    value={editedConfig.pricing.tier3.trialDays}
                    onChange={(e) => handlePricingChange('tier3', 'trialDays', parseInt(e.target.value))}
                  />
                </div>
                {editedConfig.pricing.tier3.minUsers && (
                  <div className="space-y-2">
                    <Label htmlFor="tier3-min">Minimum Users</Label>
                    <Input
                      id="tier3-min"
                      type="number"
                      value={editedConfig.pricing.tier3.minUsers}
                      onChange={(e) => handlePricingChange('tier3', 'minUsers', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{categoryNames[category] || category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base">{feature.name}</Label>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${feature.name}-tier1`}
                          checked={feature.tier1}
                          onCheckedChange={(checked) => handleFeatureToggle(feature.name, 'tier1', checked)}
                        />
                        <Label htmlFor={`${feature.name}-tier1`} className="text-sm">
                          Tier 1
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${feature.name}-tier2`}
                          checked={feature.tier2}
                          onCheckedChange={(checked) => handleFeatureToggle(feature.name, 'tier2', checked)}
                        />
                        <Label htmlFor={`${feature.name}-tier2`} className="text-sm">
                          Tier 2
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${feature.name}-tier3`}
                          checked={feature.tier3}
                          onCheckedChange={(checked) => handleFeatureToggle(feature.name, 'tier3', checked)}
                        />
                        <Label htmlFor={`${feature.name}-tier3`} className="text-sm">
                          Tier 3
                        </Label>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
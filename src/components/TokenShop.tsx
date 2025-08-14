'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Coins, Clock, Coffee, Zap, Moon, Star, Timer, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShopItem {
  id: string;
  item_id: string;
  title: string;
  description: string | null;
  price_tokens: number;
  category: string;
  availability_type: string;
  availability_window: string;
  cooldown_minutes: number;
  effects: any[];
  budget_check: boolean;
  sort_order: number;
}

interface ItemCooldown {
  item_id: string;
  expires_at: string;
}

export default function TokenShop() {
  const supabase = createClient();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [cooldowns, setCooldowns] = useState<ItemCooldown[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('morning');

  // Get current time of day for default tab
  const getCurrentTimeWindow = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 || hour < 5) return 'evening';
    return 'morning';
  };

  const load = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    
    const [itemsResult, walletResult, cooldownsResult] = await Promise.all([
      supabase.from('shop_items').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      userId ? supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: { balance: 0 } } as any),
      userId ? supabase.from('item_cooldowns').select('item_id, expires_at').eq('user_id', userId).gt('expires_at', new Date().toISOString()) : Promise.resolve({ data: [] } as any)
    ]);
    
    console.log('[TokenShop] Shop items query result:', itemsResult);
    console.log('[TokenShop] Wallet query result:', walletResult);
    console.log('[TokenShop] Cooldowns query result:', cooldownsResult);
    
    setItems((itemsResult.data || []) as ShopItem[]);
    setCooldowns((cooldownsResult.data || []) as ItemCooldown[]);
    if (walletResult.data?.balance != null) setBalance(walletResult.data.balance);
    
    // Set default tab based on time of day
    setActiveTab(getCurrentTimeWindow());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isItemOnCooldown = (itemId: string): Date | null => {
    const cooldown = cooldowns.find(c => c.item_id === itemId);
    return cooldown ? new Date(cooldown.expires_at) : null;
  };

  const getCooldownText = (expiresAt: Date): string => {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.ceil(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d`;
  };

  const getItemIcon = (category: string, availabilityWindow: string) => {
    if (availabilityWindow === 'morning') return <Coffee className="h-4 w-4" />;
    if (availabilityWindow === 'afternoon') return <Zap className="h-4 w-4" />;
    if (availabilityWindow === 'evening') return <Moon className="h-4 w-4" />;
    if (category === 'focus_tool') return <Timer className="h-4 w-4" />;
    if (category === 'cosmetic') return <Star className="h-4 w-4" />;
    return <Coins className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'meal_upgrade': return 'bg-orange-100 text-orange-800';
      case 'focus_tool': return 'bg-blue-100 text-blue-800';
      case 'friction_reducer': return 'bg-green-100 text-green-800';
      case 'wellness': return 'bg-purple-100 text-purple-800';
      case 'cosmetic': return 'bg-pink-100 text-pink-800';
      case 'social': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const redeem = async (item: ShopItem) => {
    setRedeeming(item.item_id);
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) return;
      
      const { data, error } = await supabase.rpc('redeem_tokens_v2', {
        p_user_id: userId,
        p_item_id: item.item_id,
        p_qty: 1,
      });
      
      if (error) throw error;
      
      const result = data[0];
      if (result.success) {
        setBalance(result.new_balance);
        toast.success(`${item.title} activated! 🎉`, {
          description: `New balance: ${result.new_balance} tokens`,
        });
        // Reload to update cooldowns
        load();
      } else {
        toast.error("Redemption Failed", {
          description: result.error_message,
        });
      }
    } catch (e) {
      console.error('[TokenShop] redeem', e);
      toast.error("Error", {
        description: "Failed to redeem item. Please try again.",
      });
    } finally {
      setRedeeming(null);
    }
  };

  const filterItemsByWindow = (window: string) => {
    if (window === 'always') {
      return items.filter(item => 
        item.availability_window === 'always' || 
        item.availability_type === 'weekly' || 
        item.availability_type === 'monthly'
      );
    }
    return items.filter(item => item.availability_window === window);
  };

  const renderItemCard = (item: ShopItem) => {
    const cooldownExpires = isItemOnCooldown(item.item_id);
    const isOnCooldown = cooldownExpires && cooldownExpires > new Date();
    const canAfford = balance >= item.price_tokens;
    const isDisabled = !canAfford || isOnCooldown || redeeming === item.item_id;

    return (
      <Card key={item.id} className={`border transition-all hover:shadow-md ${!canAfford ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getItemIcon(item.category, item.availability_window)}
              <span className="truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-700 font-semibold">{item.price_tokens}</span>
              <Coins className="h-4 w-4 text-amber-600" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="secondary" className={getCategoryColor(item.category)}>
              {item.category.replace('_', ' ')}
            </Badge>
            {item.budget_check && (
              <Badge variant="outline" className="text-xs">
                Budget Check
              </Badge>
            )}
            {item.cooldown_minutes > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {item.cooldown_minutes < 60 ? `${item.cooldown_minutes}m` : `${Math.round(item.cooldown_minutes / 60)}h`}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {item.availability_type} • {item.availability_window}
            </div>
            <div className="flex items-center gap-2">
              {isOnCooldown && cooldownExpires && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  {getCooldownText(cooldownExpires)}
                </div>
              )}
              <Button 
                size="sm" 
                onClick={() => redeem(item)} 
                disabled={isDisabled}
                variant={canAfford && !isOnCooldown ? "default" : "secondary"}
              >
                {redeeming === item.item_id ? 'Redeeming…' : 
                 isOnCooldown ? 'Cooldown' :
                 !canAfford ? 'Need More' : 'Redeem'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Token Shop</h2>
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
          <Coins className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-900">{balance} tokens</span>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading shop items...</div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="morning" className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Morning
            </TabsTrigger>
            <TabsTrigger value="afternoon" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Afternoon
            </TabsTrigger>
            <TabsTrigger value="evening" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Evening
            </TabsTrigger>
            <TabsTrigger value="always" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Always
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="morning" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterItemsByWindow('morning').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="afternoon" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterItemsByWindow('afternoon').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="evening" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterItemsByWindow('evening').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="always" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterItemsByWindow('always').map(renderItemCard)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}



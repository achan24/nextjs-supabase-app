declare module '@/components/ui/progress' {
  export const Progress: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<'div'> & {
      value?: number;
    }
  >;
}

declare module '@/components/ui/tabs' {
  import * as TabsPrimitive from "@radix-ui/react-tabs";
  
  export const Tabs: typeof TabsPrimitive.Root;
  export const TabsList: typeof TabsPrimitive.List;
  export const TabsTrigger: typeof TabsPrimitive.Trigger;
  export const TabsContent: typeof TabsPrimitive.Content;
} 
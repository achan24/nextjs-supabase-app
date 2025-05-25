declare module '@/components/ui/progress' {
  export const Progress: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<'div'> & {
      value?: number;
    }
  >;
}

declare module '@/components/ui/tabs' {
  export const Tabs: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<'div'>>;
  export const TabsList: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<'div'>>;
  export const TabsTrigger: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<'button'>>;
  export const TabsContent: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<'div'>>;
} 